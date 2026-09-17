// "use client";
// import React, { useMemo } from "react";
// import Image from "next/image";
// import {
//   SlideType,
//   ElementType,
//   TextData,
//   ImageData,
//   ButtonData,
//   SVGData,
//   VideoData,
//   ShapeData,
// } from "@editor/store/editorStore";

// const SCALE = 0.2;

// const TextElement = React.memo(({ data }: { data: TextData }) => (
//   <div
//     style={{
//       position: "absolute",
//       left: data.x + 4,
//       top: data.y + 4,
//       width: data.width - 8,
//       height: data.height,
//       color: data.color,
//       fontSize: data.fontSize,
//       fontFamily: data.fontFamily,
//       whiteSpace: "pre-wrap",
//       lineHeight: data.lineHeight,
//       letterSpacing: data.letterSpacing,
//       fontWeight: data.fontWeight,
//       textAlign: data.align,
//       textTransform: data.textTransform || "none",
//       contain: "strict",
//     }}
//     dangerouslySetInnerHTML={{ __html: data.html || data.text }}
//   />
// ));
// TextElement.displayName = "TextElement";

// // eslint-disable-next-line react/display-name
// const ButtonElement = React.memo(({ data }: { data: ButtonData }) => {
//   const hasGradient = data.gradientFrom && data.gradientTo;
//   const dir =
//     data.gradientDirection === "vertical"
//       ? "to bottom"
//       : data.gradientDirection === "horizontal"
//         ? "to right"
//         : "135deg";

//   return (
//     <div
//       style={{
//         position: "absolute",
//         left: data.x,
//         top: data.y,
//         width: data.width,
//         height: data.height,
//         fontSize: data.fontSize,
//         fontFamily: data.fontFamily,
//         fontWeight: data.fontWeight,
//         borderRadius: data.borderRadius,
//         color: data.textColor,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         gap: 4,
//         border:
//           data.borderWidth && data.borderWidth > 0
//             ? `${data.borderWidth}px solid ${data.borderColor ?? "transparent"}`
//             : "none",
//         background: hasGradient
//           ? `linear-gradient(${dir}, ${data.gradientFrom}, ${data.gradientTo})`
//           : data.backgroundColor || "transparent",
//         padding: "0 16px",
//         boxSizing: "border-box",
//         whiteSpace: "nowrap",
//         overflow: "hidden",
//         contain: "strict",
//       }}
//     >
//       {data.icon && data.iconPosition === "left" && <span>{data.icon}</span>}
//       <span>{data.text}</span>
//       {data.icon && data.iconPosition !== "left" && <span>{data.icon}</span>}
//     </div>
//   );
// });

// const ImageElement = React.memo(({ data }: { data: ImageData }) => (
//   <Image
//     src={data.src}
//     width={500}
//     height={500}
//     alt=""
//     draggable={false}
//     loading="lazy"
//     unoptimized
//     onError={(e) => {
//       const t = e.currentTarget as HTMLImageElement;
//       t.onerror = null;
//       t.src = `data:image/svg+xml;base64,${btoa(
//         `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='100%' height='100%' fill='#1e1e2c'/></svg>`,
//       )}`;
//     }}
//     style={{
//       position: "absolute",
//       left: data.x,
//       top: data.y,
//       transform: `rotate(${data.rotation ?? 0}deg)`,
//       opacity: `${data.opacity ?? 100 / 100}`,
//       transformOrigin: "center center",
//       width: data.width,
//       height: data.height,
//       objectFit: "cover",
//     }}
//   />
// ));
// ImageElement.displayName = "ImageElement";

// const SvgElement = React.memo(({ data }: { data: SVGData }) => (
//   <Image
//     src={data.src}
//     width={500}
//     height={500}
//     alt=""
//     draggable={false}
//     loading="lazy"
//     unoptimized
//     onError={(e) => {
//       const t = e.currentTarget as HTMLImageElement;
//       t.onerror = null;
//       t.src = `data:image/svg+xml;base64,${btoa(
//         `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='100%' height='100%' fill='#1e1e2c'/></svg>`,
//       )}`;
//     }}
//     style={{
//       position: "absolute",
//       left: data.x,
//       top: data.y,
//       transform: `rotate(${data.rotation ?? 0}deg)`,
//       transformOrigin: "center center",
//       opacity: `${data.opacity ?? 100 / 100}`,
//       width: data.width,
//       height: data.height,
//       objectFit: "cover",
//     }}
//   />
// ));
// SvgElement.displayName = "SvgElement";

// const ShapeElement = React.memo(({ data }: { data: ShapeData }) => (
//   <div
//     style={{
//       position: "absolute",
//       left: data.x,
//       top: data.y,
//       width: data.width,
//       opacity: `${data.opacity ?? 100 / 100}`,
//       height: data.height,
//       contain: "strict",
//     }}
//   >
//     <svg
//       width="100%"
//       height="100%"
//       viewBox="0 0 100 100"
//       preserveAspectRatio="none"
//       dangerouslySetInnerHTML={{ __html: data.shape || "" }}
//     />
//   </div>
// ));
// ShapeElement.displayName = "ShapeElement";

// const VideoElement = React.memo(({ data }: { data: VideoData }) =>
//   data.thumbnail ? (
//     <Image
//       src={data.thumbnail}
//       draggable={false}
//       unoptimized
//       style={{
//         position: "absolute",
//         left: data.x,
//         top: data.y,
//         width: data.width,
//         height: data.height,
//         objectFit: "cover",
//       }}
//       width={500}
//       height={500}
//       alt="Picture of the author"
//     />
//   ) : (
//     <video
//       src={data.src}
//       draggable={false}
//       style={{
//         position: "absolute",
//         left: data.x,
//         top: data.y,
//         width: data.width,
//         height: data.height,
//         objectFit: "cover",
//       }}
//     />
//   ),
// );
// VideoElement.displayName = "VideoElement";

// // ─── Dispatcher —
// const SlideElement = React.memo(({ el }: { el: ElementType }) => {
//   switch (el.data.type) {
//     case "text":
//       return <TextElement data={el.data as TextData} />;
//     case "button":
//       return <ButtonElement data={el.data as ButtonData} />;

//     case "image":
//       return <ImageElement data={el.data as ImageData} />;

//     case "video":
//       return <VideoElement data={el.data as VideoData} />;

//     case "shape":
//       return <ShapeElement data={el.data as ShapeData} />;
//     case "svg":
//       return <SvgElement data={el.data as SVGData} />;
//     default:
//       return null;
//   }
// });
// SlideElement.displayName = "SlideElement";

// function arePropsEqual(
//   prev: { slide: SlideType },
//   next: { slide: SlideType },
// ): boolean {
//   if (prev.slide.id !== next.slide.id) return false;
//   if (prev.slide.background !== next.slide.background) return false;
//   if (prev.slide.width !== next.slide.width) return false;
//   if (prev.slide.height !== next.slide.height) return false;
//   if (prev.slide.elements.length !== next.slide.elements.length) return false;
//   for (let i = 0; i < prev.slide.elements.length; i++) {
//     if (prev.slide.elements[i].id !== next.slide.elements[i].id) return false;
//     if (prev.slide.elements[i].data !== next.slide.elements[i].data)
//       return false;
//   }
//   return true;
// }
// // ─── Main component ────────────────────────────────────────────────────────
// function MiniSlidePreview({ slide }: { slide: SlideType }) {
//   const slideWidth = slide.width ?? 853.33;
//   const slideHeight = slide.height ?? 480;

//   const elements = useMemo(
//     () => slide.elements.map((el) => <SlideElement key={el.id} el={el} />),
//     [slide.elements],
//   );

//   return (
//     <div
//       className="relative rounded overflow-hidden"
//       style={{
//         width: slideWidth * SCALE,
//         height: slideHeight * SCALE,
//         background: slide.background,
//         contain: "strict",
//         willChange: "transform",
//         transform: "translateZ(0)",
//       }}
//     >
//       <div
//         style={{
//           width: slideWidth,
//           height: slideHeight,
//           transform: `scale(${SCALE})`,
//           transformOrigin: "top left",
//           position: "absolute",
//           top: 0,
//           left: 0,
//           pointerEvents: "none",
//         }}
//       >
//         {elements}
//       </div>
//     </div>
//   );
// }

// export default React.memo(MiniSlidePreview, arePropsEqual);



"use client";
import React, { useEffect, useMemo } from "react";
import { shapeMarkup as legacyShape } from "@shared/shapeMarkup";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useImageFallback } from "@editor/lib/ui/imageFallback";
import { frameImageStyle, frameShape } from "@editor/blocks/Frame/frames";
import { useNaturalSize } from "@editor/blocks/Frame/useNaturalSize";
import {
  DEFAULT_EC,
  DEFAULT_QR_BACKGROUND,
  DEFAULT_QR_FOREGROUND,
  encodeQR,
  qrPath,
} from "@editor/blocks/QRCode/qr";
import { loadGoogleFont } from "@shared/fonts/useFontLoader";
import {
  DEFAULT_TEXT_COLOR,
  SlideType,
  ElementType,
  TextData,
  ImageData,
  ButtonData,
  SVGData,
  VideoData,
  ShapeData,
  InteractionData,
  FrameData,
  QRCodeData,
  TableData,
  ChartData,
  WatermarkData,
} from "@editor/store/editorStore";
import {
  tableCellStyle,
  tableFrameStyle,
} from "@editor/blocks/Table/lib/tableStyle";
import InteractionFace from "@editor/blocks/Interaction/renderer/InteractionFace";
import useEditorStore from "@editor/store/editorStore";
import TocIndexBody from "@editor/blocks/Index/renderer/TocIndexBody";
import { getChapters } from "@editor/blocks/Index/lib/ChapterManager";
import { paginateBookIndex } from "@editor/blocks/Index/lib/BookIndexPaginator";

/** The thumbnail is not interactive; index rows still want a click handler. */
const NOOP = () => {};
import {
  buildShapeFilter,
  hasGradientFill,
  resolveShapePaint,
  stripPaintableFills,
  svgGradientVector,
} from "@editor/lib/canvas/shapeEffects";

/** Default thumbnail render scale; the sidebar's placeholder reuses it. */
export const SCALE = 0.2;

const ChartRenderer = dynamic(
  () => import("@editor/blocks/Chart/renderer/ChartRenderer"),
  { ssr: false },
);

// const TextElement = React.memo(({ data }: { data: TextData }) => {
//   useEffect(() => {
//     if (data.fontFamily) loadGoogleFont(data.fontFamily);
//   }, [data.fontFamily]);

//   return (
//     <div
//       style={{
//         position: "absolute",
//         left: data.x + 4,
//         top: data.y + 4,
//         width: data.width - 8,
//         height: data.height,
//         color: data.color,
//         fontSize: data.fontSize,
//         fontFamily: data.fontFamily,
//         whiteSpace: "pre-wrap",
//         lineHeight: data.lineHeight,
//         letterSpacing: data.letterSpacing,
//         fontWeight: data.fontWeight,
//         textAlign: data.align,
//         textTransform: data.textTransform || "none",
//         contain: "strict",
//       }}
//       dangerouslySetInnerHTML={{ __html: data.html || data.text }}
//     />
//   );
// });
// TextElement.displayName = "TextElement";



const TextElement = React.memo(({ data }: { data: TextData }) => {
  useEffect(() => {
    if (data.fontFamily) loadGoogleFont(data.fontFamily);
  }, [data.fontFamily]);

  return (
    <div
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: data.width,               // exact content width – do NOT shrink it
        minHeight: data.height,
        boxSizing: "border-box",
        // NO padding here
        color: data.color ?? DEFAULT_TEXT_COLOR,
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        lineHeight: data.lineHeight,
        letterSpacing: data.letterSpacing,
        fontWeight: data.fontWeight,
        fontStyle: data.fontStyle,
        textAlign: data.align,
        textTransform: data.textTransform || "none",
        textDecoration: data.link ? "underline" : data.textDecoration,
        background: data.backgroundColor || "transparent",
        overflow: "visible",
      }}
      dangerouslySetInnerHTML={{ __html: data.html || data.text }}
    />
  );
});
TextElement.displayName = "TextElement";



// eslint-disable-next-line react/display-name
const ButtonElement = React.memo(({ data }: { data: ButtonData }) => {
  useEffect(() => {
    if (data.fontFamily) loadGoogleFont(data.fontFamily);
  }, [data.fontFamily]);

  const hasGradient = data.gradientFrom && data.gradientTo;
  const dir =
    data.gradientDirection === "vertical"
      ? "to bottom"
      : data.gradientDirection === "horizontal"
        ? "to right"
        : "135deg";

  return (
    <div
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        fontWeight: data.fontWeight,
        borderRadius: data.borderRadius,
        color: data.textColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        border:
          data.borderWidth && data.borderWidth > 0
            ? `${data.borderWidth}px solid ${data.borderColor ?? "transparent"}`
            : "none",
        background: hasGradient
          ? `linear-gradient(${dir}, ${data.gradientFrom}, ${data.gradientTo})`
          : data.backgroundColor || "transparent",
        padding: "0 16px",
        boxSizing: "border-box",
        whiteSpace: "nowrap",
        overflow: "hidden",
        contain: "strict",
      }}
    >
      {data.icon && data.iconPosition === "left" && <span>{data.icon}</span>}
      <span>{data.text}</span>
      {data.icon && data.iconPosition !== "left" && <span>{data.icon}</span>}
    </div>
  );
});

const ImageElement = React.memo(({ data, eager }: { data: ImageData; eager: boolean }) => {
  const fallback = useImageFallback(data.src);
  return (
  <Image
    src={fallback.src}
    width={500}
    height={500}
    alt=""
    draggable={false}
    loading={eager ? "eager" : "lazy"}
    unoptimized
    onError={fallback.onError}
    style={{
      position: "absolute",
      left: data.x,
      top: data.y,
      transform: `
        rotate(${data.rotation ?? 0}deg)
        scaleX(${data.flipX ? -1 : 1})
        scaleY(${data.flipY ? -1 : 1})
      `,
      opacity: `${data.opacity ?? 100 / 100}`,
      transformOrigin: "center center",
      width: data.width,
      height: data.height,
      objectFit: "cover",
      border: data.strokeWidth ? `${data.strokeWidth}px ${data.strokeStyle ?? "none"} ${data.strokeColor ?? "#000"}` : undefined,
      borderRadius: data.borderRadius || 0,
      filter: `
        contrast(${data.contrast ?? 100}%)
        brightness(${data.brightness ?? 100}%)
        saturate(${data.saturate ?? 100}%)
        blur(${data.blur ?? 0}px)
        grayscale(${data.grayscale ?? 0}%)
        sepia(${data.sepia ?? 0}%)
        hue-rotate(${data.hueRotate ?? 0}deg)
      `,
    }}
  />
  );
});
ImageElement.displayName = "ImageElement";

const SvgElement = React.memo(({ data, eager }: { data: SVGData; eager: boolean }) => {
  const fallback = useImageFallback(data.src);
  return (
  <Image
    src={fallback.src}
    width={500}
    height={500}
    alt=""
    draggable={false}
    loading={eager ? "eager" : "lazy"}
    unoptimized
    onError={fallback.onError}
    style={{
      position: "absolute",
      left: data.x,
      top: data.y,
      transform: `
        rotate(${data.rotation ?? 0}deg)
        scaleX(${data.flipX ? -1 : 1})
        scaleY(${data.flipY ? -1 : 1})
      `,
      transformOrigin: "center center",
      opacity: `${data.opacity ?? 100 / 100}`,
      width: data.width,
      height: data.height,
      objectFit: "cover",
      border: data.strokeWidth ? `${data.strokeWidth}px ${data.strokeStyle ?? "none"} ${data.strokeColor ?? "#000"}` : undefined,
      borderRadius: data.borderRadius || 0,
      filter: `
        contrast(${data.contrast ?? 100}%)
        brightness(${data.brightness ?? 100}%)
        saturate(${data.saturate ?? 100}%)
        blur(${data.blur ?? 0}px)
        grayscale(${data.grayscale ?? 0}%)
        sepia(${data.sepia ?? 0}%)
        hue-rotate(${data.hueRotate ?? 0}deg)
      `,
    }}
  />
  );
});
SvgElement.displayName = "SvgElement";

// const ShapeElement = React.memo(({ data }: { data: ShapeData }) => {
//   const clipId = `shape-clip-preview-${data.shape?.length ?? 0}`;
//   const radius = data.borderRadius ? parseInt(String(data.borderRadius)) : 0;
//   const dash =
//     data.strokeStyle === "dashed" ? "8 4" :
//       data.strokeStyle === "dotted" ? "2 4" :
//         data.strokeStyle === "inset" ? "12 6" :
//           "none";

//   return (
//     <div
//       style={{
//         position: "absolute",
//         left: data.x,
//         top: data.y,
//         width: data.width,
//         height: data.height,
//         opacity: data.opacity ?? 1,
//         transform: [
//           `rotate(${data.rotation ?? 0}deg)`,
//           data.flipX ? "scaleX(-1)" : "",
//           data.flipY ? "scaleY(-1)" : "",
//         ].filter(Boolean).join(" ") || undefined,
//         transformOrigin: "center center",
//         contain: "strict",
//       }}
//     >
//       <svg
//         width="100%"
//         height="100%"
//         viewBox="0 0 100 100"
//         preserveAspectRatio="none"
//         style={{ overflow: "visible" }}
//         dangerouslySetInnerHTML={{
//           __html: `
//             <clipPath id="${clipId}">
//               <rect width="100" height="100" rx="${radius}" ry="${radius}"/>
//             </clipPath>
//             <g clip-path="url(#${clipId})" fill="${data.color ?? "currentColor"}">
//               ${data.shape ?? ""}
//             </g>
//             ${data.strokeWidth ? `
//             <rect
//               width="100" height="100"
//               rx="${radius}" ry="${radius}"
//               fill="none"
//               stroke="${data.strokeColor ?? "#000"}"
//               stroke-width="${data.strokeWidth * 2}"
//               stroke-dasharray="${dash}"
//             />` : ""}
//           `,
//         }}
//       />
//     </div>
//   );
// });
// ShapeElement.displayName = "ShapeElement";



const ShapeElement = React.memo(({ data, id }: { data: ShapeData; id: string }) => {
  const clipId = `shape-clip-preview-${id}`;
  const radius = data.borderRadius ? parseInt(String(data.borderRadius)) || 0 : 0;
  const dash =
    data.strokeStyle === "dashed" ? "8 4" :
    data.strokeStyle === "dotted" ? "2 4" :
    data.strokeStyle === "inset"  ? "12 6" :
    "none";

  // Straight from the stored data, through the same helpers RenderShape uses.
  // The thumbnail is a scaled-down copy of that markup, so the filter is built
  // at the element's real size and the wrapper's scale shrinks it to match.
  const { filter } = buildShapeFilter(data.effect, data.width, data.height);
  const useGradient = hasGradientFill(data);
  const gradientId = `shape-grad-preview-${id}`;
  const gradient = svgGradientVector(data.gradientDirection);
  const paint = resolveShapePaint(data, gradientId);
  const cleanShape = stripPaintableFills(legacyShape(data.shape));

  return (
    <div
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        opacity: data.opacity ?? 1,
        transform: [
          `rotate(${data.rotation ?? 0}deg)`,
          data.flipX ? "scaleX(-1)" : "",
          data.flipY ? "scaleY(-1)" : "",
        ].filter(Boolean).join(" ") || undefined,
        transformOrigin: "center center",
        filter,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ overflow: "visible", fill: paint }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect width="100" height="100" rx={radius} ry={radius} />
          </clipPath>
          {useGradient && (
            <linearGradient
              id={gradientId}
              x1={gradient.x1}
              y1={gradient.y1}
              x2={gradient.x2}
              y2={gradient.y2}
            >
              <stop offset="0%" stopColor={data.gradientFrom} />
              <stop offset="100%" stopColor={data.gradientTo} />
            </linearGradient>
          )}
        </defs>

        <g clipPath={`url(#${clipId})`} fill={paint}>
          <g dangerouslySetInnerHTML={{ __html: cleanShape }} />
        </g>

        {data.strokeWidth ? (
          <rect
            width="100"
            height="100"
            rx={radius}
            ry={radius}
            fill="none"
            stroke={data.strokeColor || "#000"}
            strokeWidth={data.strokeWidth * 2}
            strokeDasharray={dash}
          />
        ) : null}
      </svg>
    </div>
  );
});
ShapeElement.displayName = "ShapeElement";







const VideoElement = React.memo(({ data, eager }: { data: VideoData; eager: boolean }) =>
  data.thumbnail ? (
    <Image
      src={data.thumbnail}
      draggable={false}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        objectFit: "cover",
        // (RenderVideo.tsx ke saath consistent) flip, border aur filters
        // — pehle ye missing the.
        transform: `
          scaleX(${data.flipX ? -1 : 1})
          scaleY(${data.flipY ? -1 : 1})
        `,
        border: data.strokeWidth ? `${data.strokeWidth}px ${data.strokeStyle ?? "none"} ${data.strokeColor ?? "#000"}` : undefined,
        borderRadius: data.borderRadius || 0,
        filter: `
          contrast(${data.contrast ?? 100}%)
          brightness(${data.brightness ?? 100}%)
          saturate(${data.saturate ?? 100}%)
          blur(${data.blur ?? 0}px)
          grayscale(${data.grayscale ?? 0}%)
          sepia(${data.sepia ?? 0}%)
          hue-rotate(${data.hueRotate ?? 0}deg)
        `,
      }}
      width={500}
      height={500}
      alt="Picture of the author"
    />
  ) : (
    <video
      src={data.src}
      draggable={false}
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        objectFit: "cover",
        transform: `
          scaleX(${data.flipX ? -1 : 1})
          scaleY(${data.flipY ? -1 : 1})
        `,
        border: data.strokeWidth ? `${data.strokeWidth}px ${data.strokeStyle ?? "none"} ${data.strokeColor ?? "#000"}` : undefined,
        borderRadius: data.borderRadius || 0,
        filter: `
          contrast(${data.contrast ?? 100}%)
          brightness(${data.brightness ?? 100}%)
          saturate(${data.saturate ?? 100}%)
          blur(${data.blur ?? 0}px)
          grayscale(${data.grayscale ?? 0}%)
          sepia(${data.sepia ?? 0}%)
          hue-rotate(${data.hueRotate ?? 0}deg)
        `,
      }}
    />
  ),
);
VideoElement.displayName = "VideoElement";

// Interactions were missing from thumbnails entirely, so a page full of quiz
// buttons and link tags looked empty in the Pages panel.
const InteractionElement = React.memo(({ data }: { data: InteractionData }) => (
  <div
    style={{
      position: "absolute",
      left: data.x,
      top: data.y,
      width: data.width,
      height: data.height,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      padding: "0 14px",
      boxSizing: "border-box",
      background: data.backgroundColor ?? "transparent",
      borderRadius: data.borderRadius ?? 0,
      opacity: data.opacity ?? 1,
      transform: `rotate(${data.rotation ?? 0}deg)`,
      transformOrigin: "center center",
      overflow: "hidden",
    }}
  >
    <InteractionFace data={data} />
  </div>
));
InteractionElement.displayName = "InteractionElement";

/**
 * A frame in a thumbnail: the same clip-path the canvas uses, so a masked
 * picture reads the same here as on the page.
 */
const FrameElement = React.memo(({ data, eager }: { data: FrameData; eager: boolean }) => {
  const shape = frameShape(data.frameShape);
  const fallback = useImageFallback(data.imageSrc ?? "");
  const natural = useNaturalSize(data.imageSrc);
  return (
    <div
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        transform: `rotate(${data.rotation ?? 0}deg)`,
        transformOrigin: "center center",
        opacity: data.opacity ?? 1,
        overflow: "hidden",
        background: shape.card?.background ?? "transparent",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: shape.clip,
          WebkitClipPath: shape.clip,
          background: data.imageSrc ? "transparent" : (data.backgroundColor ?? "#e9e9ef"),
          overflow: "hidden",
        }}
      >
        {data.imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fallback.src}
            onError={fallback.onError}
            alt=""
            loading={eager ? "eager" : "lazy"}
            style={frameImageStyle(data, data, natural)}
          />
        )}
      </div>
    </div>
  );
});
FrameElement.displayName = "FrameElement";

/** A QR code in a thumbnail, drawn from its content like everywhere else. */
const QRCodeElement = React.memo(({ data }: { data: QRCodeData }) => {
  const matrix = encodeQR(data.content, data.ecLevel ?? DEFAULT_EC);
  if (!matrix) return null;
  return (
    <svg
      viewBox={`0 0 ${matrix.size} ${matrix.size}`}
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        transform: `rotate(${data.rotation ?? 0}deg)`,
        transformOrigin: "center center",
        opacity: data.opacity ?? 1,
      }}
    >
      <rect width={matrix.size} height={matrix.size} fill={data.background ?? DEFAULT_QR_BACKGROUND} />
      <path d={qrPath(matrix)} fill={data.foreground ?? DEFAULT_QR_FOREGROUND} />
    </svg>
  );
});
QRCodeElement.displayName = "QRCodeElement";

/**
 * A table in a thumbnail, drawn through the same style helpers the canvas and
 * the reader use — `tableStyle.ts` exists precisely so the three cannot drift.
 * Merged cells are honoured so the grid still closes correctly.
 */
const TableElement = React.memo(({ data }: { data: TableData }) => {
  const rows = data.cells?.length ?? 0;
  if (!rows) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        opacity: data.opacity ?? 1,
        transform: `rotate(${data.rotation ?? 0}deg)`,
        transformOrigin: "center center",
      }}
    >
      <table style={tableFrameStyle(data.style)}>
        <tbody>
          {data.cells.map((row, rowIndex) => (
            <tr key={rowIndex} style={{ height: `${100 / rows}%` }}>
              {row.map((cell, columnIndex) => {
                if (cell.hidden) return null;
                return (
                  <td
                    key={`${rowIndex}:${columnIndex}`}
                    rowSpan={cell.rowSpan}
                    colSpan={cell.colSpan}
                    style={tableCellStyle(data.style, {
                      row: rowIndex,
                      column: columnIndex,
                      rowCount: rows,
                      columnCount: row.length,
                      colSpan: cell.colSpan,
                    })}
                  >
                    {cell.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
TableElement.displayName = "TableElement";

/**
 * A chart in a thumbnail, sketched in plain SVG rather than mounted through
 * recharts.
 *
 * The canvas already loads recharts on demand to keep ~450KB of d3 out of the
 * editor's boot path; a static import here would pull it straight back in, and
 * every page of the rail would mount a full chart tree for a picture about
 * 170px wide. The sketch uses the chart's own colours and its real values, so
 * the shape and the palette read correctly at this size — which is what a
 * thumbnail is for. Grid lines, axes and legends are deliberately left out.
 */
const ChartElement = React.memo(({ data }: { data: ChartData }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        opacity: data.opacity ?? 1,
        transform: `rotate(${data.rotation ?? 0}deg)`,
        transformOrigin: "center center",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <ChartRenderer data={data} />
    </div>
  );
});
ChartElement.displayName = "ChartElement";

const watermarkLetterSpacing = (value?: string): string => {
  const pct = parseFloat(value ?? "");
  return Number.isNaN(pct) ? "0.15em" : `${(pct / 100).toFixed(3)}em`;
};

/**
 * A watermark in a thumbnail. It stamps the whole page rather than sitting in
 * its own box, so unlike every other element here it needs the page size.
 */
const WatermarkElement = React.memo(
  ({
    data,
    slideWidth,
    slideHeight,
  }: {
    data: WatermarkData;
    slideWidth: number;
    slideHeight: number;
  }) => {
    const {
      text,
      color,
      opacity = 1,
      fontSize,
      rotation = -35,
      pattern,
      font,
      letterSpacing,
      imageSrc,
      scale,
    } = data;

    const stamps = useMemo(() => {
      if (imageSrc) return null;

      const stampStyle: React.CSSProperties = {
        position: "absolute",
        color,
        opacity,
        fontSize,
        fontWeight: 800,
        fontFamily: font
          ? `'${font}', sans-serif`
          : "'Plus Jakarta Sans', sans-serif",
        letterSpacing: watermarkLetterSpacing(letterSpacing),
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        lineHeight: 1,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        transformOrigin: "center center",
      };

      // Same geometry as the canvas stamp: the rotated bounding box sets the
      // spacing, so a grid keeps its rhythm at any angle.
      const approxW = text.length * fontSize * 0.6;
      const approxH = fontSize * 1.2;

      if (pattern !== "grid") {
        return [
          <div
            key="single"
            style={{ ...stampStyle, left: slideWidth / 2, top: slideHeight / 2 }}
          >
            {text}
          </div>,
        ];
      }

      const rad = Math.abs((rotation * Math.PI) / 180);
      const gapX =
        (approxW * Math.abs(Math.cos(rad)) + approxH * Math.abs(Math.sin(rad))) *
        1.4;
      const gapY =
        (approxW * Math.abs(Math.sin(rad)) + approxH * Math.abs(Math.cos(rad))) *
        1.9;
      const cols = Math.ceil(slideWidth / gapX) + 2;
      const rows = Math.ceil(slideHeight / gapY) + 2;

      const out: React.ReactNode[] = [];
      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const staggerX = r % 2 === 0 ? 0 : gapX / 2;
          out.push(
            <div
              key={`${r}-${c}`}
              style={{
                ...stampStyle,
                left: c * gapX + staggerX - approxW / 2,
                top: r * gapY - approxH / 2,
              }}
            >
              {text}
            </div>,
          );
        }
      }
      return out;
    }, [
      text, color, opacity, fontSize, rotation, pattern, font,
      letterSpacing, imageSrc, slideWidth, slideHeight,
    ]);

    if (imageSrc) {
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          <Image
            src={imageSrc}
            alt=""
            width={100}
            height={100}
            unoptimized
            draggable={false}
            style={{
              width: !scale || scale === "Auto" ? "60%" : scale,
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              opacity,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
          />
        </div>
      );
    }

    return (
      <div
        style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        aria-hidden="true"
      >
        {stamps}
      </div>
    );
  },
);
WatermarkElement.displayName = "WatermarkElement";

/**
 * A book index in a thumbnail, laid out by the same paginator the canvas and
 * the reader use — rendered as plain text it just said "INDEX".
 *
 * Chapters come from the document in the store, which is what the sidebar rail
 * is showing. A template preview borrows the open document's chapters, which is
 * the closest thing available there and still reads as a contents page.
 */
const BookIndexElement = React.memo(({ data }: { data: TextData }) => {
  const slides = useEditorStore((s) => s.slides);
  const chapters = useMemo(() => getChapters(slides), [slides]);
  const pageNumber = data.indexPage ?? 0;
  const indexPage = useMemo(
    () =>
      paginateBookIndex(chapters, data)[pageNumber] ?? {
        page: pageNumber,
        entries: [],
      },
    [chapters, data, pageNumber],
  );

  return (
    <div
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        boxSizing: "border-box",
        overflow: "hidden",
        opacity: data.opacity ?? 1,
        transform: `rotate(${data.rotation ?? 0}deg)`,
        transformOrigin: "center center",
        background: data.backgroundColor || "transparent",
        color: data.color ?? "#111827",
        fontFamily: data.fontFamily,
        fontSize: data.fontSize ?? 14,
        fontWeight: data.fontWeight ?? 400,
        lineHeight: data.lineHeight ?? 1.4,
        padding: `${data.tocMarginTop || 16}px ${data.tocIndent || 16}px ${data.tocMarginBottom || 16}px`,
      }}
    >
      <TocIndexBody
        data={data}
        page={indexPage}
        pageNumber={pageNumber}
        noChapters={chapters.length === 0}
        onEntryClick={NOOP}
      />
    </div>
  );
});
BookIndexElement.displayName = "BookIndexElement";

// ─── Dispatcher —
const SlideElement = React.memo(
  ({
    el,
    eagerImages,
    slideWidth,
    slideHeight,
  }: {
    el: ElementType;
    eagerImages: boolean;
    slideWidth: number;
    slideHeight: number;
  }) => {
    switch (el.data.type) {
      case "text":
        // Same split the canvas and the reader make: an index is a text
        // element by storage, but never by appearance.
        return (el.data as TextData).bookRole === "index" ? (
          <BookIndexElement data={el.data as TextData} />
        ) : (
          <TextElement data={el.data as TextData} />
        );
      case "button":
        return <ButtonElement data={el.data as ButtonData} />;
      case "interaction":
        return <InteractionElement data={el.data as InteractionData} />;

      case "image":
        return <ImageElement data={el.data as ImageData} eager={eagerImages} />;

      case "video":
        return <VideoElement data={el.data as VideoData} eager={eagerImages} />;

      case "shape":
        return <ShapeElement data={el.data as ShapeData} id={el.id} />;
      case "svg":
        return <SvgElement data={el.data as SVGData} eager={eagerImages} />;
      case "frame":
        return <FrameElement data={el.data as FrameData} eager={eagerImages} />;
      case "qr-code":
        return <QRCodeElement data={el.data as QRCodeData} />;
      case "table":
        return <TableElement data={el.data as TableData} />;
      case "chart":
        return <ChartElement data={el.data as ChartData} />;
      case "watermark":
        return (
          <WatermarkElement
            data={el.data as WatermarkData}
            slideWidth={slideWidth}
            slideHeight={slideHeight}
          />
        );
      default:
        return null;
    }
  },
);
SlideElement.displayName = "SlideElement";

type MiniSlidePreviewProps = {
  slide: SlideType;
  /** Render scale. Defaults to the sidebar thumbnail scale. */
  scale?: number;
  /** Load preview images immediately (needed for nested scrolling lists). */
  eagerImages?: boolean;
};

function arePropsEqual(
  prev: MiniSlidePreviewProps,
  next: MiniSlidePreviewProps,
): boolean {
  if ((prev.scale ?? SCALE) !== (next.scale ?? SCALE)) return false;
  if ((prev.eagerImages ?? false) !== (next.eagerImages ?? false)) return false;
  if (prev.slide.id !== next.slide.id) return false;
  if (prev.slide.background !== next.slide.background) return false;
  if (prev.slide.width !== next.slide.width) return false;
  if (prev.slide.height !== next.slide.height) return false;
  if (prev.slide.elements.length !== next.slide.elements.length) return false;
  for (let i = 0; i < prev.slide.elements.length; i++) {
    if (prev.slide.elements[i].id !== next.slide.elements[i].id) return false;
    if (prev.slide.elements[i].data !== next.slide.elements[i].data)
      return false;
  }
  return true;
}
// ─── Main component ────────────────────────────────────────────────────────
function MiniSlidePreview({ slide, scale = SCALE, eagerImages = false }: MiniSlidePreviewProps) {
  const slideWidth = slide.width ?? 853.33;
  const slideHeight = slide.height ?? 480;

  const elements = useMemo(
    () =>
      slide.elements.map((el) => (
        <SlideElement
          key={el.id}
          el={el}
          eagerImages={eagerImages}
          slideWidth={slideWidth}
          slideHeight={slideHeight}
        />
      )),
    [slide.elements, eagerImages, slideWidth, slideHeight],
  );

  return (
    <div
      className="relative rounded overflow-hidden"
      style={{
        width: slideWidth * scale,
        height: slideHeight * scale,
        // Content background — theme follow nahi karta, isliye literal white.
        background: slide.background || "#ffffff",
        // `contain` keeps a thumbnail's layout and paint to itself. The
        // `will-change`/`translateZ` that used to sit here promoted EVERY
        // thumbnail to its own compositor layer — hundreds of layers on a long
        // book, which is a memory and jank problem rather than a win.
        contain: "strict",
      }}
    >
      <div
        style={{
          width: slideWidth,
          height: slideHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        {elements}
      </div>
    </div>
  );
}

export default React.memo(MiniSlidePreview, arePropsEqual);
