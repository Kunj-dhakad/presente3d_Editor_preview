"use client";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { SOLID_COLORS } from "./TextBgColorPanel";
import { KdColorPlusIcon } from "@editor/lib/icon/icons";
import { Search } from "lucide-react";
import React, { useState, useRef } from "react";

interface Props {
    color?: string;
    label?: string;
}

const RECENT_COLORS = [
    "#000000", "#8B5CF6", "#5EEAD4", "#4FC3F7", "#F4A261",
    "#fdb57c", "#3B82F6", "#E76F51", "#FF0000", "#F4C2D7",
    "#52C41A", "#FF6B6B",
];

export default function TextColorPanel() {
    const activeElementId = useEditorStore((s) => s.activeElementId);
    const activeElement = useEditorStore((s) => s.slides[s.activeSlide]?.elements.find((element) => element.id === s.activeElementId));
    const storedColor = activeElement?.data.type === "text" ? activeElement.data.color || "#ffffff" : "#ffffff";
    const [currentColor, setCurrentColor] = useState(storedColor);
    const [searchQuery, setSearchQuery] = useState("");
    const [showMore, setShowMore] = useState(false);
    // Both of these change what gets rendered, so they are state rather
    // than refs — a ref cannot be written during render, and the reset is
    // decided during render.
    const [initialColor, setInitialColor] = useState(storedColor);
    const [trackedElementId, setTrackedElementId] = useState(activeElementId);
    const [recentColors, setRecentColors] = useState<string[]>(RECENT_COLORS);
    const popoverRef = useRef<HTMLDivElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const setPendingTextColor = useEditorUIStore((s) => s.setPendingTextColor);

    // Selecting a different element resets the swatch to that element's own
    // colour. Done during render rather than in an effect: an effect would
    // paint one frame of the previous element's colour first, and React now
    // flags the synchronous setState as a cascading render.
    if (trackedElementId !== activeElementId) {
        setTrackedElementId(activeElementId);
        setInitialColor(storedColor);
        setCurrentColor(storedColor);
    }

    const updateColor = (value: string) => {
        setCurrentColor(value);
        setPendingTextColor(value);
    };

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        updateColor(value);
        setRecentColors((prev) => {
            const filtered = prev.filter((c) => c !== value);
            return [value, ...filtered].slice(0, 12);
        });
    };

    const handleReset = () => {
        updateColor(initialColor);
    };

    const filteredSolid = SOLID_COLORS.filter(
        (color) => !searchQuery || color.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const visibleSolid = showMore || searchQuery ? filteredSolid : filteredSolid.slice(0, 64);




    return (
        <div className="p-2 h-full flex flex-col overflow-hidden" ref={popoverRef}>

            {/* SEARCH */}
            <div className="relative mb-5 shrink-0">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                        className="w-full h-10 rounded-lg border kd-bd-subtle kd-bg-surface px-3 pr-10 text-sm outline-none kd-fc-bd-accent"
                    />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 kd-fg">
                    <Search size={16} strokeWidth={2} />
                </div>
            </div>

            {/* RECENT COLORS */}
            <div className="mb-4 shrink-0">
                <p className="kdColorTextTitle text-xs font-semibold mb-2">Color Recent</p>
                <div className="grid grid-cols-8 gap-2">
                    <button
                        type="button"
                        onClick={() => colorInputRef.current?.click()}
                        className="kdColorPlusIcon-backbg w-7 h-7 rounded-lg flex items-center justify-center relative"
                        title="Custom color"
                    >
                        <div className="kdColorPlusIcon-bg w-5 h-5 rounded-sm flex items-center justify-center">
                            <KdColorPlusIcon />
                        </div>
                        <input
                            ref={colorInputRef}
                            type="color"
                            value={currentColor}
                            onChange={handleCustomColorChange}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            tabIndex={-1}
                        />
                    </button>

                    {recentColors.map((c, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => updateColor(c)}
                            className={`kd-color-box ${currentColor === c ? "selected" : ""}`}
                            style={{ backgroundColor: c }}
                            title={c}
                        />
                    ))}
                </div>
            </div>

            <div className="kd-toolPanel-hr-devide-border mb-2" />

            {/* SOLID COLORS */}
            <div className="mb-4 min-h-0 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <p className="kdColorTextTitle">Solid Color</p>
                    <button
                        type="button"
                        className="kdColorTextTitle cursor-pointer"
                        onClick={() => setShowMore((value) => !value)}
                    >
                        {showMore ? "See less" : "See more"}
                    </button>
                </div>
                <div className={`grid grid-cols-8 gap-2 ${showMore || searchQuery ? "max-h-[272px] overflow-y-auto kd-custom-scrollbar pr-1" : ""}`}>
                    {visibleSolid.map((c, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => updateColor(c)}
                            className={`kd-color-box ${currentColor === c ? "selected" : ""}`}
                            style={{ backgroundColor: c }}
                            title={c}
                        />
                    ))}
                </div>
            </div>

            <div className="kd-toolPanel-hr-devide-border mb-2" />


            {/* RESET */}
            <div className="shrink-0">
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleReset}
                    className="w-full py-2.5 kdTextBgColorBtn transition"
                >
                    Reset
                </button>
            </div>

        </div>
    );
}
