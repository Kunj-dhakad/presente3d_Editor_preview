"use client";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { KdCanvasFooterMinusIcon, KdCanvasFooterPlusIcon, KDFooterPageIcon } from "@editor/lib/icon/icons";
import React from "react";
interface EditorFooterProps {
    totalSlides?: number;
    currentSlide?: number;
    /**
     * Narrow shell: drop the slide-rail toggle. There is no rail to toggle
     * there — pages live in the filmstrip — so the button would do nothing.
     * Zoom stays, because it is the only zoom control the editor has.
     */
    compact?: boolean;
}

export default function EditorFooter({
    totalSlides = 1,
    currentSlide = 1,
    compact = false,
}: EditorFooterProps) {
    const zoom = useEditorUIStore((s) => s.MainCanvasScale);
    const setZoom = useEditorUIStore((s) => s.setMainCanvasScale);
    const [showTooltip, setShowTooltip] = React.useState<string | null>(null);

    const zoomPercent = Math.round(zoom * 100);

    const handleZoom = (val: number) => {
        setZoom(Math.min(2, Math.max(0.1, val / 100)));
    };

    const step = (delta: number) => {
        const next = Math.round(zoomPercent / 10) * 10 + delta;
        handleZoom(Math.min(200, Math.max(10, next)));
    };

    return (

        <div className="flex items-center justify-between w-full h-[35px] px-2 sm:px-4 kd-bg-app">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => step(-10)}
                    className="flex items-center justify-center w-6 h-6">
                    <KdCanvasFooterMinusIcon />
                </button>

                <input
                    type="range"
                    min={10}
                    max={200}
                    step={5}
                    value={zoomPercent}
                    onChange={(e) => handleZoom(Number(e.target.value))}
                    className="kd-range-slider" 
                    />
                    
                <button

                    onClick={() => step(10)}
                    className=" flex items-center justify-center w-6 h-6">
                    <KdCanvasFooterPlusIcon />

                </button>

                <span className="w-10 text-[10px] kd-fg kd-font-jakarta">
                    {zoomPercent}%
                </span>
            </div>

            <div className="flex items-center">
                {!compact && (
                    <button
                        className="kd-tooltip-parent p-2 mx-2 rounded-md transition"
                        onMouseEnter={() => setShowTooltip("Preview")}
                        onMouseLeave={() => setShowTooltip(null)}
                        onClick={() => useEditorUIStore.getState().setPreviewPanelOpen(!useEditorUIStore.getState().previewpanelOpen)}
                    >
                        <KDFooterPageIcon />
                        {showTooltip === "Preview" && <span className="kd-tooltip-top">
                            {useEditorUIStore.getState().previewpanelOpen ? "Hide Preview" : "Show Preview"}
                        </span>}
                    </button>
                )}

                <div className={`${compact ? "hidden sm:flex" : "flex"} mx-1 items-center overflow-hidden kd-bg-surface rounded-md text-xs kd-font-jakarta`}>

                    <span className="kd-bg-hover px-2 py-1 text-[10px] font-medium kd-fg">
                        Page
                    </span>

                    {/* Chip me wo page jispar user hai. Yahan pehle `totalSlides`
                        chhapta tha aur uske baad "of {currentSlide} / {totalSlides}",
                        to 4 page ke document ke page 1 par likha aata tha
                        "Page 4 of 1 / 4". */}
                    <span className="kd-bg-hover px-2 py-1 text-[10px] font-medium kd-fg tabular-nums"> {currentSlide}</span>
                </div>

                <span className="px-1 text-[10px] kd-fg-muted kd-font-jakarta tabular-nums">
                    of <span className="ms-1">{totalSlides}</span>
                </span>
            </div>
        </div>
    );
}