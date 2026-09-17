// "use client";
// import React, { useEffect, useRef, useState } from "react";
// import { X } from "lucide-react";
// import useEditorStore, { TextData } from "@editor/store/editorStore";

// export default function LineHeightLetterSpacing({
//     isOpen,
//     onClose,
//     buttonRef,
// }: {
//     isOpen: boolean;
//     onClose: () => void;
//     buttonRef: React.RefObject<HTMLButtonElement | null>;
// }) {
//     const menuRef = useRef<HTMLDivElement>(null);
//     const [pos, setPos] = useState({ top: 0, left: 0 });

//     const activeElementId = useEditorStore((s) => s.activeElementId);
//     const slides = useEditorStore((s) => s.slides);
//     const activeSlide = useEditorStore((s) => s.activeSlide);
//     const updateElement = useEditorStore((s) => s.updateElement);

//     const element = slides[activeSlide]?.elements.find(
//         (el) => el.id === activeElementId
//     );

//     const data = element?.data as TextData | undefined;
//     const letterSpacing = data?.letterSpacing ?? 0;
//     const lineHeight = data?.lineHeight ?? 1.4;

//     useEffect(() => {
//         if (!isOpen || !buttonRef.current) return;
//         const btn = buttonRef.current;
//         const rect = btn.getBoundingClientRect();
//         const parent =
//             btn.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };
//         setPos({
//             top: rect.bottom - parent.top + 8,
//             left: rect.left - parent.left - 280,
//         });
//     }, [isOpen, buttonRef]);

//     useEffect(() => {
//         if (!isOpen) return;
//         const handleClick = (e: MouseEvent) => {
//             if (
//                 menuRef.current &&
//                 !menuRef.current.contains(e.target as Node) &&
//                 !buttonRef.current?.contains(e.target as Node)
//             ) {
//                 onClose();
//             }
//         };
//         window.addEventListener("mousedown", handleClick);
//         window.addEventListener("resize", onClose);
//         return () => {
//             window.removeEventListener("mousedown", handleClick);
//             window.removeEventListener("resize", onClose);
//         };
//     }, [isOpen, onClose, buttonRef]);

//     if (!isOpen || !element) return null;

//     const sliderMouseDown = (e: React.MouseEvent) => {
//         e.stopPropagation(); 
//     };

//     return (
//         <div
//             ref={menuRef}
//             data-element="true"
//             className="absolute w-[320px] rounded-xl border kd-bg-surface shadow-xl p-4 space-y-4"
//             style={{ top: pos.top, left: pos.left }}
//             onMouseDown={(e) => e.stopPropagation()} 
//         >
//             {/* HEADER */}
//             <div className="flex justify-between items-center">
//                 <h3 className="text-sm font-semibold">Text Spacing</h3>
//                 <button
//                     onMouseDown={(e) => e.preventDefault()}
//                     onClick={onClose}
//                     className="p-1 rounded kd-hv-bg-sunken transition"
//                 >
//                     <X size={16} />
//                 </button>
//             </div>

//             {/* LETTER SPACING */}
//             <div className="space-y-2">
//                 <div className="flex justify-between text-sm kd-fg">
//                     <span>Letter Spacing</span>
//                     <span className="px-2 py-0.5 border rounded-md text-xs kd-bg-app min-w-10 text-center">
//                         {letterSpacing}
//                     </span>
//                 </div>
//                 <input
//                     type="range"
//                     min={-5}
//                     max={20}
//                     step={0.5}
//                     value={letterSpacing}
//                     onMouseDown={sliderMouseDown} 
//                     onChange={(e) => {
//                         if (!activeElementId) return;
//                         updateElement(activeElementId, {
//                             letterSpacing: parseFloat(e.target.value),
//                         });
//                     }}
//                     className="w-full kd-accent-color cursor-pointer"
//                 />
//                 <div className="flex justify-between text-[10px] kd-fg-subtle">
//                     <span>-5</span>
//                     <span>20</span>
//                 </div>
//             </div>

//             {/* LINE HEIGHT */}
//             <div className="space-y-2">
//                 <div className="flex justify-between text-sm kd-fg">
//                     <span>Line Height</span>
//                     <span className="px-2 py-0.5 border rounded-md text-xs kd-bg-app min-w-10 text-center">
//                         {lineHeight.toFixed(1)}
//                     </span>
//                 </div>
//                 <input
//                     type="range"
//                     min={0.8}
//                     max={3}
//                     step={0.1}
//                     value={lineHeight}
//                     onMouseDown={sliderMouseDown}  // ✅ FIX
//                     onChange={(e) => {
//                         if (!activeElementId) return;
//                         updateElement(activeElementId, {
//                             lineHeight: parseFloat(e.target.value),
//                         });
//                     }}
//                     className="w-full kd-accent-color cursor-pointer"
//                 />
//                 <div className="flex justify-between text-[10px] kd-fg-subtle">
//                     <span>0.8</span>
//                     <span>3.0</span>
//                 </div>
//             </div>
//         </div>
//     );
// }


"use client";
import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import useEditorStore, { TextData } from "@editor/store/editorStore";
import { samePosition, trackAnchor } from "@editor/lib/ui/anchorTracking";

const POPUP_WIDTH = 320;

export default function LineHeightLetterSpacing({
    isOpen,
    onClose,
    buttonRef,
}: {
    isOpen: boolean;
    onClose: () => void;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
    const [mounted, setMounted] = useState(false);

    const activeElementId = useEditorStore((s) => s.activeElementId);
    const slides = useEditorStore((s) => s.slides);
    const activeSlide = useEditorStore((s) => s.activeSlide);
    const updateElement = useEditorStore((s) => s.updateElement);

    const element = slides[activeSlide]?.elements.find(
        (el) => el.id === activeElementId
    );

    const data = element?.data as TextData | undefined;
    const letterSpacing = data?.letterSpacing ?? 0;
    const lineHeight = data?.lineHeight ?? 1.4;

    // ✅ RAF loop — fixed + center aligned (ImageTransformPanel jaisa)
    useEffect(() => {
        if (!isOpen || !buttonRef.current) return;

        // setMounted(false);
        const t = setTimeout(() => setMounted(true), 10);

        const updatePos = () => {
            if (!buttonRef.current) return;
            const rect = buttonRef.current.getBoundingClientRect();
            setPos((prev) =>
        samePosition(prev, rect.bottom + 8, rect.left + rect.width / 2 - POPUP_WIDTH / 2)
          ? prev
          : { top: rect.bottom + 8, left: rect.left + rect.width / 2 - POPUP_WIDTH / 2, visible: true },
      );
        };

        updatePos();
        // Event-driven, not a 60fps loop: see trackAnchor.
        const stopTracking = trackAnchor(buttonRef.current, updatePos);

        return () => {
            stopTracking();
            clearTimeout(t);
        };
    }, [isOpen, buttonRef]);

    // ✅ Outside click close
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node) &&
                !buttonRef.current?.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen, onClose, buttonRef]);

    if (!isOpen || !element || !pos.visible) return null;

    return (
        <div
            ref={menuRef}
            data-element="true"
            className="fixed z-9999"
            style={{
                top: pos.top,
                left: pos.left,
                width: POPUP_WIDTH,
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0px)" : "translateY(-6px)",
                transition: "opacity 0.15s ease, transform 0.15s ease",
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="kd-bg-surface border kd-bd-subtle rounded-xl shadow-xl p-4 space-y-4">

                {/* HEADER */}
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold">Text Spacing</h3>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onClose}
                        className="p-1 rounded kd-hv-bg-sunken transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* LETTER SPACING */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm kd-fg">
                        <span>Letter Spacing</span>
                        <span className="px-2 py-0.5 border rounded-md text-xs kd-bg-app min-w-10 text-center">
                            {letterSpacing}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={-5}
                        max={20}
                        step={0.5}
                        value={letterSpacing}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                            if (!activeElementId) return;
                            updateElement(activeElementId, {
                                letterSpacing: parseFloat(e.target.value),
                            });
                        }}
                        className="w-full kd-accent-color cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] kd-fg-subtle">
                        <span>-5</span>
                        <span>20</span>
                    </div>
                </div>

                {/* LINE HEIGHT */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm kd-fg">
                        <span>Line Height</span>
                        <span className="px-2 py-0.5 border rounded-md text-xs kd-bg-app min-w-10 text-center">
                            {lineHeight.toFixed(1)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0.8}
                        max={3}
                        step={0.1}
                        value={lineHeight}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                            if (!activeElementId) return;
                            updateElement(activeElementId, {
                                lineHeight: parseFloat(e.target.value),
                            });
                        }}
                        className="w-full kd-accent-color cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] kd-fg-subtle">
                        <span>0.8</span>
                        <span>3.0</span>
                    </div>
                </div>

            </div>
        </div>
    );
}