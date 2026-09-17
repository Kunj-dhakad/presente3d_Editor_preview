import React, { CSSProperties, forwardRef } from "react";
import dynamic from "next/dynamic";
import { ElementData } from "@editor/store/editorStore";
import { BookPageData } from "../types/book";
import RenderButton from "@editor/blocks/Button/renderer/RenderButton";
import RenderImage from "@editor/blocks/Image/renderer/RenderImage";
import RenderShape from "@editor/blocks/Shape/renderer/RenderShape";
import RenderSvgElements from "@editor/blocks/Sticker/renderer/RenderSvgElements";
import RenderText from "@editor/blocks/Text/renderer/RenderText";
import RenderVideo from "@editor/blocks/Video/renderer/RenderVideo";
import RenderWatermark from "@editor/blocks/Watermark/renderer/RenderWatermark";
import RenderTable from "@editor/blocks/Table/renderer/RenderTable";
// Keeps recharts out of the reader's initial chunk as well.
const RenderChart = dynamic(
  () => import("@editor/blocks/Chart/renderer/RenderChart"),
  { ssr: false, loading: () => null },
);
import PreviewBookIndex from "./PreviewBookIndex";
import RenderInteraction from "@editor/blocks/Interaction/renderer/RenderInteraction";
import RenderFrame from "@editor/blocks/Frame/renderer/RenderFrame";
import RenderQRCode from "@editor/blocks/QRCode/renderer/RenderQRCode";

interface BookPageProps {
  page: BookPageData;
  pageIndex?: number;
  style?: CSSProperties;
  className?: string;
  /** Which edge of this sheet meets the spine. Flipbook view only. */
  spineSide?: "left" | "right";
  /**
   * Draw the page's elements. The flipbook has to mount every sheet, but a
   * sheet the reader is nowhere near does not need its charts, videos and
   * interactions built — the empty sheet holds the exact same box.
   */
  renderContent?: boolean;
}

const BookPage = forwardRef<HTMLDivElement, BookPageProps>(function BookPage(
  { page, pageIndex = 0, style, className, spineSide, renderContent = true },
  ref,
) {
  const width = page.width ?? 350;
  const height = page.height ?? 434;
  const clipBounds = { x: 0, y: 0, width, height };

  return (
    <div
      ref={ref}
      className={`relative shrink-0 overflow-hidden shadow-md ${className ?? ""}`}
      style={{ width, height, ...style }}
    >
      {/* Page ka background alag layer par hai, sheet par nahi.
          Do wajah:
          1. Flipbook me react-pageflip is div ka inline style khud
             set karta hai, to yahan diya hua background ud jata tha —
             page hamesha class ka rang dikhata tha, user ka nahi.
          2. Theme class (kd-bg-surface) yahan lagti thi, jisse dark
             mode me kora page kaala ho jata tha. Page user ka content
             hai, isliye fallback literal white hi rehna chahiye. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: page.background || "#ffffff" }}
      />

      {renderContent && (
      <div className="pointer-events-none absolute inset-0">
        {page.elements.map((element) => {
          const data = element.data as ElementData;
          if (data.type === "text" && data.bookRole === "index")
            return (
              <div
                key={element.id}
                className="pointer-events-auto absolute"
                style={{
                  left: data.x,
                  top: data.y,
                  width: data.width,
                  height: data.height,
                  transform: `rotate(${data.rotation ?? 0}deg)`,
                  transformOrigin: "center",
                }}
              >
                <PreviewBookIndex data={data} />
              </div>
            );
          if (data.type === "text")
            return (
              <RenderText
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
                // The reader is a viewer: these renderers auto-measure
                // themselves, and without this they wrote those measurements
                // back into the user's slides, so closing the preview left the
                // canvas with sizes measured inside the reader's layout.
                readOnly
              />
            );
          if (data.type === "image")
            return (
              <RenderImage
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
              />
            );
          if (data.type === "video")
            return (
              <RenderVideo
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
              />
            );
          if (data.type === "button")
            return (
              <RenderButton
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
              />
            );
          if (data.type === "frame")
            return (
              <RenderFrame
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
              />
            );
          if (data.type === "qr-code")
            return (
              <RenderQRCode
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
              />
            );
          if (data.type === "interaction")
            return (
              <RenderInteraction
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
              />
            );

          if (data.type === "shape")
            return (
              <RenderShape
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
              />
            );
          if (data.type === "svg")
            return (
              <RenderSvgElements
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
              />
            );
          if (data.type === "watermark")
            return (
              <RenderWatermark
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
              />
            );
          if (data.type === "table")
            return (
              <RenderTable
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
                readOnly
              />
            );
          if (data.type === "chart")
            return (
              <RenderChart
                key={element.id}
                id={element.id}
                data={data}
                slideIndex={pageIndex}
                clipBounds={clipBounds}
              />
            );
          return null;
        })}
      </div>
      )}

      {/* The gutter: paper curving into the binding is what makes two sheets
          read as one open book rather than two cards side by side. */}
      {spineSide && (
        <div className={`kd-book-spine kd-book-spine-${spineSide}`} aria-hidden />
      )}
    </div>
  );
});

BookPage.displayName = "BookPage";

/**
 * Every page of the book is mounted at once (the flipbook needs real sheets),
 * so without this a page turn re-rendered the whole document — all pages, all
 * renderers — mid-animation. The page objects come from a snapshot taken when
 * the reader opened, so their identity is stable and this comparison holds.
 */
export default React.memo(BookPage, (prev, next) =>
  prev.page === next.page &&
  prev.pageIndex === next.pageIndex &&
  prev.className === next.className &&
  prev.style === next.style &&
  prev.spineSide === next.spineSide &&
  prev.renderContent === next.renderContent,
);
