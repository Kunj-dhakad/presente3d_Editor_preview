"use client";
import React, { useEffect, useState } from "react";
import {
    Sparkles,
    // Zap,
    // Move,
    // Palette,
} from "lucide-react";

import useEditorStore from "@editor/store/editorStore";
import { ShapeData } from "@editor/store/editorStore";

interface ToolbarProps {
    target: HTMLElement | null;
}

const ShapeEditToolbar: React.FC<ToolbarProps> = ({ target }) => {
    const [pos, setPos] = useState({ top: 0, left: 0, visible: false });

    // === Store Access ===
    const selectedId = useEditorStore((s) => s.activeElementId);
    const updateElement = useEditorStore((s) => s.updateElement);
    const activeSlide = useEditorStore((s) => s.activeSlide);
    const slides = useEditorStore((s) => s.slides);

    const slide = slides[activeSlide];
    const element = slide?.elements.find((el) => el.id === selectedId);

    // Update only text elements
    const updateText = (patch: Partial<ShapeData>) => {
        if (!element) return;
        if (element.data.type !== "svg") return;
        updateElement(element.id, patch);
    };

    useEffect(() => {
        if (!target) return;

        const updatePos = () => {
            const rect = target.getBoundingClientRect();
            const toolbarHeight = 44;
            const margin = 10;

            let top = rect.top - toolbarHeight - margin;
            if (top < 60) top = rect.bottom + margin;

            const left = rect.left + rect.width / 2;

            setPos({ top, left, visible: true });
        };

        // Initial update
        updatePos();

        // Scroll listeners (whole editor + window)
        window.addEventListener("scroll", updatePos, true);

        // Resize listener
        window.addEventListener("resize", updatePos);

        // MutationObserver (text element resize / drag / RND changes)
        const obs = new MutationObserver(updatePos);
        obs.observe(target, { attributes: true, childList: true, subtree: true });

        return () => {
            window.removeEventListener("scroll", updatePos, true);
            window.removeEventListener("resize", updatePos);
            obs.disconnect();
        };
    }, [target]);

    if (!pos.visible || !target) return null;


    return (
        <div
            className="
        fixed z-9999
        kd-bg-surface kd-fg
        rounded-2xl
        kd-shadow-lg
        border kd-bd-subtle
        flex items-center gap-1
        px-1 py-1
      "
            style={{
                top: pos.top,
                left: pos.left,
                transform: "translateX(-50%)",
            }}
        >

            {/* EFFECTS */}
            <button className="text-sm px-1 py-1 rounded-lg kd-hv-bg flex items-center gap-1">
                <Sparkles size={16} /> Effects
            </button>


            {/* COLOR PICKER */}
            <button
                className="text-xl px-1  py-1 rounded-lg kd-hv-bg"
            >
                {/* <Palette size={18} /> */}

                <input
                    type="color"
                    value={(element?.data as ShapeData)?.color || "#000000"}
                    onChange={(e) => updateText({ color: e.target.value })}
                    className="w-6 h-6 cursor-pointer"
                />
            </button>




        </div>
    );
};

export default ShapeEditToolbar;
