"use client";
import React, { useCallback } from "react";
import MiniSlidePreview from "@editor/layout/Preview/MiniSlidePreview";
import type { TemplateSlide } from "./types";

/* ==================== SCALED READ-ONLY SLIDE ==================== */

interface TemplateSlideCanvasProps {
    slide: TemplateSlide;
    /** Box the slide has to fit inside, in px. */
    maxWidth: number;
    maxHeight: number;
}

/**
 * Renders one template slide read-only, scaled to fit the given box. Uses the
 * editor's own `MiniSlidePreview`, so text/images/shapes/backgrounds look exactly
 * like they will on the canvas — no second renderer, no placeholder art.
 */
export const TemplateSlideCanvas = React.memo(function TemplateSlideCanvas({
    slide,
    maxWidth,
    maxHeight,
}: TemplateSlideCanvasProps) {
    const slideWidth = slide.width && slide.width > 0 ? slide.width : 853.33;
    const slideHeight = slide.height && slide.height > 0 ? slide.height : 480;
    const scale = Math.max(
        0.01,
        Math.min(maxWidth / slideWidth, maxHeight / slideHeight),
    );

    return <MiniSlidePreview slide={slide} scale={scale} eagerImages />;
});

/* ==================== SLIDE CARD ==================== */

/** Breathing room inside a slide card, in px — matches the grid card's p-1. */
export const TEMPLATE_SLIDE_CARD_PADDING = 4;

interface TemplateSlidePreviewProps {
    slide: TemplateSlide;
    /** Zero-based position in the template. */
    index: number;
    boxWidth: number;
    boxHeight: number;
    /** Replaces the current page with this one slide. */
    onApply: (index: number) => void;
}

/**
 * One template slide as a clickable card. Clicking it replaces the page the
 * user is currently on with this slide. Wears `Kd-add-template-card` — the very
 * skin the template grid uses — so both views of the panel read as one design;
 * everything on top of it is inline so the card never depends on new CSS.
 */
function TemplateSlidePreview({
    slide,
    index,
    boxWidth,
    boxHeight,
    onApply,
}: TemplateSlidePreviewProps) {
    const handleClick = useCallback(() => {
        onApply(index);
    }, [onApply, index]);

    const pad = TEMPLATE_SLIDE_CARD_PADDING;

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={`Replace the current page with slide ${index + 1}`}
            title={`Use slide ${index + 1} for the current page`}
            className="Kd-add-template-card group relative flex items-center justify-center overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
                width: boxWidth,
                height: boxHeight,
                padding: pad,
                outlineColor: "var(--kd-accent)",
            }}
        >
            <span
                className="pointer-events-none flex items-center justify-center"
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 6,
                    overflow: "hidden",
                    background: "var(--kd-bg-app)",
                }}
            >
                <TemplateSlideCanvas
                    slide={slide}
                    maxWidth={boxWidth - pad * 2}
                    maxHeight={boxHeight - pad * 2}
                />
            </span>

            {/* Top-right: slide content normally starts at the top-left. */}
            <span
                className="pointer-events-none absolute text-[10px] font-semibold"
                style={{
                    top: pad + 2,
                    right: pad + 2,
                    minWidth: 18,
                    padding: "2px 5px",
                    borderRadius: 6,
                    lineHeight: 1,
                    color: "#000000cc",
                    background: "#ffffffe6",
                    border: "1px solid #00000026",
                }}
            >
                {index + 1}
            </span>

            {/* Hover/focus affordance — the card is a "use this slide" action. */}
            <span
                className="pointer-events-none absolute text-center text-[10px] font-semibold opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{
                    left: pad,
                    right: pad,
                    bottom: pad,
                    padding: "4px 0",
                    borderRadius: 6,
                    background: "rgba(0, 0, 0, 0.62)",
                    color: "#ffffff",
                }}
            >
                Replace page
            </span>
        </button>
    );
}

export default React.memo(TemplateSlidePreview);
