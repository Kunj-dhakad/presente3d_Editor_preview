"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PreviewPage } from "../types/book";
import type { ViewMode } from "../types/view";

import type { TextBlock } from "../types/blocks";
import { pagesInView } from "../utils/spread";
import { apiFetch } from "@shared/apiFetch";

interface BlockRange {
  id: string;
  text: string;
  start: number;
  end: number;
  pageIndex: number;
}

interface PageNarrationContent {
  text: string;
  ranges: BlockRange[];
}

interface PreparedNarration {
  url: string;
  marks: SpeechMark[];
  ranges: BlockRange[];
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

const flattenMarks = (
  mark: SpeechMark | SpeechMark[] | null | undefined,
): SpeechMark[] => {
  if (!mark) return [];

  if (Array.isArray(mark)) {
    return mark.flatMap(flattenMarks);
  }

  const nested =
    mark.chunks ||
    mark.children ||
    mark.words ||
    mark.items ||
    [];

  return [
    ...(mark.type === "word" ? [mark] : []),
    ...flattenMarks(nested),
  ];
};

const readingOrder = (page: PreviewPage): TextBlock[] =>
  [...page.blocks]
    .filter(
      (block): block is TextBlock =>
        block.kind === "text" &&
        block.text.trim().length > 0,
    )
    .sort((a, b) =>
      Math.abs(a.y - b.y) < 15
        ? a.x - b.x
        : a.y - b.y,
    );

function getPageNarrationContent(
  pages: PreviewPage[],
  pageIndex: number,
): PageNarrationContent | null {
  const page = pages[pageIndex];
  if (!page) return null;

  let text = "";
  const ranges: BlockRange[] = [];

  readingOrder(page).forEach((block) => {
    const blockText = block.text.trim();
    if (!blockText) return;

    const start = text.length;
    text += `${blockText} `;

    ranges.push({
      id: block.id,
      text: blockText,
      start,
      end: text.length,
      pageIndex,
    });
  });

  if (!text.trim()) return null;
  return { text: text.trim(), ranges };
}

export { pagesInView };

/** Pause on a page with no readable text before narration turns past it. */
const EMPTY_PAGE_DWELL_MS = 700;

interface Args {
  pages: PreviewPage[];
  currentPage: number;
  viewMode: ViewMode;
  voiceId: string;
  nextPage: () => void;
}

export function useNarration({
  pages,
  currentPage,
  viewMode,
  voiceId,
  nextPage,
}: Args){
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speakingBlockId, setSpeakingBlockId] =
    useState<string | null>(null);
  const [speakingWordIndex, setSpeakingWordIndex] =
    useState<number | null>(null);
  const [message, setMessage] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const narrationIdRef = useRef(0);
  /** currentPage the active narration was started on. */
  const narrationPageRef = useRef<number | null>(null);
  const sequentialNarrationRef = useRef(false);
  const autoAdvanceRef = useRef(false);
  const narrationCacheRef = useRef(
    new Map<number, Promise<PreparedNarration | null>>(),
  );
  const cachedUrlRef = useRef(new Map<number, string>());
  const requestControllersRef = useRef(
    new Map<number, AbortController>(),
  );

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const animationFrameRef =
    useRef<number | null>(null);

  const PLAYBACK_RATE = 0.80;

  const cancelAnimationFrameLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(
        animationFrameRef.current,
      );

      animationFrameRef.current = null;
    }
  }, []);

  const releaseAudio = useCallback(() => {
    cancelAnimationFrameLoop();

    if (audioRef.current) {
      const audio = audioRef.current;

      audio.onplay = null;
      audio.onpause = null;
      audio.onended = null;
      audio.onerror = null;
      audio.ontimeupdate = null;

      audio.pause();
      audio.removeAttribute("src");

      try {
        audio.load();
      } catch {
    
      }

      audioRef.current = null;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(
        objectUrlRef.current,
      );

      objectUrlRef.current = null;
    }
  }, [cancelAnimationFrameLoop]);

  const clearNarrationCache = useCallback(() => {
    narrationCacheRef.current.clear();

    cachedUrlRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    cachedUrlRef.current.clear();

    requestControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    requestControllersRef.current.clear();
  }, []);

  const requestNarration = useCallback(
    (pageIndex: number, active = false) => {
      const cached = narrationCacheRef.current.get(pageIndex);
      if (cached) return cached;

      const content = getPageNarrationContent(pages, pageIndex);
      if (!content) {
        const empty = Promise.resolve(null);
        narrationCacheRef.current.set(pageIndex, empty);
        return empty;
      }

      const controller = new AbortController();
      requestControllersRef.current.set(pageIndex, controller);
      if (active) abortControllerRef.current = controller;

      const request = apiFetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content.text, voiceId }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error?.error || "Narration request failed");
          }

          const payload = (await response.json()) as {
            audioBase64: string;
            speechMarks?: SpeechMark | SpeechMark[] | null;
          };
          const binary = atob(payload.audioBase64);
          const bytes = new Uint8Array(binary.length);

          for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
          }

          const url = URL.createObjectURL(
            new Blob([bytes], { type: "audio/mpeg" }),
          );
          cachedUrlRef.current.set(pageIndex, url);

          return {
            url,
            marks: flattenMarks(payload.speechMarks),
            ranges: content.ranges,
          };
        })
        .catch((error) => {
          narrationCacheRef.current.delete(pageIndex);
          throw error;
        })
        .finally(() => {
          requestControllersRef.current.delete(pageIndex);
          if (active && abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
        });

      narrationCacheRef.current.set(pageIndex, request);
      return request;
    },
    [pages, voiceId],
  );

  const stop = useCallback(() => {
    sequentialNarrationRef.current = false;
    autoAdvanceRef.current = false;
    narrationIdRef.current += 1;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    clearNarrationCache();
    releaseAudio();

    setSpeakingBlockId(null);
    setSpeakingWordIndex(null);
    setIsSpeaking(false);
    setIsPaused(false);
  }, [clearNarrationCache, releaseAudio]);

  const pause = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();

    setIsPaused(true);
    setIsSpeaking(true);
  }, []);

  const speak = useCallback(async () => {
    sequentialNarrationRef.current = true;

    if (abortControllerRef.current) {
      return;
    }

    if (
      audioRef.current &&
      !audioRef.current.paused
    ) {
      return;
    }

    narrationIdRef.current += 1;
    narrationPageRef.current = currentPage;

    const narrationId =
      narrationIdRef.current;

    releaseAudio();

    setSpeakingBlockId(null);
    setSpeakingWordIndex(null);
    setMessage("");

    /*
     * Flipbook shows a two-page spread — narrate every visible page
     * (left, then right) before turning. Other views show one page.
     */
    const visiblePages = pagesInView(currentPage, pages.length, viewMode);
    const queue = visiblePages.map((pageNumber) => pageNumber - 1);
    const lastVisiblePage =
      visiblePages[visiblePages.length - 1] ?? currentPage;

    let nextTextPageIndex: number | null = null;
    for (
      let pageIndex = lastVisiblePage;
      pageIndex < pages.length;
      pageIndex += 1
    ) {
      if (getPageNarrationContent(pages, pageIndex)) {
        nextTextPageIndex = pageIndex;
        break;
      }
    }

    const handleFailure = (error: unknown) => {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      if (narrationId !== narrationIdRef.current) return;

      releaseAudio();
      sequentialNarrationRef.current = false;
      autoAdvanceRef.current = false;
      abortControllerRef.current = null;
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingBlockId(null);
      setSpeakingWordIndex(null);

      setMessage(
        error instanceof Error
          ? error.message
          : "Narration failed.",
      );
    };

    /* True once any visible page actually produced audio. */
    let spokeAnything = false;

    const finishVisiblePages = () => {
      setSpeakingBlockId(null);
      setSpeakingWordIndex(null);
      setIsPaused(false);
      setMessage("");
      abortControllerRef.current = null;

      const shouldAdvance =
        sequentialNarrationRef.current &&
        lastVisiblePage < pages.length &&
        nextTextPageIndex !== null;

      if (!shouldAdvance) {
        setIsSpeaking(false);
        sequentialNarrationRef.current = false;
        autoAdvanceRef.current = false;
        return;
      }

      const advance = () => {
        if (narrationId !== narrationIdRef.current) return;
        if (!sequentialNarrationRef.current) return;
        setIsSpeaking(false);
        autoAdvanceRef.current = true;
        nextPage();
      };

      if (spokeAnything) {
        advance();
        return;
      }

      /*
       * Nothing to read here (e.g. an INDEX page alone in vertical /
       * horizontal view). We arrived via nextPage() a few ms ago, and
       * nextPage() ignores calls inside its 320ms cooldown — calling it
       * immediately was silently dropped and narration stalled on this
       * page. Linger briefly (stays "speaking" so it doesn't look stopped),
       * then move on.
       */
      window.setTimeout(advance, EMPTY_PAGE_DWELL_MS);
    };

    const playAt = async (position: number): Promise<void> => {
      if (narrationId !== narrationIdRef.current) return;

      if (position >= queue.length) {
        finishVisiblePages();
        return;
      }

      const pageIndex = queue[position];

      /* Warm up whatever plays after this page. */
      const upcoming =
        position + 1 < queue.length
          ? queue[position + 1]
          : nextTextPageIndex;
      if (upcoming !== null) {
        void requestNarration(upcoming).catch(() => undefined);
      }

      setMessage("Generating voice…");
      setIsSpeaking(true);
      setIsPaused(false);

      const prepared = await requestNarration(pageIndex, true);

      if (narrationId !== narrationIdRef.current) return;

      if (!prepared) {
        await playAt(position + 1);
        return;
      }

      spokeAnything = true;
      const { url, marks, ranges } = prepared;
      narrationCacheRef.current.delete(pageIndex);
      cachedUrlRef.current.delete(pageIndex);
      objectUrlRef.current = url;

      const audio =
        new Audio(url);

      audioRef.current = audio;

      audio.preload = "auto";

      audio.playbackRate =
        PLAYBACK_RATE;

      const updateHighlight = () => {
       
        if (
          narrationId !==
          narrationIdRef.current
        ) {
          return;
        }

        const currentAudio =
          audioRef.current;

        if (!currentAudio) {
          return;
        }

        
        const speechTimeMs =
          currentAudio.currentTime * 1000;

        if (marks.length > 0) {
          let activeIndex = -1;

          for (
            let i = 0;
            i < marks.length;
            i += 1
          ) {
            const start =
              Number(
                marks[i].start_time ?? 0,
              );

            if (
              start <= speechTimeMs
            ) {
              activeIndex = i;
            } else {
              break;
            }
          }

          if (activeIndex >= 0) {
            const active =
              marks[activeIndex];

            const charIndex =
              Number(
                active.start ?? 0,
              );

            const range =
              ranges.find(
                (candidate) =>
                  charIndex >=
                    candidate.start &&
                  charIndex <
                    candidate.end,
              );

            if (range) {
              setSpeakingBlockId(
                range.id,
              );

              const localCharIndex =
                Math.max(
                  0,
                  charIndex -
                    range.start,
                );

              const beforeText =
                range.text.slice(
                  0,
                  localCharIndex,
                );

              const wordIndex =
                beforeText
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .length;

              setSpeakingWordIndex(
                wordIndex,
              );
            }
          }
        }

        if (
          !currentAudio.paused &&
          !currentAudio.ended
        ) {
          animationFrameRef.current =
            requestAnimationFrame(
              updateHighlight,
            );
        }
      };

      audio.onplay = () => {
        if (
          narrationId !==
          narrationIdRef.current
        ) {
          return;
        }

        setMessage("");
        setIsSpeaking(true);
        setIsPaused(false);

        cancelAnimationFrameLoop();

        animationFrameRef.current =
          requestAnimationFrame(
            updateHighlight,
          );
      };

      audio.onpause = () => {
        if (
          narrationId !==
          narrationIdRef.current
        ) {
          return;
        }

        cancelAnimationFrameLoop();

        if (!audio.ended) {
          setIsPaused(true);
          setIsSpeaking(true);
        }
      };

      audio.onended = () => {
        if (
          narrationId !==
          narrationIdRef.current
        ) {
          return;
        }

        cancelAnimationFrameLoop();

        setSpeakingBlockId(null);
        setSpeakingWordIndex(null);

        releaseAudio();

        abortControllerRef.current =
          null;

        /* Next visible page (right side of the spread), then turn. */
        void playAt(position + 1).catch(handleFailure);
      };

      audio.onerror = () => {
        if (
          narrationId !==
          narrationIdRef.current
        ) {
          return;
        }

        cancelAnimationFrameLoop();

        releaseAudio();

        setSpeakingBlockId(null);
        setSpeakingWordIndex(null);
        setIsSpeaking(false);
        setIsPaused(false);
        sequentialNarrationRef.current = false;
        autoAdvanceRef.current = false;

        abortControllerRef.current =
          null;

        setMessage(
          "Narration audio failed.",
        );
      };

      await audio.play();
    };

    try {
      await playAt(0);
    } catch (error) {
      handleFailure(error);
    } finally {
      if (
        narrationId ===
        narrationIdRef.current
      ) {
        abortControllerRef.current =
          null;
      }
    }
  }, [
    currentPage,
    pages,
    viewMode,
    nextPage,
    requestNarration,
    releaseAudio,
    cancelAnimationFrameLoop,
  ]);

  const resume = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio) return;

    /*
     * Paused by a page turn and now on a different page: the paused audio
     * belongs to the old page, so read the page on screen instead.
     */
    if (narrationPageRef.current !== currentPage) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      releaseAudio();
      void speak();
      return;
    }

    try {
      await audio.play();

      setIsPaused(false);
      setIsSpeaking(true);
    } catch {
      setMessage(
        "Resume failed. Please press play again.",
      );
    }
  }, [currentPage, releaseAudio, speak]);

  /* Latest speak() for the page-change effect, without re-running it. */
  const speakRef = useRef(speak);
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  /*
   * Page changed:
   * - narration turned it (autoAdvanceRef) → read the new page(s);
   * - anything else (arrows, Pages panel, drag, autoplay) while audio is
   *   loaded → just pause it; Resume decides whether to continue or restart;
   * - nothing playing (or still generating) → stop.
   * The flag is one-shot. It used to stay true after the first auto turn,
   * so manual flips were mistaken for narration turns and the old page's
   * audio kept playing.
   */
  useEffect(() => {
    if (autoAdvanceRef.current) {
      autoAdvanceRef.current = false;
      const timer = window.setTimeout(() => {
        void speakRef.current();
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const audio = audioRef.current;
    if (audio && !audio.ended) {
      audio.pause(); // onpause flips the UI to the paused state
      return;
    }

    stop();
    setMessage("");
  }, [currentPage, stop]);

  useEffect(() => {
    return () => {
      narrationIdRef.current += 1;

      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      clearNarrationCache();
      releaseAudio();
    };
  }, [clearNarrationCache, releaseAudio]);

  return {
    isSpeaking,
    isPaused,
    speakingBlockId,
    speakingWordIndex,
    message,
    speak,
    pause,
    resume,
    stop,
  };
}
