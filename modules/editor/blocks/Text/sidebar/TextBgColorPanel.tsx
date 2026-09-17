"use client";
import useEditorStore from "@editor/store/editorStore";
import { ImageSearchIcon, KdColorPlusIcon } from "@editor/lib/icon/icons";
import React, { useState, useRef } from "react";

interface Props {
    color?: string;
    label?: string;
}

const RECENT_COLORS = [
    "#000000", "#8B5CF6", "#5EEAD4", "#4FC3F7", "#F4A261",
    "#fdb57c", "#3B82F6", "#E76F51", "#FF0000", "#F4C2D7",
    "#52C41A", "#FF6B6B", "#CFF8EE", "#1B5E20", "#004D40"
];

export const SOLID_COLORS = [
    "#000000", "#1F1F1F", "#3F3F3F", "#5F5F5F", "#7F7F7F", "#A0A0A0", "#CFCFCF", "#FFFFFF",
    "#0D47A1", "#1565C0", "#1976D2", "#1E88E5", "#42A5F5", "#64B5F6", "#90CAF9", "#E3F2FD",
    "#1A237E", "#283593", "#3949AB", "#3F51B5", "#5C6BC0", "#7986CB", "#9FA8DA", "#E8EAF6",
    "#4A148C", "#6A1B9A", "#7B1FA2", "#8E24AA", "#AB47BC", "#BA68C8", "#CE93D8", "#F3E5F5",
    "#880E4F", "#AD1457", "#C2185B", "#D81B60", "#EC407A", "#F06292", "#F8BBD0", "#FCE4EC",
    "#B71C1C", "#C62828", "#D32F2F", "#E53935", "#EF5350", "#E57373", "#FFCDD2", "#FFEBEE",
    "#BF360C", "#D84315", "#F4511E", "#FF5722", "#FF7043", "#FF8A65", "#FFAB91", "#FBE9E7",
    "#FF6F00", "#FF8F00", "#FFA000", "#FFB300", "#FFC107", "#FFD54F", "#FFE082", "#FFF8E1",
    "#F57F17", "#F9A825", "#FBC02D", "#FDD835", "#FFEB3B", "#FFF176", "#FFF59D", "#FFFDE7",
    "#827717", "#9E9D24", "#AFB42B", "#C0CA33", "#CDDC39", "#DCE775", "#E6EE9C", "#F9FBE7",
    "#1B5E20", "#2E7D32", "#388E3C", "#43A047", "#4CAF50", "#81C784", "#A5D6A7", "#E8F5E9",
    "#004D40", "#00695C", "#00796B", "#00897B", "#26A69A", "#4DB6AC", "#80CBC4", "#E0F2F1",
];

const GRADIENT_COLORS = [
    "linear-gradient(135deg, #FFC7B2 0%, #B40F00 100%)",
    "linear-gradient(135deg, #5B03F2 0%, #7D71FF 100%)",
    "linear-gradient(135deg, #F95769 0%, #3DBAFA 100%)",
    "linear-gradient(135deg, #FC6173 0%, #695BEF 100%)",
    "linear-gradient(135deg, #61E3FA 0%, #5F19CD 100%)",
    "linear-gradient(135deg, #FCAA7C 0%, #28A6F5 100%)",
    "linear-gradient(135deg, #FFB0B9 0%, #FF3349 100%)",
    "linear-gradient(135deg, #1CBB5C 0%, #057638 100%)",
    "linear-gradient(135deg, #D56D07 0%, #873301 100%)",
    "linear-gradient(135deg, #85BDFC 0%, #2463D7 100%)",
    "linear-gradient(135deg, #60E4FB 0%, #01A5CE 100%)",
    "linear-gradient(135deg, #A65BFC 0%, #520EC3 100%)",
    "linear-gradient(135deg, #AA96FD 0%, #6A5EF0 100%)",
    "linear-gradient(135deg, #FBC841 0%, #EE9308 100%)",
    "linear-gradient(135deg, #28F09C 0%, #04A976 100%)",
    "linear-gradient(135deg, #ADFF1A 0%, #2B4506 100%)",
    "linear-gradient(135deg, #A8FF41 0%, #FFFF00 100%)",
    "linear-gradient(135deg, #FFB3E7 0%, #A302B2 100%)",
    "linear-gradient(135deg, #5F9AFC 0%, #1B46D6 100%)",
    "linear-gradient(135deg, #054F6D 0%, #4CD4CB 100%)",
    "linear-gradient(135deg, #FF7947 0%, #5C1F08 100%)",
    "linear-gradient(216.87deg, #FFB0B9 14.78%, #FF3349 89.53%)",
    "linear-gradient(135deg, #00DBDE 0%, #FC00FF 100%)",
    "linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)",
    "linear-gradient(135deg, #FA709A 0%, #FEE140 100%)",
    "linear-gradient(135deg, #30CFD0 0%, #330867 100%)",
    "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
    "linear-gradient(135deg, #FF6A00 0%, #EE0979 100%)",
    "linear-gradient(135deg, #11998E 0%, #38EF7D 100%)",
    "linear-gradient(135deg, #FC466B 0%, #3F5EFB 100%)",
    "linear-gradient(135deg, #F7971E 0%, #FFD200 100%)",
    "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
    "linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)",
    "linear-gradient(135deg, #36D1DC 0%, #5B86E5 100%)",
    "linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)",
    "linear-gradient(135deg, #F953C6 0%, #B91D73 100%)",
    "linear-gradient(135deg, #4E54C8 0%, #8F94FB 100%)",
    "linear-gradient(135deg, #FF512F 0%, #DD2476 100%)",
    "linear-gradient(135deg, #56AB2F 0%, #A8E063 100%)",
    "linear-gradient(135deg, #614385 0%, #516395 100%)",
    "linear-gradient(135deg, #FF9A9E 0%, #FAD0C4 100%)",
    "linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)",
    "linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)",
    "linear-gradient(135deg, #FCCB90 0%, #D57EEB 100%)",
    "linear-gradient(135deg, #FF8177 0%, #FF867A 100%)",
    "linear-gradient(135deg, #43CEA2 0%, #185A9D 100%)",
    "linear-gradient(135deg, #F83600 0%, #F9D423 100%)",
    "linear-gradient(135deg, #C33764 0%, #1D2671 100%)",
    "linear-gradient(135deg, #00F260 0%, #0575E6 100%)",
    "linear-gradient(135deg, #FC4A1A 0%, #F7B733 100%)",
    "linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)",
    "linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)",
    "linear-gradient(135deg, #F857A6 0%, #FF5858 100%)",
    "linear-gradient(135deg, #654EA3 0%, #EAAFC8 100%)",
    "linear-gradient(135deg, #FFB75E 0%, #ED8F03 100%)",
    "linear-gradient(135deg, #2193B0 0%, #6DD5ED 100%)",
    "linear-gradient(135deg, #42275A 0%, #734B6D 100%)",
    "linear-gradient(135deg, #FF4E50 0%, #F9D423 100%)",
    "linear-gradient(135deg, #141E30 0%, #243B55 100%)",
    "linear-gradient(135deg, #06BEB6 0%, #48B1BF 100%)",
    "linear-gradient(135deg, #FF8008 0%, #FFC837 100%)",
    "linear-gradient(135deg, #3A1C71 0%, #D76D77 50%, #FFAF7B 100%)",
    "linear-gradient(135deg, #00CDAC 0%, #8DDAD5 100%)",
    "linear-gradient(135deg, #F00000 0%, #DC281E 100%)",

];

const SOLID_PREVIEW_LIMIT = 24;
const GRADIENT_PREVIEW_LIMIT = 24;

export default function TextBgColorPanel() {
    const activeElementId = useEditorStore((s) => s.activeElementId);
    const activeElement = useEditorStore((s) => s.slides[s.activeSlide]?.elements.find((element) => element.id === s.activeElementId));
    const storedColor = activeElement?.data.type === "text" ? activeElement.data.backgroundColor || "#ffffff" : "#ffffff";
    const [currentColor, setCurrentColor] = useState(storedColor);
    const [showAllSolid, setShowAllSolid] = useState(false);
    const [showAllGradient, setShowAllGradient] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    // Both of these change what gets rendered, so they are state rather
    // than refs — a ref cannot be written during render, and the reset is
    // decided during render.
    const [initialColor, setInitialColor] = useState(storedColor);
    const [trackedElementId, setTrackedElementId] = useState(activeElementId);
    const [recentColors, setRecentColors] = useState<string[]>(RECENT_COLORS);
    const popoverRef = useRef<HTMLDivElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);

    const updateElement = useEditorStore((s) => s.updateElement);
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
        if (activeElementId) {
            updateElement(activeElementId, { backgroundColor: value });
        }
    };

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        updateColor(value);
        setRecentColors((prev) => {
            const filtered = prev.filter((c) => c !== value);
            return [value, ...filtered].slice(0, 15);
        });
    };

    const handleReset = () => {
        updateColor(initialColor);
    };

    const filteredSolid = SOLID_COLORS.filter(
        (c) => !searchQuery || c.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredGradient = GRADIENT_COLORS;

    const visibleSolid = showAllSolid ? filteredSolid : filteredSolid.slice(0, SOLID_PREVIEW_LIMIT);
    const visibleGradient = showAllGradient ? filteredGradient : filteredGradient.slice(0, GRADIENT_PREVIEW_LIMIT);

    return (
        <div className="p-2 flex flex-col h-full" ref={popoverRef}>

            <div className="shrink-0">
                {/* SEARCH */}
                <div className="relative mb-5">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="kd-imageTool-searchWrapper w-full rounded-lg text-sm outline-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 kdColorTextTitle">
                        <ImageSearchIcon />
                    </div>
                </div>

                <div className="mb-4">
                    <p className="kdColorTextTitle mb-2">Color Recent</p>
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
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto kd-custom-scrollbar pr-1">
                {/* SOLID COLORS */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="kdColorTextTitle">Solid Color</p>
                        <button
                            type="button"
                            className="kdColorTextTitle cursor-pointer"
                            onClick={() => setShowAllSolid((v) => !v)}
                        >
                            {showAllSolid ? "See less" : "See all"}
                        </button>
                    </div>

                    <div className="grid grid-cols-8 gap-2">
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

                {/* GRADIENT COLORS */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="kdColorTextTitle">Gradient Colors</p>
                        <button
                            type="button"
                            className="text-xs cursor-pointer"
                            onClick={() => setShowAllGradient((v) => !v)}
                        >
                            {showAllGradient ? "See less" : "See all"}
                        </button>
                    </div>

                    <div className="grid grid-cols-8 gap-2">
                        {visibleGradient.map((gradient, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => updateColor(gradient)}
                                className={`kd-color-box ${currentColor === gradient ? "selected" : ""}`}
                                style={{ background: gradient }}
                                title={`Gradient ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* RESET */}
                <div className="flex items-center justify-center gap-2">
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleReset}
                        className="w-full  py-2.5 kdTextBgColorBtn  transition"
                    >
                        Reset
                    </button>

                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { updateColor("") }}
                        className="w-full py-2.5 kdTextBgColorBtnRemove transition"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}
