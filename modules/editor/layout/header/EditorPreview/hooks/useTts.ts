"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BookPageData } from "../types/book";

interface ElementRange {
  id: string;
  text: string;
  start: number;
  end: number;
}

interface SpeechMark {
  type?: string;
  start_time?: number;
  end_time?: number;
  start?: number;
  end?: number;
  value?: string;
  chunks?: SpeechMark[];
  children?: SpeechMark[];
  words?: SpeechMark[];
  items?: SpeechMark[];
}

interface UseTtsArgs {
  pages: BookPageData[] | null;
  currentPage: number;
}

export function useTts({ pages, currentPage }: UseTtsArgs) {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speakingElementId, setSpeakingElementId] = useState<string | null>(
    null,
  );
  const [speakingWordIndex, setSpeakingWordIndex] = useState<number | null>(
    null,
  );
  const [ttsMessage, setTtsMessage] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isGeneratingSpeechRef = useRef(false);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current = null;
    }

    setSpeakingElementId(null);
    setSpeakingWordIndex(null);
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const pauseSpeech = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();
    setIsPaused(true);
    setIsSpeaking(true);
  }, []);

  const resumeSpeech = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio) return;

    try {
      await audio.play();
      setIsPaused(false);
      setIsSpeaking(true);
    } catch (error) {
      console.error("Resume failed:", error);
      setTtsMessage("Resume failed. Please press play again.");
    }
  }, []);

  const speakCurrentPage = useCallback(async () => {
    if (isGeneratingSpeechRef.current) return;

    if (audioRef.current && !audioRef.current.paused) {
      return;
    }

    isGeneratingSpeechRef.current = true;

    try {
      stopSpeech();

      if (!pages || pages.length === 0 || !pages[currentPage - 1]) {
        setTtsMessage("No active page to read.");
        return;
      }

      const page = pages[currentPage - 1];

      const textElements =
        page.elements?.filter(
          (el) =>
            el &&
            el.data &&
            el.data.type === "text" &&
            String(el.data.text || "").trim().length > 0,
        ) || [];

      const sorted = [...textElements].sort((a, b) => {
        const ay = a.data.y || 0;
        const by = b.data.y || 0;
        const ax = a.data.x || 0;
        const bx = b.data.x || 0;

        if (Math.abs(ay - by) < 15) return ax - bx;
        return ay - by;
      });

      let fullText = "";
      const elementRanges: ElementRange[] = [];

      sorted.forEach((el) => {
        const text =
          el.data.type === "text" ? String(el.data.text || "").trim() : "";
        if (!text) return;

        const start = fullText.length;
        fullText += text + " ";
        const end = fullText.length;

        elementRanges.push({
          id: el.id,
          text,
          start,
          end,
        });
      });

      if (!fullText.trim()) {
        setTtsMessage("No text found on this page");
        return;
      }

      setTtsMessage("Generating Speechify voice...");
      setIsSpeaking(true);
      setIsPaused(false);

      const response = await fetch("/api/speechify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: fullText.trim() }),
      });


      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Speechify failed");
      }

      const data = await response.json();
      const flattenSpeechMarks = (
        mark: SpeechMark | SpeechMark[] | null | undefined,
      ): SpeechMark[] => {
        if (!mark) return [];

        if (Array.isArray(mark)) {
          return mark.flatMap(flattenSpeechMarks);
        }

        const nested =
          mark.chunks || mark.children || mark.words || mark.items || [];

        const current = mark.type === "word" ? [mark] : [];

        return [...current, ...flattenSpeechMarks(nested)];
      };

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const audioBlob = new Blob([bytes], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audio.playbackRate = 0.85;
      audioRef.current = audio;

      const marks = flattenSpeechMarks(data.speechMarks);

      audio.ontimeupdate = () => {
        if (!audioRef.current || marks.length === 0) return;

        const currentMs = audioRef.current.currentTime * 1000;

        const activeMark = marks.find((mark: SpeechMark) => {
          const startTime = Number(mark.start_time ?? 0);
          const endTime = Number(mark.end_time ?? startTime + 300);

          return currentMs >= startTime && currentMs <= endTime;
        });

        if (!activeMark) return;

        const charStart = Number(activeMark.start ?? 0);

        const activeElement = elementRanges.find((range) => {
          return charStart >= range.start && charStart <= range.end;
        });

        if (!activeElement) return;

        setSpeakingElementId(activeElement.id);

        const localCharIndex = Math.max(0, charStart - activeElement.start);
        const beforeText = activeElement.text.slice(0, localCharIndex);

        const wordIndex = beforeText.trim().split(/\s+/).filter(Boolean).length;

        setSpeakingWordIndex(wordIndex);
      };
      audio.onplay = () => {
        setTtsMessage("");
        setIsSpeaking(true);
        setIsPaused(false);
      };

      audio.onpause = () => {
        if (audioRef.current) {
          setIsPaused(true);
          setIsSpeaking(true);
        }
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;

        setSpeakingElementId(null);
        setSpeakingWordIndex(null);
        setIsSpeaking(false);
        setIsPaused(false);
        setTtsMessage("");
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;

        setSpeakingElementId(null);
        setSpeakingWordIndex(null);
        setIsSpeaking(false);
        setIsPaused(false);
        setTtsMessage("Speechify audio failed.");
      };

      await audio.play();
    } catch (error) {
      console.error("FULL SPEECHIFY ERROR =", error);

      setIsSpeaking(false);
      setIsPaused(false);
      setTtsMessage(
        error instanceof Error ? error.message : "Speechify voice failed.",
      );
    } finally {
      isGeneratingSpeechRef.current = false;
    }
  }, [pages, currentPage, stopSpeech]);

  useEffect(() => {
    stopSpeech();
    setTtsMessage("");
  }, [currentPage, stopSpeech]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  return {
    isSpeaking,
    isPaused,
    speakingElementId,
    speakingWordIndex,
    ttsMessage,
    speakCurrentPage,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
  };
}
