"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pause, Play, Search } from "lucide-react";
import { useBookPreview } from "../context/BookPreviewContext";
import type { NarrationVoice } from "../types/voice";

type GenderFilter = "all" | "female" | "male";

const FILTERS: Array<{ value: GenderFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

/* Shared across popup opens so the list is fetched once per page load. */
let voicesRequest: Promise<NarrationVoice[]> | null = null;

function loadVoices(): Promise<NarrationVoice[]> {
  if (!voicesRequest) {
    voicesRequest = fetch("/api/tts/voices")
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          voices?: NarrationVoice[];
          error?: string;
        } | null;
        if (!response.ok || !payload?.voices) {
          throw new Error(payload?.error || "Could not load voices");
        }
        return payload.voices;
      })
      .catch((error) => {
        voicesRequest = null; // allow retry on next open
        throw error;
      });
  }
  return voicesRequest;
}

function formatLocale(locale: string): string {
  if (!locale) return "";
  try {
    const region = locale.split("-")[1];
    if (!region) return locale;
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(region) ?? locale
    );
  } catch {
    return locale;
  }
}

const GENDER_STYLES: Record<NarrationVoice["gender"], string> = {
  female: "bg-pink-50 text-pink-600",
  male: "bg-(--kd-brand-50) text-(--kd-accent)",
  other: "bg-slate-100 text-slate-500",
};

const GENDER_LABEL: Record<NarrationVoice["gender"], string> = {
  female: "Female",
  male: "Male",
  other: "Neutral",
};

function VoiceAvatar({
  voice,
  size,
}: {
  voice: NarrationVoice;
  size: "sm" | "lg";
}) {
  const dimension = size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";

  if (voice.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={voice.avatarUrl}
        alt=""
        className={`${dimension} shrink-0 rounded-full object-cover ring-1 ring-slate-200`}
      />
    );
  }

  return (
    <span
      className={`${dimension} flex shrink-0 items-center justify-center rounded-full font-semibold ${GENDER_STYLES[voice.gender]}`}
    >
      {voice.name.charAt(0).toUpperCase()}
    </span>
  );
}

function PreviewButton({
  voice,
  isPreviewing,
  onToggle,
}: {
  voice: NarrationVoice;
  isPreviewing: boolean;
  onToggle: (voice: NarrationVoice) => void;
}) {
  if (!voice.previewUrl) return null;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle(voice);
      }}
      aria-label={
        isPreviewing ? `Stop ${voice.name} preview` : `Preview ${voice.name}`
      }
      title={isPreviewing ? "Stop sample" : "Play sample"}
      className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
        isPreviewing
          ? "border-(--kd-accent) bg-(--kd-accent) text-white"
          : "border-slate-200 bg-white text-slate-500 hover:border-(--kd-brand-300) hover:text-(--kd-accent)"
      }`}
    >
      {isPreviewing ? (
        <Pause className="h-3 w-3" />
      ) : (
        <Play className="ml-0.5 h-3 w-3" />
      )}
    </button>
  );
}

export default function VoicePicker() {
  const { narrationVoiceId, setNarrationVoiceId } = useBookPreview();

  const [voices, setVoices] = useState<NarrationVoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<GenderFilter>("all");
  const [query, setQuery] = useState("");
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadVoices()
      .then((list) => {
        if (!cancelled) setVoices(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load voices");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
    };
  }, []);

  const counts = useMemo(() => {
    const list = voices ?? [];
    return {
      all: list.length,
      female: list.filter((v) => v.gender === "female").length,
      male: list.filter((v) => v.gender === "male").length,
    };
  }, [voices]);

  const filtered = useMemo(() => {
    if (!voices) return [];
    const q = query.trim().toLowerCase();
    return voices.filter(
      (voice) =>
        (filter === "all" || voice.gender === filter) &&
        (!q ||
          voice.name.toLowerCase().includes(q) ||
          formatLocale(voice.locale).toLowerCase().includes(q)),
    );
  }, [voices, filter, query]);

  const selectedVoice = voices?.find((voice) => voice.id === narrationVoiceId);

  const togglePreview = (voice: NarrationVoice) => {
    previewAudioRef.current?.pause();

    if (previewingId === voice.id || !voice.previewUrl) {
      previewAudioRef.current = null;
      setPreviewingId(null);
      return;
    }

    const audio = new Audio(voice.previewUrl);
    previewAudioRef.current = audio;
    audio.onended = () => setPreviewingId(null);
    audio.onerror = () => setPreviewingId(null);
    setPreviewingId(voice.id);
    audio.play().catch(() => setPreviewingId(null));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Current voice */}
      <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-(--kd-brand-100) bg-linear-to-br from-(--kd-brand-50) to-white p-3.5 shadow-xs">
        {selectedVoice ? (
          <>
            <VoiceAvatar voice={selectedVoice} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-(--kd-accent)">
                Current voice
              </div>
              <div className="truncate text-sm font-semibold text-slate-900">
                {selectedVoice.name}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {[GENDER_LABEL[selectedVoice.gender], formatLocale(selectedVoice.locale)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <PreviewButton
              voice={selectedVoice}
              isPreviewing={previewingId === selectedVoice.id}
              onToggle={togglePreview}
            />
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-(--kd-accent)">
              Current voice
            </div>
            <div className="truncate text-sm font-semibold capitalize text-slate-900">
              {narrationVoiceId}
            </div>
          </div>
        )}
      </div>

      {/* Gender filter */}
      <div className="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-slate-200/60 p-1">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
              filter === value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
            {voices && (
              <span
                className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                  filter === value
                    ? "bg-(--kd-brand-100) text-(--kd-accent-hover)"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {counts[value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition-colors focus-within:border-(--kd-brand-400) focus-within:ring-2 focus-within:ring-(--kd-brand-100)">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or accent"
          aria-label="Search voices"
          className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Voice list */}
      <div
        role="listbox"
        aria-label="Narration voices"
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-1.5 scrollbar-thin"
      >
        {error ? (
          <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-600">
            {error}
          </p>
        ) : !voices ? (
          Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded-xl p-2"
            >
              <span className="h-8 w-8 rounded-full bg-slate-100" />
              <span className="flex-1 space-y-1.5">
                <span className="block h-2.5 w-24 rounded bg-slate-100" />
                <span className="block h-2 w-16 rounded bg-slate-100" />
              </span>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-500">
            No voices match your search.
          </p>
        ) : (
          filtered.map((voice) => {
            const isSelected = voice.id === narrationVoiceId;

            return (
              <div
                key={voice.id}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => setNarrationVoiceId(voice.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setNarrationVoiceId(voice.id);
                  }
                }}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-2.5 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--kd-brand-200) ${
                  isSelected
                    ? "border-(--kd-brand-200) bg-(--kd-brand-50)/70"
                    : "border-transparent hover:bg-slate-50"
                }`}
              >
                <VoiceAvatar voice={voice} size="sm" />

                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[13px] font-medium ${
                      isSelected ? "text-(--kd-accent-hover)" : "text-slate-800"
                    }`}
                  >
                    {voice.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`rounded px-1.5 py-px text-[10px] font-medium ${GENDER_STYLES[voice.gender]}`}
                    >
                      {GENDER_LABEL[voice.gender]}
                    </span>
                    <span className="truncate text-[11px] text-slate-500">
                      {formatLocale(voice.locale)}
                    </span>
                  </div>
                </div>

                <PreviewButton
                  voice={voice}
                  isPreviewing={previewingId === voice.id}
                  onToggle={togglePreview}
                />

                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    isSelected
                      ? "border-(--kd-accent) bg-(--kd-accent) text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
