"use client";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import { useBook } from "../context/BookStateContext";
import BookPage from "./BookPage";
import VerticalReader from "./VerticalReader";
import HorizontalReader from "./HorizontalReader";
import IndexPage from "./IndexPage";
import type { BookPageData } from "../types/book";

interface PageFlipController {
  turnToPage?: (page: number) => void;
  flip?: (page: number) => void;
  turnPage?: (page: number) => void;
  flipNext?: () => void;
  flipPrev?: () => void;
}

interface PageFlipInstance {
  pageFlip?: (() => PageFlipController) | PageFlipController;
}

interface HTMLFlipBookProps {
  width: number;
  height: number;
  size?: "fixed" | "stretch";
  showCover?: boolean;
  usePortrait?: boolean;
  drawShadow?: boolean;
  flippingTime?: number;
  useMouseEvents?: boolean;
  disableFlipByClick?: boolean;
  mobileScrollSupport?: boolean;
  maxShadowOpacity?: number;
  startPage?: number;
  onInit?: () => void;
  onFlip?: (e: { data: number }) => void;
  onChangeState?: (e: { data: string }) => void;
  className?: string;
  children?: React.ReactNode;
}

const HTMLFlipBook = dynamic(() => import("react-pageflip"), {
  ssr: false,
}) as React.ForwardRefExoticComponent<
  HTMLFlipBookProps & React.RefAttributes<PageFlipInstance>
>;

const noopSubscribe = () => () => {};

const PRELOAD_SPREADS = 2;


const FlipSheet = React.forwardRef<
  HTMLDivElement,
  {
    page: BookPageData;
    pageIndex: number;
    spineSide: "left" | "right";
    className?: string;
    style?: React.CSSProperties;
  }
>(function FlipSheet({ page, pageIndex, spineSide, className, style }, ref) {
  const { currentPage } = useBook();
  const near = Math.abs(pageIndex + 1 - currentPage) <= PRELOAD_SPREADS * 2 + 1;

  return (
    <BookPage
      ref={ref}
      page={page}
      pageIndex={pageIndex}
      spineSide={spineSide}
      renderContent={near}
      className={className}
      style={style}
    />
  );
});

export function BookReader() {
 const {
  pages,
  viewMode,
  nextPage,
  prevPage,
  setPageFlipRef,
  currentPage,
  setCurrentPage,
  zoomLevel,
  bookWidth,
  bookHeight,
  // One sheet at a time on a narrow screen; a spread would give each page
  // half of an already small display.
  singlePage,
} = useBook();
  const bookFlipRef = useRef<PageFlipInstance | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

 
  const [scale, setScale] = useState<number | null>(null);
  const [flipReady, setFlipReady] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const mounted = useSyncExternalStore( 
    noopSubscribe,
    () => true,
    () => false,
  );

  const pageWidth = bookWidth;
  const pageHeight = bookHeight;

  const pageSignature = useMemo(
    () => (pages ?? []).map((page) => page.id).join("|"),
    [pages],
  );

  const [prevSinglePage, setPrevSinglePage] = useState(singlePage);
  const [prevViewMode, setPrevViewMode] = useState(viewMode);
  const [prevSignature, setPrevSignature] = useState(pageSignature);

  if (
    viewMode !== prevViewMode ||
    pageSignature !== prevSignature ||
    singlePage !== prevSinglePage
  ) {
    setPrevViewMode(viewMode);
    setPrevSignature(pageSignature);
    setPrevSinglePage(singlePage);

    if (viewMode === "flipbook") {
      setFlipReady(false);
      setIsFlipping(false);
    }
  }

 
  useEffect(() => {
    if (viewMode !== "flipbook") return;

    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;

  
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width <= 0 || box.height <= 0) return;

      // Portrait shows one sheet, so it is fitted against one page width.
      const across = singlePage ? pageWidth : pageWidth * 2;
      const fitted = 0.88 * Math.min(box.width / across, box.height / pageHeight);

      setScale(fitted > 0.1 ? fitted : 0.1);
    });

    observer.observe(stage);
    return () => observer.disconnect();
  }, [viewMode, pageWidth, pageHeight, pageSignature, singlePage]);

  
  const settledOffset = useMemo(() => {
    const count = pages?.length ?? 0;
    if (count === 0) return 0;
    // One sheet at a time is already centred; nudging it half a page would
    // push it off screen.
    if (singlePage) return 0;

    const half = pageWidth / 2;
    
    const pageIndex = Math.min(Math.max(currentPage - 1, 0), count - 1);
    if (pageIndex === 0) return count === 1 ? half : -half;

    const spreadStart = pageIndex % 2 === 1 ? pageIndex : pageIndex - 1;
    return spreadStart === count - 1 ? half : 0;
  }, [pages, currentPage, pageWidth, singlePage]);

  
  const offset = isFlipping ? 0 : settledOffset;

  useEffect(() => {
    if (viewMode === "flipbook" && bookFlipRef.current) {
      setPageFlipRef(bookFlipRef);
    }

    return () => {
      setPageFlipRef(null);
    };
  }, [viewMode, setPageFlipRef, pageSignature]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
    };

   
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [nextPage, prevPage]);

  
  const sheets = useMemo(
    () =>
      (pages ?? []).map((page, index) => (
        <FlipSheet
          key={page.id || index}
          page={page}
          pageIndex={index}
          spineSide={index % 2 === 0 ? "left" : "right"}
        />
      )),
    [pages],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (bookFlipRef.current) {
        setPageFlipRef(bookFlipRef);
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [setPageFlipRef]);

  if (!mounted) {
    return null;
  }

  if (pages === null) {
    return (
      <div
        id="invalid-json-fallback"
        className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto p-8 rounded-2xl kd-bg-danger-soft border kd-bd-danger shadow-xl text-center"
      >
        <div className="w-16 h-16 kd-bg-danger-soft rounded-full flex items-center justify-center mb-4 kd-fg-danger">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h3 className="text-xl font-bold kd-fg-danger mb-2 font-sans">
          Invalid Book JSON
        </h3>

        <p className="text-sm kd-fg-danger font-sans">
          The config has parsing issues or lacks slide objects. Please correct
          your formatting inside the JSON Editor panel.
        </p>
      </div>
    );
  }

  if (!pages || pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <p className="kd-fg-muted font-medium font-sans">
          No pages to display
        </p>
      </div>
    );
  }

  if (viewMode === "index") {
    return <IndexPage />;
  }

  if (viewMode === "vertical") {
    return <VerticalReader />;
  }

  if (viewMode === "horizontal") {
    return <HorizontalReader />;
  }

  return (
    <div
      ref={stageRef}
      id="flipbook-container"
      className="w-full h-full flex items-center justify-center overflow-hidden kd-bg-hover"
    >
      <div
        id="flipbook-scale-wrapper"
        style={{
          transform: `scale(${(scale ?? 1) * (zoomLevel / 100)})`,
          transformOrigin: "center center",
          transition:
            "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease-out",
          opacity: flipReady && scale !== null ? 1 : 0,
        }}
        className="flex items-center justify-center select-none animate-none"
      >
       
        <div
          id="flipbook-center-wrapper"
          style={{
            transform: `translateX(${offset}px)`,
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          className="flex items-center justify-center"
        >
        <HTMLFlipBook
         
          key={`${pageSignature}|${singlePage ? "portrait" : "spread"}`}
          ref={bookFlipRef}
          width={pageWidth}
          height={pageHeight}
          size="fixed"
          showCover={true}
          usePortrait={singlePage}
          drawShadow={true}
          flippingTime={900}
          useMouseEvents
          
          disableFlipByClick
          mobileScrollSupport={singlePage}
          maxShadowOpacity={0.4}
          startPage={0}
          onInit={() => {
            setFlipReady(true);
          }}
         
          onChangeState={(e: { data: string }) => {
            setIsFlipping(e?.data !== "read");
          }}
          onFlip={(e: { data: number }) => {
            if (e && typeof e.data === "number") {
              setCurrentPage(e.data + 1);
            }
          }}
        >
          {sheets}
        </HTMLFlipBook>
        </div>
      </div>
    </div>
  );
}

export default BookReader;