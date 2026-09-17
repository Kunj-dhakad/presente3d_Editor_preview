"use client";
import React, { useState } from "react";
import useEditorStore, { WatermarkData } from "@editor/store/editorStore";
import { Icon, MiniStamp, PRESETS, blankForm } from "./Shared";
import type { FormState, OpacityPct } from "./Shared";
import { TextEditor, ImageEditor } from "./Editors";
import { KdWmEmptyStateLockIcon, KdWMPlusIcon, KdWmQuickAddIcon, } from "@editor/lib/icon/icons";
import Image from 'next/image'


const WmRow: React.FC<{
    data: WatermarkData;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ data, onEdit, onDelete }) => (
    <div className="kd-wm-row group flex items-center gap-2.5 rounded-xl border px-2 py-1.5 transition-colors">
        <div className="kd-wm-row-thumb w-12 h-9 rounded-lg border flex items-center justify-center overflow-hidden shrink-0">
            {data.imageSrc ? (
                <Image
                    src={data.imageSrc}
                    alt=""
                    className="w-full h-full object-contain"
                    height={100}
                    width={100}
                    unoptimized

                />
            ) : (
                <MiniStamp text={data.text} color={data.color} opacity={(data.opacity ?? 0.2) * 100} rotation={data.rotation ?? -35} />
            )}
        </div>

        <div className="flex-1 min-w-0">
            <p className="kd-wm-row-title font-bold truncate tracking-wide">{data.text || "Image watermark"}</p>
            <p className="kd-wm-row-subtitle mt-0.5">
                {Math.round((data.opacity ?? 0.2) * 100)}% opacity &middot; {data.pattern === "grid" ? "Grid" : "Single"}
            </p>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="kd-wm-row-action w-6 h-6 rounded-md border border-transparent flex items-center justify-center transition-colors" title="Edit">
                {Icon.edit}
            </button>
            <button onClick={onDelete} className="kd-wm-row-action kd-wm-row-action-danger w-6 h-6 rounded-md border border-transparent flex items-center justify-center transition-colors" title="Delete">
                {Icon.trash}
            </button>
        </div>
    </div>
);



type ViewState = "list" | "editor";
type EditorTab = "text" | "image";

const WatermarkPanel: React.FC = () => {
    // Selectors, not the whole store: this panel re-rendered on every edit.
    const slides = useEditorStore((s) => s.slides);
    const activeSlide = useEditorStore((s) => s.activeSlide);
    const addElement = useEditorStore((s) => s.addElement);
    const updateElement = useEditorStore((s) => s.updateElement);
    const deleteElement = useEditorStore((s) => s.deleteElement);

    const slide = slides[activeSlide];
    const canvasW = slide?.width ?? 350;
    const canvasH = slide?.height ?? 434;


    const watermarkElements = (slide?.elements ?? []).filter(
        (el) => el.data.type === "watermark"
    ) as { id: string; data: WatermarkData }[];

    const current = watermarkElements[0] ?? null;
    const hasWatermark = current !== null;

    const [view, setView] = useState<ViewState>("list");
    const [tab, setTab] = useState<EditorTab>("text");
    const [isEditingExisting, setIsEditingExisting] = useState(false);


    const toElementData = (f: FormState): WatermarkData => ({
        type: "watermark",
        text: f.text.trim(),
        color: f.color,
        opacity: f.opacityPct / 100,
        rotation: f.rotation,
        fontSize: f.fontSize,
        pattern: f.pattern,
        font: f.font,
        letterSpacing: f.letterSpacing,
        // Explicitly cleared: `updateElement` merges its patch, so switching an
        // image watermark back to text used to leave `imageSrc` in place — and
        // the renderer draws the image whenever that is set, so the text
        // watermark never appeared.
        imageSrc: undefined,
        scale: undefined,
        x: 0, y: 0,
        width: canvasW, height: canvasH,
        zIndex: 9999,
    });

    const toFormState = (d: WatermarkData): FormState => ({
        text: d.text,
        color: d.color,
        opacityPct: Math.round((d.opacity ?? 0.2) * 100) as OpacityPct,
        rotation: d.rotation ?? -35,
        fontSize: d.fontSize,
        pattern: d.pattern,
        font: d.font ?? "Montserrat",
        letterSpacing: d.letterSpacing ?? "5%",
        stylePreset: "style-fill",
    });

    const toImageElementData = (
        src: string,
        scale: string,
        rotation: number,
        opacityPct: OpacityPct,
    ): WatermarkData => ({
        type: "watermark",
        text: "",
        color: "#000000",
        opacity: opacityPct / 100,
        rotation,
        fontSize: 0,
        pattern: "single",
        x: 0, y: 0,
        width: canvasW, height: canvasH,
        zIndex: 9999,
        imageSrc: src,
        scale,
    });

    const upsert = (data: WatermarkData) => {
        if (current) updateElement(current.id, data, { history: true });
        else addElement(data);
    };



    const openCreate = () => { setIsEditingExisting(false); setTab("text"); setView("editor"); };
    const openEdit = () => {
        if (!current) return;
        setIsEditingExisting(true);
        setTab(current.data.imageSrc ? "image" : "text");
        setView("editor");
    };
    const closeEditor = () => { setView("list"); setIsEditingExisting(false); };

    const handlePreset = (preset: typeof PRESETS[number]) => {
        upsert(toElementData({
            ...blankForm,
            text: preset.label, color: preset.color, opacityPct: 20,
            rotation: preset.rotation, fontSize: preset.fontSize, pattern: "single",
        }));
    };

    const handleTextSave = (f: FormState) => { upsert(toElementData(f)); closeEditor(); };
    const handleImageSave = (
        src: string,
        scale: string,
        rotation: number,
        opacityPct: OpacityPct,
    ) => {
        upsert(toImageElementData(src, scale, rotation, opacityPct));
        closeEditor();
    };


    if (view === "editor") {
        return (
            <div className="kd-text-add-panel-container">
                <div className="kd-text-add-panel-fixed flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={closeEditor} className="kd-wm-back-btn w-6 h-6 rounded-md flex items-center justify-center transition-colors">
                            {Icon.back}
                        </button>
                        <span className="kd-toolPanel-heding-text">Watermark</span>
                    </div>

                    <div className="flex gap-1 kd-wm-quickadd-card">
                        <button
                            onClick={() => setTab("text")}
                            className={`kd-wm-tab-text ${tab === "text" ? "kd-wm-tab-active" : ""}
                flex-1 flex items-center justify-center gap-1.5 py-2  font-semibold transition-colors`}
                        >
                            {Icon.textTab} Text
                        </button>
                        <button
                            onClick={() => setTab("image")}
                            className={`kd-wm-tab-image ${tab === "image" ? "kd-wm-tab-active" : ""}
                flex-1 flex items-center justify-center gap-1.5 py-2  font-semibold transition-colors`}
                        >
                            {Icon.imageTab} Image
                        </button>
                    </div>
                </div>

                <div className="kd-text-add-panel-scroll">
                    {tab === "text" ? (
                        <TextEditor
                            mode={isEditingExisting ? "edit" : "create"}
                            initial={isEditingExisting && current ? toFormState(current.data) : blankForm}
                            onSave={handleTextSave}
                            onCancel={closeEditor}
                        />
                    ) : (
                        <ImageEditor
                            initialSrc={isEditingExisting ? current?.data.imageSrc ?? null : null}
                            initialScale={isEditingExisting ? current?.data.scale : undefined}
                            initialRotation={isEditingExisting ? current?.data.rotation : undefined}
                            initialOpacityPct={
                                isEditingExisting && current
                                    ? (Math.round((current.data.opacity ?? 0.6) * 100) as OpacityPct)
                                    : undefined
                            }
                            onSave={handleImageSave}
                            onCancel={closeEditor}
                        />
                    )}
                </div>
            </div>
        );
    }



    return (
        <div className="mx-2">
            <div className="mx-2 my-1.5">
                <span className="kd-toolPanel-heding-text">Watermark</span>
            </div>
            <div className="kd-toolPanel-hr-devide-border mb-2" />

            <div className=" flex flex-col gap-3">
                <div className="kd-wm-quickadd-card p-2">
                    <div className="flex items-start gap-1.5 mb-2.5 mt-1">
                        <div className="kd-wm-quickadd-sparkle flex items-center justify-center">
                            <KdWmQuickAddIcon />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="kd-wm-quickadd-title font-bold ">Quick Add</p>
                            <p className="kd-wm-quickadd-subtitle leading-tight">
                                {hasWatermark ? "Pick a preset to replace the current watermark" : "Choose, customize, or create a watermark"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 aspect-square gap-2">
                        {PRESETS.map((p) => {
                            const IconComponent = p.icon;
                            const hexToRgba = (hex: string, opacity: number) => {
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);

                                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                            };
                            return (
                                <button
                                    key={p.key}
                                    onClick={() => handlePreset(p)}
                                    title={p.label}
                                    className="kd-wm-preset-card relative min-h-20 flex items-center justify-center rounded-md border p-2.5 transition-colors"
                                >
                                    <span
                                        style={{ backgroundColor: hexToRgba(p.color, 0.10) }}
                                        className={`kd-wm-preset-icon-${p.key} absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center shrink-0`}
                                    >
                                        <IconComponent />
                                    </span>
                                    <span className="kd-wm-preset-label" style={{ color: p.color }}>
                                        {p.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {hasWatermark && current ? (
                    <div>
                        <p className="kd-wm-helper-text font-bold uppercase tracking-widest mb-2 px-0.5">
                            Active Watermark
                        </p>
                        <WmRow data={current.data} onEdit={openEdit} onDelete={() => deleteElement(current.id)} />
                    </div>
                ) : (
                    <div className="kd-wm-empty-state p-3 flex flex-col items-center justify-center gap-3  rounded-xl border border-dashed">
                        <span className="kd-wm-empty-icon-circle  h-12 w-12 flex items-center justify-center">
                            <KdWmEmptyStateLockIcon />
                        </span>
                        <div className="text-center">
                            <p className="kd-wm-empty-title font-semibold">No watermark yet</p>
                            <p className="kd-wm-empty-subtitle mt-0.5">Pick a preset or add a custom one</p>
                        </div>
                        {!hasWatermark && (
                            <button onClick={openCreate} className="kd-wm-cta-btn flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-bold transition-all">
                                <KdWMPlusIcon /> Create Custom Watermark
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export type { FormState };
export default WatermarkPanel;