"use client";

import { KdColorPlusIcon } from "@editor/lib/icon/icons";
import { SOLID_COLORS } from "@editor/blocks/Text/sidebar/TextBgColorPanel";
import { Search } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const DEFAULT_RECENT = ["#000000", "#8B5CF6", "#5EEAD4", "#4FC3F7", "#F4A261", "#3B82F6", "#E76F51", "#FF0000", "#52C41A", "#FF6B6B"];
type Props = { value?: string; onChange: (color: string) => void; onRemove?: () => void };

export default function SolidColorPalette({ value = "#000000", onChange, onRemove }: Props) {
  const safeValue = value.startsWith("#") ? value : "#000000";
  const [currentColor, setCurrentColor] = useState(safeValue);
  // Keep the color that was stored when this picker was opened. Do not update
  // it after a palette click, otherwise Reset only resets to the last color.
  const initialColorRef = useRef(safeValue);
  const [recentColors, setRecentColors] = useState(DEFAULT_RECENT);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMore, setShowMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setCurrentColor(safeValue); }, [safeValue]);
  const select = (color: string, addRecent = false) => { setCurrentColor(color); onChange(color); if (addRecent) setRecentColors((previous) => [color, ...previous.filter((item) => item !== color)].slice(0, 15)); };
  const filteredColors = SOLID_COLORS.filter((color) => !searchQuery || color.toLowerCase().includes(searchQuery.toLowerCase()));
  const colors = showMore || searchQuery ? filteredColors : filteredColors.slice(0, 64);
  return <div className="p-2 flex flex-col h-full overflow-hidden">
    <div className="relative mb-5 shrink-0"><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search..." className="w-full h-10 rounded-lg border kd-bd-subtle kd-bg-surface px-3 pr-10 text-sm outline-none kd-fc-bd-accent" /><div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 kd-fg"><Search size={16} strokeWidth={2} /></div></div>
    <div className="mb-4 shrink-0"><p className="kdColorTextTitle mb-2">Color Recent</p><div className="grid grid-cols-8 gap-2"><button type="button" onClick={() => inputRef.current?.click()} className="kdColorPlusIcon-backbg w-7 h-7 rounded-lg flex items-center justify-center relative" title="Custom color"><div className="kdColorPlusIcon-bg w-5 h-5 rounded-sm flex items-center justify-center"><KdColorPlusIcon /></div><input ref={inputRef} type="color" value={currentColor} onChange={(event) => select(event.target.value, true)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" tabIndex={-1} /></button>{recentColors.map((color) => <button key={color} type="button" onClick={() => select(color)} className={`kd-color-box ${currentColor === color ? "selected" : ""}`} style={{ backgroundColor: color }} title={color} />)}</div></div>
    <div className="kd-toolPanel-hr-devide-border mb-2" />
    <div className="mb-4 min-h-0 flex-1 flex flex-col"><div className="flex items-center justify-between mb-2"><p className="kdColorTextTitle">Solid Color</p><button type="button" className="kdColorTextTitle cursor-pointer" onClick={() => setShowMore((value) => !value)}>{showMore ? "See less" : "See more"}</button></div><div className={`grid grid-cols-8 gap-2 ${showMore || searchQuery ? "max-h-[272px] overflow-y-auto kd-custom-scrollbar pr-1" : ""}`}>{colors.map((color) => <button key={color} type="button" onClick={() => select(color)} className={`kd-color-box ${currentColor === color ? "selected" : ""}`} style={{ backgroundColor: color }} title={color} />)}</div></div>
    <div className="flex items-center justify-center gap-2 mt-auto"><button type="button" onClick={() => select(initialColorRef.current)} className="w-full py-2.5 kdTextBgColorBtn transition">Reset</button>{onRemove && <button type="button" onClick={onRemove} className="w-full py-2.5 kdTextBgColorBtnRemove transition">Remove</button>}</div>
  </div>;
}
