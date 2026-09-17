"use client";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { FaArrowLeft } from "react-icons/fa";
import TemplateSlidePreview, {
    TEMPLATE_SLIDE_CARD_PADDING,
} from "./TemplateSlidePreview";
import {
    TEMPLATE_EMPTY_MESSAGE,
    TEMPLATE_LOAD_ERROR_MESSAGE,
    applyTemplateSlideToActivePage,
    applyTemplateSlides,
    loadTemplateSlides,
} from "./templateUtils";
import type {
    TemplateListItem,
    TemplatePreviewStatus,
    TemplateSlide,
} from "./types";

interface TemplatePreviewPanelProps {
    template: TemplateListItem;
    /** Back to the template grid. Never mutates the editor. */
    onBack: () => void;
}

const EMPTY_SLIDES: TemplateSlide[] = [];
const GRID_GAP = 12; // --kd-grid-gap

/**
 * Template detail view. Lives inside the Assets Panel — same place the Cover
 * Page detail view opens — and renders every slide in the template JSON.
 * "Apply all" replaces the whole document with the template; clicking a single
 * slide replaces only the page the user is on.
 */
export default function TemplatePreviewPanel({
    template,
    onBack,
}: TemplatePreviewPanelProps) {
    const [slides, setSlides] = useState<TemplateSlide[]>(EMPTY_SLIDES);
    const [status, setStatus] = useState<TemplatePreviewStatus>(() =>
        template.json_url ? "loading" : "empty",
    );

    const bodyRef = useRef<HTMLDivElement>(null);
    const [bodyWidth, setBodyWidth] = useState(0);

    /* ==================== LOAD ==================== */

    // The panel is keyed per template by the grid, so this runs once per open:
    // initial state already covers "loading" / missing URL, and every update
    // below lands in an async callback.
    useEffect(() => {
        const url = template.json_url;
        if (!url) return;

        let cancelled = false;

        loadTemplateSlides(url)
            .then((loaded) => {
                if (cancelled) return;
                setSlides(loaded);
                setStatus(loaded.length ? "ready" : "empty");
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Error loading template preview:", err);
                setStatus("error");
            });

        return () => {
            cancelled = true;
        };
    }, [template.json_url]);

    /* ==================== SIZING ==================== */

    // The panel is a percentage of the window, so cards are fitted to the
    // measured width rather than a hardcoded one.
    useEffect(() => {
        const node = bodyRef.current;
        if (!node) return;
        const measure = () => setBodyWidth(node.clientWidth);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [status]);

    const thumbBox = useMemo(() => {
        const slideWidth = slides[0]?.width ?? 853.33;
        const slideHeight = slides[0]?.height ?? 480;
        const width = Math.max(0, Math.floor((bodyWidth - GRID_GAP) / 2));
        // The card pads its own frame, so the slide keeps its aspect ratio
        // inside that padding instead of letterboxing against the card edge.
        const inner = Math.max(0, width - TEMPLATE_SLIDE_CARD_PADDING * 2);
        return {
            width,
            height:
                Math.max(56, Math.round((inner * slideHeight) / slideWidth)) +
                TEMPLATE_SLIDE_CARD_PADDING * 2,
        };
    }, [slides, bodyWidth]);

    /* ==================== APPLY ==================== */

    const applyAll = useCallback(() => {
        applyTemplateSlides(slides, { history: true });
    }, [slides]);

    const applyOne = useCallback(
        (index: number) => {
            const slide = slides[index];
            if (slide) applyTemplateSlideToActivePage(slide);
        },
        [slides],
    );

    /* ==================== RENDER ==================== */

    const isReady = status === "ready" && slides.length > 0;

    return (
        <div className="kd-element-panel">
            {/* Header with back — same rhythm as the template grid header */}
            <div className="kd-panel-header">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back to templates"
                    className="kd-icon-btn"
                >
                    <FaArrowLeft className="text-xs" />
                </button>
                <span className="kd-panel-header-title">
                    {template.title || "Template"}
                </span>
            </div>

            <div className="kd-panel-divider" />

            {status === "loading" && (
                // Same skeleton cards the template grid shows while it loads.
                <div className="kd-panel-body overflow-hidden">
                    <div className="kd-asset-grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="Kd-add-template-card flex items-center justify-center"
                                style={{ height: 92, padding: TEMPLATE_SLIDE_CARD_PADDING }}
                            >
                                <span
                                    className="animate-pulse"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        borderRadius: 6,
                                        background: "var(--kd-accent-soft)",
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(status === "error" || status === "empty") && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-3 text-center">
                    <p className="kd-panel-subtext">
                        {status === "error"
                            ? TEMPLATE_LOAD_ERROR_MESSAGE
                            : TEMPLATE_EMPTY_MESSAGE}
                    </p>
                    <button
                        type="button"
                        onClick={onBack}
                        className="kd-panel-btn-ghost"
                    >
                        Close
                    </button>
                </div>
            )}

            {isReady && (
                <>
                    {/* ----- Apply all, in the slot the grid view gives search ----- */}
                    <div className="kd-panel-toolbar">
                        <button
                            type="button"
                            onClick={applyAll}
                            aria-label={`Apply all ${slides.length} slides`}
                            className="kd-panel-btn-primary focus-visible:outline-2 focus-visible:outline-offset-2"
                            style={{ outlineColor: "var(--kd-accent)" }}
                        >
                            Apply all
                        </button>
                        <div
                            className="kd-panel-subtext"
                            style={{ marginTop: 6, textAlign: "center" }}
                        >
                            Replaces current pages
                        </div>
                    </div>

                    <div className="kd-panel-divider" />

                    {/* ----- Every slide in the template ----- */}
                    <div
                        className="flex shrink-0 items-center justify-between gap-2"
                        style={{ padding: "10px var(--kd-panel-pad) 8px" }}
                    >
                        <span
                            className="whitespace-nowrap"
                            style={{
                                fontSize: "var(--kd-fs-sm)",
                                fontWeight: 600,
                                color: "var(--kd-text)",
                            }}
                        >
                            Slides ({slides.length})
                        </span>
                        <span className="kd-panel-subtext truncate">
                            Click a slide to replace this page
                        </span>
                    </div>
                </>
            )}

            <div
                className={`kd-panel-body kd-custom-scrollbar ${isReady ? "" : "hidden"}`}
            >
                <div ref={bodyRef} className="kd-asset-grid">
                    {isReady &&
                        thumbBox.width > 0 &&
                        slides.map((slide, index) => (
                            <TemplateSlidePreview
                                key={slide.id}
                                slide={slide}
                                index={index}
                                boxWidth={thumbBox.width}
                                boxHeight={thumbBox.height}
                                onApply={applyOne}
                            />
                        ))}
                </div>
            </div>
        </div>
    );
}
