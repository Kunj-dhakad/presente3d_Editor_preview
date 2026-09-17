"use client";
import React from "react";
import useEditorStore from "@editor/store/editorStore";
import { KdBannerAddSlideIcon, KdBannerDeleteIcon, KdBannerDownIcon, KdBannerDuplicateIcon, KdBannerUpIcon } from "@editor/lib/icon/icons";

export default function SlideSettingToolbar({ slideIndex }: { slideIndex: number }) {
    const addSlide = useEditorStore((s) => s.addSlide);
    const deleteSlide = useEditorStore((s) => s.deleteSlide);
    const duplicateSlide = useEditorStore((s) => s.duplicateSlide);
    const reorderSlides = useEditorStore((s) => s.reorderSlides);
    const setActiveSlide = useEditorStore((s) => s.setActiveSlide);
    // One of these renders per slide, so subscribing to the whole `slides`
    // array re-rendered every slide's toolbar on every store write.
    const totalSlides = useEditorStore((s) => s.slides.length);
    const thisSlideId = useEditorStore((s) => s.slides[slideIndex]?.id);
  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);

    const moveSlide = (direction: -1 | 1) => {
        const targetIdx = slideIndex + direction;
        const container = document.querySelector(".kd-default-scroll-panel") as HTMLElement | null;
        // Where the user was looking before the pages swapped.
        const startScrollTop = container?.scrollTop ?? 0;

        reorderSlides(slideIndex, targetIdx);
        setActiveSlide(targetIdx);
        if (!container) return;

        requestAnimationFrame(() => {
            const targetSlide = container.querySelectorAll("[data-slide-index]")[targetIdx] as
                | HTMLElement
                | undefined;
            if (!targetSlide) return;

            // Moving a page up shifts content above the viewport, so the browser
            // re-anchors the scroll position and the page simply appeared in its
            // new spot with no animation. Pinning the view back to where it
            // started makes both directions animate the same distance.
            container.scrollTop = startScrollTop;

            const containerTop = container.getBoundingClientRect().top;
            const slideTop = targetSlide.getBoundingClientRect().top;
            const scrollOffset = container.scrollTop + (slideTop - containerTop);
            container.scrollTo({ top: scrollOffset, behavior: "smooth" });
        });
    };

    return (
        <div className="w-full flex items-center justify-between">
            <div className="shrink-0 Kd-Slide-Setting-heding-text mb-1">Page {slideIndex + 1}</div>
            <div className="flex items-center gap-4">
                <button
                    className={` kd-tooltip-parent ${slideIndex === 0 || totalSlides === 1
                        ? "Kd-Slide-Setting-icon-inactive"
                        : "Kd-Slide-Setting-icon"
                        }`}

                     onMouseEnter={() => setShowTooltip("Pageup")}
                     onMouseLeave={() => setShowTooltip(null)}
                    onClick={() => {
                        if (slideIndex > 0) moveSlide(-1);
                    }}
                    disabled={slideIndex === 0 || totalSlides === 1}
                >
                    <KdBannerUpIcon />
                      {showTooltip === "Pageup" && <span className="kd-tooltip-bottom">Move up</span>}
                </button>
                <button
                    className={` kd-tooltip-parent ${slideIndex === totalSlides - 1 || totalSlides === 1
                        ? "Kd-Slide-Setting-icon-inactive"
                        : "Kd-Slide-Setting-icon"
                        }`}
                         onMouseEnter={() => setShowTooltip("Pagedown")}
                          onMouseLeave={() => setShowTooltip(null)}
                       onClick={() => {
                        if (slideIndex < totalSlides - 1) moveSlide(1);
                    }}
                    disabled={slideIndex === totalSlides - 1 || totalSlides === 1}
                >
                    <KdBannerDownIcon />
                      {showTooltip === "Pagedown" && <span className="kd-tooltip-bottom">Move down</span>}
                </button>
                <button
                    className=" kd-tooltip-parent Kd-Slide-Setting-icon"
                     onMouseEnter={() => setShowTooltip("Duplicatepage")}
                     onMouseLeave={() => setShowTooltip(null)}
                    onClick={() => duplicateSlide(String(thisSlideId))}
                >
                    <KdBannerDuplicateIcon />
                     {showTooltip === "Duplicatepage" && <span className="kd-tooltip-bottom">Duplicate page</span>}
                </button>
                <button
                    className=" kd-tooltip-parent Kd-Slide-Setting-icon"
                    onMouseEnter={() => setShowTooltip("Deletepage")}
                     onMouseLeave={() => setShowTooltip(null)}
                    onClick={() => deleteSlide(String(thisSlideId))}
                    disabled={totalSlides === 1}
                >
                    <KdBannerDeleteIcon />
                      {showTooltip === "Deletepage" && <span className="kd-tooltip-bottom">Delete page</span>}
                </button>
                <button
                    className="  kd-tooltip-parent Kd-Slide-Setting-icon"
                     onMouseEnter={() => setShowTooltip("Addpage")}
                     onMouseLeave={() => setShowTooltip(null)}
                    onClick={() => addSlide(String(thisSlideId))}>
                    <KdBannerAddSlideIcon />
                    {showTooltip === "Addpage" && <span className="kd-tooltip-bottom">Add page</span>}
                </button>
            </div>
        </div>
    );
}