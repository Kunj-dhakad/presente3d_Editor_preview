"use client";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import useEditorStore, { ElementType, TextData } from "@editor/store/editorStore";
import Header from "@editor/layout/header/header";
import MainCanvas from "@editor/layout/EditorCanvas/main";
import ToolPanel from "@editor/layout/AssetsPanel/ToolPanel";
import Preview from "@editor/layout/Preview/preview";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import EditorFooter from "@editor/layout/EditorCanvas/Footer/EditorFooter";
import CanvasHeaderBar from "@editor/layout/EditorCanvas/Header/CanvasHeaderBar";
import Navbar from "@editor/layout/NavigationPanel/Navbar";
import { LayersPanel } from "@editor/layout/Preview/Layers/LayersPanel";
import { KdPreviewLayerbtn, KdPreviewPagebtn } from "@editor/lib/icon/icons";
import EditToolPanel from "@editor/layout/EditBarPanel/EditToolPanel";
import StylePasteModeOverlay from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/StylePasteModeOverlay";
import { useBreakpoint, useIsNarrow } from "@editor/lib/ui/useBreakpoint";
import {
  CANVAS_MAX_W,
  FOOTER_H,
  HEADER_H,
  MOBILE_TOOLBAR_H,
  TOOLBAR_H,
  shellMetrics,
} from "@editor/lib/ui/shellMetrics";
import BottomTabBar from "@editor/layout/MobileShell/BottomTabBar";
import PanelSheet from "@editor/layout/MobileShell/PanelSheet";
import SlideFilmstrip from "@editor/layout/MobileShell/SlideFilmstrip";


const dynamicToolbar = <P,>(
  loader: () => Promise<{ default: React.ComponentType<P> }>,
) => dynamic(loader, { ssr: false, loading: () => null });

const TextFormattingToolbar = dynamicToolbar(() => import("@editor/blocks/Text/toolbar/TextFormattingToolbar"));
const IndexFormattingToolbar = dynamicToolbar(() => import("@editor/blocks/Index/toolbar/IndexFormattingToolbar"));
const ImageEditPanel = dynamicToolbar(() => import("@editor/blocks/Image/toolbar/ImageEditPanel"));
const ButtonEditTopBar = dynamicToolbar(() => import("@editor/blocks/Button/toolbar/ButtonEditTopBar"));
const ShapeEditTopBar = dynamicToolbar(() => import("@editor/blocks/Shape/toolbar/ShapeEdit/ShapeEditTopBar"));
const VideoEditTopBar = dynamicToolbar(() => import("@editor/blocks/Video/toolbar/VideoEditTopBar"));
const SvgElementsEditPanel = dynamicToolbar(() => import("@editor/blocks/Sticker/toolbar/SvgElementsEditPanel"));
const TableToolbar = dynamicToolbar(() => import("@editor/blocks/Table/toolbar/TableToolbar"));
const ChartToolbar = dynamicToolbar(() => import("@editor/blocks/Chart/toolbar/ChartToolbar"));
const InteractionEditTopBar = dynamicToolbar(() => import("@editor/blocks/Interaction/toolbar/InteractionEditTopBar"));
const FrameEditTopBar = dynamicToolbar(() => import("@editor/blocks/Frame/toolbar/FrameEditTopBar"));
const QRCodeEditTopBar = dynamicToolbar(() => import("@editor/blocks/QRCode/toolbar/QRCodeEditTopBar"));

const EMPTY_ELEMENTS: ElementType[] = [];

const ZOOM_STEP = 5;

export default function Home() {

  const currentSlideElements =
    useEditorStore((s) => s.slides[s.activeSlide]?.elements) ?? EMPTY_ELEMENTS;
  const totalSlides = useEditorStore((s) => s.slides.length);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const selectedElementCount = selectedElementIds.length;
  const activePanelType = useEditorUIStore((s) => s.activePanelType);
  const setMainCanvasScale = useEditorUIStore((s) => s.setMainCanvasScale);
  const addSlide = useEditorStore((s) => s.addSlide);
  const setActiveSlide = useEditorStore((s) => s.setActiveSlide);
  // The canvas element, kept in state as well so the toolbars that anchor to it
  // re-render once it mounts (a ref read during render would be stale).
  const [canvasElement, setCanvasElement] = React.useState<HTMLDivElement | null>(null);
  const containerRef = useMemo<React.RefObject<HTMLDivElement | null>>(() => {
    let element: HTMLDivElement | null = null;
    return {
      get current() { return element; },
      set current(next) { element = next; setCanvasElement(next); },
    };
  }, []);
  const previewpanelOpen = useEditorUIStore((s) => s.previewpanelOpen);
  const [PreviewTab, setPreviewTab] = React.useState<"pages" | "layers">(
    "pages",
  );
  const sidebarWidth = useEditorUIStore((s) => s.sidebarWidth);
  const editOpenedFromHidden = useEditorUIStore((s) => s.editOpenedFromHidden);
  const activeRightPanel = useEditorStore((s) => s.activeRightPanel);


  const breakpoint = useBreakpoint();
  const isNarrow = useIsNarrow();
  const metrics = shellMetrics(breakpoint);

  const activeElement = useMemo(() => {
    const found = currentSlideElements.find((el) => el.id === activeElementId);
    if (selectedElementCount <= 1) return found;

    const selectedElements = currentSlideElements.filter((el) =>
      selectedElementIds.includes(el.id),
    );
    const selectedTypes = new Set(selectedElements.map((el) => el.data.type));
    return selectedTypes.size === 1 ? (found ?? selectedElements[0]) : null;
  }, [
    currentSlideElements,
    selectedElementIds,
    selectedElementCount,
    activeElementId,
  ]);
  const jumpToSlide = useCallback(
    (i: number) => {
      setActiveSlide(i);
      const container = containerRef.current;
      if (!container) return;
      const allSlides = container.querySelectorAll(".kd-slide-scroll");
      const targetSlide = allSlides[i] as HTMLElement;

      if (targetSlide) {
        const containerTop = container.getBoundingClientRect().top;
        const slideTop = targetSlide.getBoundingClientRect().top;
        const scrollOffset = container.scrollTop + (slideTop - containerTop);
        container.scrollTo({ top: scrollOffset, behavior: "smooth" });
      }
    },
    [setActiveSlide],
  );




  const fittedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (fittedForRef.current === breakpoint) return;
    const el = containerRef.current;
    const page = useEditorStore.getState().slides[0];
    if (!el || !page?.width || !page?.height) return;

    const box = el.getBoundingClientRect();
    
    if (box.width < 120 || box.height < 120) return;

    // Show the whole page, as large as it will go: fit both sides and keep only a
    // thin margin. Fitting the width alone cropped tall pages; the old 0.9 margin
    // left the page floating in empty canvas.
    const fit = Math.min(1, Math.min(box.width / page.width, box.height / page.height) * 0.96);
    if (!Number.isFinite(fit) || fit <= 0) return;

    const snapped = Math.round((fit * 100) / ZOOM_STEP) * ZOOM_STEP;

    fittedForRef.current = breakpoint;
    setMainCanvasScale(Math.min(2, Math.max(0.2, snapped / 100)));
  }, [setMainCanvasScale, breakpoint]);



  
  const elementToolbar = (
    <>
      {!activeElement && <CanvasHeaderBar />}
      {activeElement?.data?.type === "text" &&
        ((activeElement.data as TextData).bookRole === "index" ? (
          <IndexFormattingToolbar />
        ) : (
          <TextFormattingToolbar />
        ))}
      {activeElement?.data?.type === "image" && (
        <ImageEditPanel target={canvasElement} />
      )}
      {activeElement?.data?.type === "button" && (
        <ButtonEditTopBar target={canvasElement} />
      )}
      {activeElement?.data?.type === "interaction" && <InteractionEditTopBar />}
      {activeElement?.data?.type === "shape" && (
        <ShapeEditTopBar target={canvasElement} />
      )}
      {activeElement?.data?.type === "svg" && (
        <SvgElementsEditPanel target={canvasElement} />
      )}
      {activeElement?.data?.type === "video" && (
        <VideoEditTopBar target={canvasElement} />
      )}
      {activeElement?.data?.type === "table" && <TableToolbar />}
      {activeElement?.data?.type === "chart" && <ChartToolbar />}
      {activeElement?.data?.type === "frame" && <FrameEditTopBar />}
      {activeElement?.data?.type === "qr-code" && <QRCodeEditTopBar />}
    </>
  );

  const railTabs = (
    <div className="flex items-center kd-preview-section-tap-btn-container justify-center mx-2 mt-2 overflow-hidden">
      <button
        onClick={() => setPreviewTab("pages")}
        className={`flex items-center justify-center gap-0.5 w-full h-full cursor-pointer transition-all duration-300 font-medium text-xs ${
          PreviewTab === "pages"
            ? "kd-preview-section-tab-btn-active"
            : "kd-preview-section-tab-btn"
        }`}
      >
        <KdPreviewPagebtn />
        <span className="truncate">Pages</span>
      </button>
      <button
        onClick={() => setPreviewTab("layers")}
        className={`flex items-center justify-center gap-0.5 w-full h-full cursor-pointer transition-all duration-300 font-medium text-xs ${
          PreviewTab === "layers"
            ? "kd-preview-section-tab-btn-active"
            : "kd-preview-section-tab-btn"
        }`}
      >
        <KdPreviewLayerbtn />
        <span className="truncate">Layers</span>
      </button>
    </div>
  );

  /* ==================== NARROW SHELL ==================== */

  if (isNarrow) {
    return (
      <div className="w-full h-dvh overflow-hidden flex flex-col">
        <StylePasteModeOverlay />

        <div className="w-full shrink-0" style={{ height: HEADER_H }}>
          <Header />
        </div>

        <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex items-center justify-center">
          <MainCanvas containerRef={containerRef} />
        </div>

      
        <div
          className="shrink-0 flex items-center overflow-x-auto overflow-y-hidden kd-mobile-toolstrip"
          style={{ height: MOBILE_TOOLBAR_H }}
        >
          {elementToolbar}
        </div>

        <SlideFilmstrip onJumpToSlide={jumpToSlide} />

        <div className="shrink-0" style={{ height: FOOTER_H }}>
          <EditorFooter
            compact
            totalSlides={totalSlides}
            currentSlide={activeSlide + 1}
          />
        </div>

        <BottomTabBar />

        <PanelSheet />
      </div>
    );     
  }

  /* ==================== WIDE SHELL ==================== */
  return (
    <div className="w-full h-screen overflow-hidden flex flex-col">
      <StylePasteModeOverlay />

      {/* Top Header */}
      <div className="w-full shrink-0" style={{ height: HEADER_H }}>
        <Header />
      </div>

      {/* Main Layout */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <div className="shrink-0 h-full" style={{ width: metrics.navW }}>
          <Navbar />
        </div>

        {/* Tool Panel */}
        <div
          className="transition-all duration-300 h-full shrink-0 overflow-visible"
          style={{
            width:
              sidebarWidth === "closed" ||
              (activePanelType === "edit" && editOpenedFromHidden)
                ? 0
                : metrics.panelW,
          }}
        >
          {activePanelType === "main" && <ToolPanel />}
          {activePanelType === "edit" && !editOpenedFromHidden && (
            <EditToolPanel key={activeRightPanel} />
          )}
        </div>

        {activePanelType === "edit" && editOpenedFromHidden && (
          <aside
            className="absolute top-0 bottom-0 z-40 border-r kd-bd-subtle kd-bg-surface shadow-xl"
            style={{ left: metrics.navW, width: metrics.panelW }}
          >
            <EditToolPanel key={activeRightPanel} />
          </aside>
        )}

       
        <div
          className="flex flex-col flex-1 min-w-0 min-h-0 transition-all duration-300"
          style={{
            paddingLeft:
              activePanelType === "edit" && editOpenedFromHidden
                ? metrics.panelW
                : 0,
          }}
        >
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <div
                className="shrink-0 flex items-center justify-center" 
                style={{ height: TOOLBAR_H }}
              >
                {elementToolbar}
              </div>

              <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex items-center justify-center">
                <div
                  className="h-full min-h-0 min-w-0 w-full flex items-center justify-center"
                  style={{ maxWidth: CANVAS_MAX_W }}
                >
                  <MainCanvas containerRef={containerRef} />
                </div>
              </div>
            </div>

            {previewpanelOpen && metrics.railW > 0 && (
              <div
                className="shrink-0 kd-preview-section-container h-full flex flex-col"
                style={{ width: metrics.railW }}
              >
                {railTabs}
                <div className="flex flex-col items-center mt-2 gap-1 flex-1 min-h-0 overflow-hidden w-full">
                  {PreviewTab === "pages" && (
                    <Preview
                      activeSlide={activeSlide}
                      addSlide={addSlide}
                      jumpToSlide={jumpToSlide}
                    />
                  )}
                  {PreviewTab === "layers" && <LayersPanel />}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="shrink-0" style={{ height: FOOTER_H }}>
            <EditorFooter
              totalSlides={totalSlides}
              currentSlide={activeSlide + 1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
