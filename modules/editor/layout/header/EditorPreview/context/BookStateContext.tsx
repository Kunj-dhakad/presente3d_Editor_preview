"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";

import { ViewMode } from "../types/book";
import type { SlideType } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { useBookDocument } from "../hooks/useBookDocument";
import { useZoom } from "../hooks/useZoom";
import { usePageNavigation } from "../hooks/usePageNavigation";
import { useTts } from "../hooks/useTts";
import { useAutoPlay } from "../hooks/useAutoPlay";
import type { BookPageData } from "../types/book";
import { useIsNarrow } from "@editor/lib/ui/useBreakpoint";

export interface BookContextValue {
  rawJson: string;
  setRawJson: (json: string) => void;

  pages: BookPageData[] | null;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;

  nextPage: () => void;
  prevPage: () => void;
  goToPage: (pageNumber: number) => void;
  setPage: (pageNumber: number) => void;
  goToLinkedPage: (linkValue: string) => void;

  totalPages: number;

  zoomLevel: number;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;

  resetBook: () => void;

  isAutoPlaying: boolean;
  toggleAutoPlay: () => void;

  scale: number;
  setPageFlipRef: (refValue: unknown) => void;

  /** One sheet on screen rather than a spread. Decided once, here. */
  singlePage: boolean;

  bookWidth: number;
  bookHeight: number;

  isSpeaking: boolean;
  isPaused: boolean;
  speakingElementId: string | null;
  speakingWordIndex: number | null;
  ttsMessage: string;

  speakCurrentPage: () => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  stopSpeech: () => void;

}

const BookStateContext = createContext<BookContextValue | null>(null);

export const useBook = (): BookContextValue => {
  const context = useContext(BookStateContext);

  if (!context) {
    throw new Error("useBook must be used within a BookStateProvider");
  }

  return context;
};

export const useBookOptional = (): BookContextValue | null => {
  return useContext(BookStateContext);
};

interface BookStateProviderProps {
  document?: SlideType[];
  jsonUrl?: string;
  children: ReactNode;
}

export const BookStateProvider = ({
  document,
  jsonUrl,
  children,
}: BookStateProviderProps) => {
  useEffect(() => {
    const ui = useEditorUIStore.getState();
    const previous = ui.imageExportMode;
    ui.setImageExportMode(true);
    return () => useEditorUIStore.getState().setImageExportMode(previous);
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>("flipbook");

  const { rawJson, setRawJson, pages, bookWidth, bookHeight } =
    useBookDocument({ document, jsonUrl });

  // The reader's layout and its page turning both depend on this, and they
  // must not disagree — so it is read once and shared.
  const singlePage = useIsNarrow();

  const nav = usePageNavigation({ pages, viewMode, bookWidth, bookHeight, singlePage });
  const zoom = useZoom();
  const tts = useTts({ pages, currentPage: nav.currentPage });

  // Destructured so the memo below can depend on the individual values; the
  // hook return objects themselves are new on every render.
  const {
    currentPage, setCurrentPage, nextPage, prevPage, goToPage, setPage,
    goToLinkedPage, totalPages, scale, setPageFlipRef,
  } = nav;
  const { zoomLevel, zoomIn, zoomOut, setZoomLevel } = zoom;

  const { isAutoPlaying, toggleAutoPlay, stopAutoPlay } = useAutoPlay({
    currentPage,
    totalPages,
    nextPage,
  });

  // A view-mode switch re-lays out the whole reader; letting a run continue
  // through it would fight the transition.
  useEffect(() => {
    stopAutoPlay();
  }, [viewMode, stopAutoPlay]);
  const {
    isSpeaking, isPaused, speakingElementId, speakingWordIndex, ttsMessage,
    speakCurrentPage, pauseSpeech, resumeSpeech, stopSpeech,
  } = tts;

  const resetBook = useCallback(() => {
    setZoomLevel(100);
    goToPage(1);
  }, [setZoomLevel, goToPage]);

  // Without this the value object was new on every provider render, so a page
  // turn, a zoom step or a spoken TTS word re-rendered every consumer — which
  // includes every mounted page of the book. That is what made flipping stall.
  const value = useMemo<BookContextValue>(
    () => ({
      rawJson,
      setRawJson,
      pages,
      viewMode,
      setViewMode,
      currentPage,
      setCurrentPage,
      nextPage,
      prevPage,
      goToPage,
      setPage,
      goToLinkedPage,
      totalPages,
      zoomLevel,
      zoomIn,
      zoomOut,
      setZoomLevel,
      resetBook,
      isAutoPlaying,
      toggleAutoPlay,
      scale,
      setPageFlipRef,
      singlePage,
      bookWidth,
      bookHeight,
      isSpeaking,
      isPaused,
      speakingElementId,
      speakingWordIndex,
      ttsMessage,
      speakCurrentPage,
      pauseSpeech,
      resumeSpeech,
      stopSpeech,
    }),
    [
      rawJson, setRawJson, pages, viewMode, currentPage, setCurrentPage,
      nextPage, prevPage, goToPage, setPage, goToLinkedPage, totalPages,
      zoomLevel, zoomIn, zoomOut, setZoomLevel, resetBook, isAutoPlaying,
      toggleAutoPlay, scale, singlePage,
      setPageFlipRef, bookWidth, bookHeight, isSpeaking, isPaused,
      speakingElementId, speakingWordIndex, ttsMessage, speakCurrentPage,
      pauseSpeech, resumeSpeech, stopSpeech,
    ],
  );

  return (
    <BookStateContext.Provider value={value}>
      {children}
    </BookStateContext.Provider>
  );
};

export default BookStateContext;
