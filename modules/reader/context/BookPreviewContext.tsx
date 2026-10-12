"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type {
  ChapterEntry,
  PreviewPage,
  PreviewTheme,
} from "../types/book";

import type { ViewMode } from "../types/view";

import {
  DEFAULT_PAGE_BACKGROUND,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_PAGE_WIDTH,
} from "../constants/reader";

import {
  useBookSource,
  type BookSource,
} from "../hooks/useBookSource";

import { usePageNavigation } from "../hooks/usePageNavigation";
import {
  createMediaQuery,
  createStoredValue,
  type StoredValue,
} from "../utils/storedValue";
import { useNarration } from "../hooks/useNarration";
import { useZoom } from "../hooks/useZoom";
import { useAutoplay } from "../hooks/useAutoplay";
import {
  useFindSearch,
  type SearchMatch,
} from "../hooks/useFindSearch";

const DEFAULT_NARRATION_HIGHLIGHT_COLOR = "#ffe600";
const DEFAULT_TEXT_BACKGROUND_COLOR = "#ffe600";
const DEFAULT_SEARCH_HIGHLIGHT_COLOR = "#ffeb3b";

export const DEFAULT_NARRATION_VOICE_ID = "george";

/* Reader preferences remembered across reloads. */
const narrationVoiceStore = createStoredValue(
  "bookPreview.narrationVoiceId",
  DEFAULT_NARRATION_VOICE_ID,
);
const narrationHighlightStore = createStoredValue(
  "bookPreview.narrationHighlightColor",
  DEFAULT_NARRATION_HIGHLIGHT_COLOR,
);
const textBackgroundStore = createStoredValue(
  "bookPreview.textBackgroundColor",
  DEFAULT_TEXT_BACKGROUND_COLOR,
);
const searchHighlightStore = createStoredValue(
  "bookPreview.searchHighlightColor",
  DEFAULT_SEARCH_HIGHLIGHT_COLOR,
);

/*
 * Below md the Pages panel would cover a large part of the book, and the
 * flipbook reads one page at a time instead of a two-page spread.
 */
const narrowScreenQuery = createMediaQuery("(max-width: 767px)");

function useStoredValue(store: StoredValue): string {
  return useSyncExternalStore(store.subscribe, store.read, store.readServer);
}

export interface PageHoverHandlers {
  onPointerEnter: (event: React.PointerEvent) => void;
  onPointerLeave: (event: React.PointerEvent) => void;
}

export interface BookPreviewValue {
  pages: PreviewPage[];
  chapters: ChapterEntry[];
  theme: PreviewTheme;

  parseError: string | null;
  loading: boolean;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  isPagesPanelOpen: boolean;
  /** The flipbook is showing one page at a time (narrow screens). */
  singlePageFlip: boolean;
  setPagesPanelOpen: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  currentPage: number;
  setCurrentPage: React.Dispatch<
    React.SetStateAction<number>
  >;

  totalPages: number;
  /** False once the last page is visible (in flipbook: the last spread). */
  canGoNext: boolean;

  goToPage: (
  pageNumber: number,
  options?: { sequential?: boolean }
) => void;
  goToLinkedPage: (link: string) => void;

  nextPage: () => void;
  prevPage: () => void;

  setPageFlipRef: (ref: unknown) => void;

  blockMouseFlip: boolean;
  setBlockMouseFlip: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  zoomLevel: number;

  zoomIn: () => void;
  zoomOut: () => void;

  setZoomLevel: React.Dispatch<
    React.SetStateAction<number>
  >;

  reset: () => void;

  isSpeaking: boolean;
  isPaused: boolean;
  speakingBlockId: string | null;
  speakingWordIndex: number | null;
  narrationMessage: string;
  narrationHighlightColor: string;
  textBackgroundColor: string;
  searchHighlightColor: string;
  setNarrationHighlightColor: (value: string) => void;
  setTextBackgroundColor: (value: string) => void;
  setSearchHighlightColor: (value: string) => void;
  narrationVoiceId: string;
  setNarrationVoiceId: (voiceId: string) => void;

  speak: () => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  stopSpeech: () => void;

  isAutoplaying: boolean;
  setIsAutoplaying: React.Dispatch<
  React.SetStateAction<boolean>
  >;

  toggleAutoplay: () => void;
  startAutoplay: () => void;
  stopAutoplay: () => void;
  /** Autoplay is on but held because the mouse is over a page. */
  isAutoplayHoverPaused: boolean;
  /** Spread onto a page element so hovering it holds autoplay. */
  pageHoverHandlers: PageHoverHandlers;

  searchQuery: string;
  setSearchQuery: (value: string) => void;
  clearSearch: () => void;
  searchMatches: SearchMatch[];
  searchMatchCount: number;
  searchCurrentMatchDisplay: number;
  searchActiveMatch: SearchMatch | null;
  goToNextMatch: () => void;
  goToPrevMatch: () => void;
}


const EMPTY_PAGES: PreviewPage[] = [];

const EMPTY_CHAPTERS: ChapterEntry[] = [];

const FALLBACK_THEME: PreviewTheme = {
  pageWidth: DEFAULT_PAGE_WIDTH,
  pageHeight: DEFAULT_PAGE_HEIGHT,
  background: DEFAULT_PAGE_BACKGROUND,
};


const BookPreviewContext =
  createContext<BookPreviewValue | null>(null);


export const useBookPreview = (): BookPreviewValue => {
  const value = useContext(BookPreviewContext);

  if (!value) {
    throw new Error(
      "useBookPreview must be used inside a BookPreviewProvider",
    );
  }

  return value;
};


export function useBookPreviewOptional(): BookPreviewValue | null {
  return useContext(BookPreviewContext);
}


interface ProviderProps extends BookSource {
  children: ReactNode;
}


export function BookPreviewProvider({
  json,
  jsonUrl,
  children,
}: ProviderProps) {

  const { book, loading } = useBookSource({
    json,
    jsonUrl,
  });


  const [viewMode, setViewMode] =
    useState<ViewMode>("flipbook");

  /*
   * Pages panel: open by default on wide screens, closed on phones. Once the
   * user toggles it, their choice wins regardless of screen size.
   */
  const isNarrowScreen = useSyncExternalStore(
    narrowScreenQuery.subscribe,
    narrowScreenQuery.read,
    narrowScreenQuery.readServer,
  );
  const [panelPreference, setPanelPreference] = useState<boolean | null>(null);
  const isPagesPanelOpen = panelPreference ?? !isNarrowScreen;
  const setPagesPanelOpen = useCallback(
    (value: React.SetStateAction<boolean>) => {
      setPanelPreference((previous) => {
        const current = previous ?? !isNarrowScreen;
        return typeof value === "function" ? value(current) : value;
      });
    },
    [isNarrowScreen],
  );

  const narrationHighlightColor = useStoredValue(narrationHighlightStore);
  const textBackgroundColor = useStoredValue(textBackgroundStore);
  const searchHighlightColor = useStoredValue(searchHighlightStore);
  const setNarrationHighlightColor = narrationHighlightStore.write;
  const setTextBackgroundColor = textBackgroundStore.write;
  const setSearchHighlightColor = searchHighlightStore.write;

  const pages = useMemo(
    () =>
      book.ok
        ? book.pages
        : EMPTY_PAGES,
    [book],
  );


  const chapters = useMemo(
    () =>
      book.ok
        ? book.chapters
        : EMPTY_CHAPTERS,
    [book],
  );


  const theme = useMemo(
    () =>
      book.ok
        ? book.theme
        : FALLBACK_THEME,
    [book],
  );



  /* One page at a time in the flipbook while the screen is narrow. */
  const singlePageFlip = viewMode === "flipbook" && isNarrowScreen;

  const navigation = usePageNavigation({
    pages,
    viewMode,
    singlePage: singlePageFlip,
  });

  const zoom = useZoom();

  const narrationVoiceId = useStoredValue(narrationVoiceStore);

  const narration = useNarration({
    pages,
    currentPage: navigation.currentPage,
    viewMode,
    voiceId: narrationVoiceId,
    nextPage: navigation.nextPage,
  });

  /* Stopping also drops audio already generated with the previous voice. */
  const stopNarration = narration.stop;
  const setNarrationVoiceId = useCallback(
    (voiceId: string) => {
      if (voiceId === narrationVoiceId) return;
      stopNarration();
      narrationVoiceStore.write(voiceId);
    },
    [narrationVoiceId, stopNarration],
  );

const autoplayNextPage = useCallback(() => {
  if (viewMode === "index") return;
  navigation.nextPage();
}, [viewMode, navigation]);

  /*
   * Mouse over a page holds autoplay so the reader can look at it; leaving
   * resumes. Mouse only — a touch tap shouldn't leave autoplay stuck.
   */
  const [isPageHovered, setIsPageHovered] = useState(false);
  const pageHoverHandlers = useMemo<PageHoverHandlers>(
    () => ({
      onPointerEnter: (event) => {
        if (event.pointerType === "mouse") setIsPageHovered(true);
      },
      onPointerLeave: (event) => {
        if (event.pointerType === "mouse") setIsPageHovered(false);
      },
    }),
    [],
  );

const autoplay = useAutoplay({
  currentPage: navigation.currentPage,
  totalPages: navigation.totalPages,
  nextPage: autoplayNextPage,
  blocked: viewMode === "index",
  paused: isPageHovered,
});

 const findSearch = useFindSearch({
  pages,
  goToPage: navigation.goToPage,
  currentPage: navigation.currentPage,
});

 const reset = useCallback(() => {
  autoplay.stopAutoplay();
  zoom.resetZoom();
  findSearch.clearSearch();
  /*
   * Instant jump to page 1 without sequential multi-page flips.
   * setCurrentPage(1) alone updated settledOffset (cover translateX)
   * while the Flipbook instance stayed on the old interior page —
   * that mismatch clipped the spread horizontally.
   * goToPage(1, { sequential: false }) uses __originalTurnToPage so the
   * page index and shell offset stay in sync with no animated flip chain.
   */
  navigation.goToPage(1, { sequential: false });
}, [autoplay, zoom, findSearch, navigation]);


  const changeViewMode = useCallback(
  (mode: ViewMode) => {
    autoplay.stopAutoplay();
    /* The hovered page unmounts with the old view and never fires leave. */
    setIsPageHovered(false);
    /*
     * Keep the reader's page across views: each reader opens at currentPage
     * (Flipbook via startPage, Vertical/Horizontal by scrolling on mount).
     */
    setViewMode(mode);
  },
  [autoplay],
);

const changePagesPanelOpen = useCallback(
  (value: React.SetStateAction<boolean>) => {
    autoplay.stopAutoplay();
    setPagesPanelOpen(value);
  },
  [autoplay, setPagesPanelOpen],
);

  const value = useMemo<BookPreviewValue>(
    () => ({

      pages,

      chapters,

      theme,

      parseError:
        book.ok
          ? null
          : book.reason,

      loading,

      viewMode,

      setViewMode: changeViewMode,

      isPagesPanelOpen,

      singlePageFlip,

      setPagesPanelOpen: changePagesPanelOpen,

      currentPage:
        navigation.currentPage,

      setCurrentPage:
        navigation.setCurrentPage,

      totalPages:
        navigation.totalPages,

      canGoNext:
        navigation.canGoNext,

      goToPage:
        navigation.goToPage,

      goToLinkedPage:
        navigation.goToLinkedPage,

      nextPage:
        navigation.nextPage,

      prevPage:
        navigation.prevPage,

      setPageFlipRef:
        navigation.setPageFlipRef,

      blockMouseFlip:
        navigation.blockMouseFlip,

      setBlockMouseFlip:
        navigation.setBlockMouseFlip,

      zoomLevel:
        zoom.zoomLevel,

      zoomIn:
        zoom.zoomIn,

      zoomOut:
        zoom.zoomOut,

      setZoomLevel:
        zoom.setZoomLevel,

      reset,

      isSpeaking:
        narration.isSpeaking,

      isPaused:
        narration.isPaused,

      speakingBlockId:
        narration.speakingBlockId,

      speakingWordIndex:
        narration.speakingWordIndex,

      narrationMessage:
        narration.message,

      narrationHighlightColor,

      textBackgroundColor,

      searchHighlightColor,

      setNarrationHighlightColor,

      setTextBackgroundColor,

      setSearchHighlightColor,

      narrationVoiceId,

      setNarrationVoiceId,

      speak:
        narration.speak,

      pauseSpeech:
        narration.pause,

      resumeSpeech:
        narration.resume,

      stopSpeech:
        narration.stop,

      isAutoplaying:
        autoplay.isAutoplaying,

      setIsAutoplaying:
        autoplay.setIsAutoplaying,

      toggleAutoplay:
        autoplay.toggleAutoplay,

      startAutoplay:
        autoplay.startAutoplay,

      stopAutoplay:
        autoplay.stopAutoplay,

      isAutoplayHoverPaused:
        autoplay.isAutoplaying && isPageHovered,

      pageHoverHandlers,

      searchQuery: findSearch.searchQuery,
      setSearchQuery: findSearch.setSearchQuery,
      clearSearch: findSearch.clearSearch,
      searchMatches: findSearch.matches,
      searchMatchCount: findSearch.matchCount,
      searchCurrentMatchDisplay: findSearch.currentMatchDisplay,
      searchActiveMatch: findSearch.activeMatch,
      goToNextMatch: findSearch.goToNextMatch,
      goToPrevMatch: findSearch.goToPrevMatch,
    }),

    [
      book,
      chapters,
      loading,
      autoplay,
      narration,
      navigation,
      viewMode,
      changeViewMode,
      changePagesPanelOpen,
      isPagesPanelOpen,
      singlePageFlip,
      pages,
      reset,
      theme,
      narrationHighlightColor,
      textBackgroundColor,
      searchHighlightColor,
      setNarrationHighlightColor,
      setTextBackgroundColor,
      setSearchHighlightColor,
      narrationVoiceId,
      setNarrationVoiceId,
      isPageHovered,
      pageHoverHandlers,
      zoom,
      findSearch.searchQuery,
      findSearch.setSearchQuery,
      findSearch.clearSearch,
      findSearch.matches,
      findSearch.matchCount,
      findSearch.currentMatchDisplay,
      findSearch.activeMatch,
      findSearch.goToNextMatch,
      findSearch.goToPrevMatch,
    ],
  );


  return (
    <BookPreviewContext.Provider
      value={value}
    >
      {children}
    </BookPreviewContext.Provider>
  );
}


export default BookPreviewContext;
