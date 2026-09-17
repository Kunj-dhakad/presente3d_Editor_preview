"use client";
import { create } from "zustand";

type EditorUIStore = {

  imageExportMode: boolean;
  setImageExportMode: (v: boolean) => void;

  slideUpdateAi: boolean;
  setSlideUpdateAi: (v: boolean) => void;

  SiteBarCollapsed: boolean;
  setSiteBarCollapsed: (v: boolean) => void;

  activeTextRef: HTMLElement | null;
  setActiveTextRef: (el: HTMLElement | null) => void;

  MainCanvasScale: number;
  setMainCanvasScale: (v: number) => void;

  previewpanelOpen: boolean;
  setPreviewPanelOpen: (v: boolean) => void;

  pendingTextColor: string | null;
  setPendingTextColor: (color: string | null) => void;

  savedTextRange: Range | null;
  setSavedTextRange: (range: Range | null) => void;



  activePanelType: "main" | "edit" | null;
  setActivePanelType: (v: "main" | "edit" | null) => void;
  editOpenedFromHidden: boolean;

  lastMainPanel: string | null;
  setLastMainPanel: (v: string | null) => void;

  /** Keeps the nested Elements library alive while an element editor replaces it. */
  activeElementsCategory: string | null;
  setActiveElementsCategory: (v: string | null) => void;


  /** Which table cells are selected, for merge/split. Lives in UI state so the
   *  top toolbar can read it; deliberately outside undo history. */
  tableCellSelection: {
    elementId: string;
    anchor: { row: number; column: number };
    focus: { row: number; column: number };
  } | null;
  setTableCellSelection: (v: EditorUIStore["tableCellSelection"]) => void;

  cropElementId: string | null;
  setCropElementId: (id: string | null) => void;

  /** The frame whose image is being panned/zoomed inside its mask. */
  frameEditElementId: string | null;
  setFrameEditElementId: (id: string | null) => void;

  bgRemovingElementId: string | null;
  setBgRemovingElementId: (id: string | null) => void;

  sidebarWidth: "main" | "edit" | "closed";
  setSidebarWidth: (v: "main" | "edit" | "closed") => void;

  // Copy Style Mode state
  isCopyStyleMode: boolean;
  setIsCopyStyleMode: (v: boolean) => void;

  copiedStyleSourceType: string | null;
  setCopiedStyleSourceType: (type: string | null) => void;

  stylePasteSourceSlide: number | null;
  setStylePasteSourceSlide: (index: number | null) => void;

};

const useEditorUIStore = create<EditorUIStore>((set, get) => ({
  pendingTextColor: null,
  setPendingTextColor: (color) => set({ pendingTextColor: color }),

  savedTextRange: null,
  setSavedTextRange: (range) => set({ savedTextRange: range }),

  previewpanelOpen: true,
  setPreviewPanelOpen: (v) => set({ previewpanelOpen: v }),

  MainCanvasScale: 1,
  setMainCanvasScale: (v) => set({ MainCanvasScale: v }),

  imageExportMode: false,
  setImageExportMode: (v) => set({ imageExportMode: v }),

  slideUpdateAi: false,
  setSlideUpdateAi: (v) => set({ slideUpdateAi: v }),

  // The editor opens on the Text panel rather than an empty sidebar, so these
  // four match what clicking "Text" in the nav rail would have set. They move
  // together: a collapsed rail here would make the first element selection
  // open its editor as a floating overlay over an already-open sidebar.
  SiteBarCollapsed: false,
  setSiteBarCollapsed: (v) => set({ SiteBarCollapsed: v }),

  activeTextRef: null,
  setActiveTextRef: (el) => set({ activeTextRef: el }),

  // NEW
  activePanelType: "main",
  editOpenedFromHidden: false,
  setActivePanelType: (v) => set({
    activePanelType: v,
    editOpenedFromHidden: v === "edit" ? get().SiteBarCollapsed : false,
  }),

  // Closing an element's editor before any panel was picked by hand lands back
  // on Text, not on nothing.
  lastMainPanel: "text",
  setLastMainPanel: (v) => set({ lastMainPanel: v }),

  activeElementsCategory: null,
  setActiveElementsCategory: (v) => set({ activeElementsCategory: v }),

  tableCellSelection: null,
  setTableCellSelection: (v) => set({ tableCellSelection: v }),

  // body:
  cropElementId: null,
  setCropElementId: (id) => set({ cropElementId: id }),

  frameEditElementId: null,
  setFrameEditElementId: (id) => set({ frameEditElementId: id }),

  bgRemovingElementId: null,
  setBgRemovingElementId: (id) => set({ bgRemovingElementId: id }),

  sidebarWidth: "main",
  setSidebarWidth: (v) => set({ sidebarWidth: v }),

  // Copy Style Mode
  isCopyStyleMode: false,
  setIsCopyStyleMode: (v) => set({ isCopyStyleMode: v }),

  copiedStyleSourceType: null,
  setCopiedStyleSourceType: (type) => set({ copiedStyleSourceType: type }),

  stylePasteSourceSlide: null,
  setStylePasteSourceSlide: (index) => set({ stylePasteSourceSlide: index }),

}));

export default useEditorUIStore;
