import React, { useRef, useState } from "react";
// import ColorPickerCard from "./ColorPickerCard";
import useEditorStore from "@editor/store/editorStore";
import BgUploadImage from "./BgUploadImage";
import BackgroundImages from "./BackgroundImages";
import { KDImageIcon, KdUploadArrowIcon, ToolGradBgIcon } from "@editor/lib/icon/icons";
import CanvasBgColorPanel from "./CanvasBgColorPanel";

type PanelType = "Color" | "Upload" | "Custom";


export default function CanvasBgBar() {
    const pickerRef = useRef<HTMLDivElement>(null);
    const activeSlide = useEditorStore((s) => s.activeSlide);
    const updateSlideBackground = useEditorStore((s) => s.updateSlideBackground);
    const slides = useEditorStore((s) => s.slides);
    const currentBg = slides[activeSlide]?.background || "#000000";
    const [activePanel, setActivePanel] = useState<PanelType>("Color");
    const handleBackgroundSelect = (background: string) => {
        updateSlideBackground(activeSlide, background)
    };
    return (
        <div
            ref={pickerRef}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="flex flex-col h-full  overflow-hidden"
        >
            <div className="shrink-0 px-2">
                <div className="grid grid-cols-3 gap-1 py-2 mb-1">
                    <div
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1 py-2 w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "Color" ? "active" : ""}`}
                        onClick={() => setActivePanel("Color")}
                    >
                        <div className="kd-image-add-section-tap-btn-icon-1  h-[30px] w-[30px] flex items-center justify-center">
                            <span className="flex items-center justify-center rounded-lg kd-tap-btn-icon-box">
                              <ToolGradBgIcon/>
                            </span>
                        </div>
                        <span className="text-center leading-tight">Background <br/> Color</span>
                    </div>

                    <div
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1  w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "Upload" ? "active" : ""}`}
                        onClick={() => setActivePanel("Upload")}
                    >
                        <div className="kd-image-add-section-tap-btn-icon-2 h-[30px] w-[30px] flex items-center justify-center">
                            <span className="flex items-center justify-center  rounded-lg kd-tap-btn-icon-box">
                                <KdUploadArrowIcon />
                            </span>
                        </div>
                        <span className="text-center leading-tight">Upload Image  <br /> & URL</span>
                    </div>

                    <div
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1  w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "Custom" ? "active" : ""}`}
                        onClick={() => setActivePanel("Custom")}
                    >
                        <div className="kd-image-add-section-tap-btn-icon-3  h-[30px] w-[30px] flex items-center justify-center">
                            <span className="flex items-center justify-center rounded-lg kd-tap-btn-icon-box">
                                <KDImageIcon />
                            </span>
                        </div>
                        <span className="text-center leading-tight">Stock  <br /> Images</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {activePanel === "Color" && (
                <CanvasBgColorPanel color={currentBg}/>
                )}

                {activePanel === "Upload" && (
                        <BgUploadImage handleBackgroundSelect={handleBackgroundSelect} />
                )}

                {activePanel === "Custom" && (
                    <BackgroundImages handleBackgroundSelect={handleBackgroundSelect} />
                )}
            </div>
        </div>
    );
}