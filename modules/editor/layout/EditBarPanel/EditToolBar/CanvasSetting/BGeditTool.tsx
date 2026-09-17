import React, { useRef, useEffect, useState } from "react";
import ColorPickerCard from "./CanvasBgColorPanel";
import useEditorStore from "@editor/store/editorStore";
import BgUploadImage from "./BgUploadImage";
import { Upload, ImageIcon, Palette, X } from "lucide-react";
import BackgroundImages from "./BackgroundImages";

interface BackgroundPickerProps {
    isOpen: boolean;
    onClose: () => void;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
}
type PanelType = "Color" | "Upload" | "Custom";

interface CardProps {
    title: string;
    icon: React.ElementType;
    value: PanelType;
    active: boolean;
    onClick: (value: PanelType) => void;
}

const OptionCard: React.FC<CardProps> = ({
    title,
    icon: Icon,
    value,
    active,
    onClick,
}) => {
    return (
        <button
            onClick={() => onClick(value)}
            className={`
        kd-btn
        flex 
        gap-1
        px-1
        py-1
        items-center
        text-center
        text-sm
        transition
        ${active
                    ? "kd-btn-active"
                    : ""
                }
      `}
        >
            <Icon size={16} />
            {title}
        </button>
    );
};










export default function BGeditTool({
    isOpen,
    onClose,
    buttonRef,
}: BackgroundPickerProps) {
    const pickerRef = useRef<HTMLDivElement>(null);
    // const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});

    const activeSlide = useEditorStore((s) => s.activeSlide);
    const updateSlideBackground = useEditorStore((s) => s.updateSlideBackground);

    const slides = useEditorStore((s) => s.slides);
    const currentBg = slides[activeSlide]?.background || "#000000";
    const [activePanel, setActivePanel] = useState<PanelType>("Color");

    const handleBackgroundSelect = (background: string) => {
        updateSlideBackground(activeSlide, background);
        // onClose();
    };


    //     function lightenColor(hex: string, percent: number) {
    //         hex = hex.replace("#", "");

    //         let r = parseInt(hex.substring(0, 2), 16);
    //         let g = parseInt(hex.substring(2, 4), 16);
    //         let b = parseInt(hex.substring(4, 6), 16);

    //         r = Math.min(255, Math.floor(r + (255 - r) * percent));
    //         g = Math.min(255, Math.floor(g + (255 - g) * percent));
    //         b = Math.min(255, Math.floor(b + (255 - b) * percent));

    //         return `#${r.toString(16).padStart(2, "0")}${g
    //             .toString(16)
    //             .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    //     }


    // const handleBackgroundSelect = (background: string) => {
    //     updateSlideBackground(activeSlide, background);

    //     if (background.startsWith("#")) {
    //         const lighter = lightenColor(background, 0.40);

    //         document.documentElement.style.setProperty(
    //             "--kd-main-section-bg",
    //             lighter
    //         );
    //     }
    // };








    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (e: PointerEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(e.target as Node) &&
                !buttonRef.current?.contains(e.target as Node)
            ) {
                onClose();
            }
        };

        const handleWheel = (e: WheelEvent) => {
            // 👇 agar scroll popup ke andar ho raha hai → ignore
            if (pickerRef.current?.contains(e.target as Node)) return;

            // 👇 bahar scroll → close
            onClose();
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("wheel", handleWheel, { passive: true });
        window.addEventListener("resize", onClose);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("wheel", handleWheel);
            window.removeEventListener("resize", onClose);
        };
    }, [isOpen, onClose, buttonRef]);


    if (!isOpen) return null;
    return (
        <div
            ref={pickerRef}

            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="kd-popup-main-container  p-2 overflow-hidden"

            style={{
                // ...pickerStyle,
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                width: 280,
                maxHeight: 400,
                overflowY: "auto",
                // padding: 16,
                zIndex: 100,
            }}
        >
            {/* Header */}
            <div className="sticky top-0 ">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="kd-text-primary font-medium text-sm">Backgrounds</h3>
                    <button
                        onClick={onClose}
                        className="kd-text-primary transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-1" >
                    <OptionCard
                        title="Color"
                        icon={Palette}
                        value="Color"
                        active={activePanel === "Color"}
                        onClick={setActivePanel}
                    />
                    <OptionCard
                        title="Upload"
                        icon={Upload}
                        value="Upload"
                        active={activePanel === "Upload"}
                        onClick={setActivePanel}
                    />
                    <OptionCard
                        title="library"
                        icon={ImageIcon}
                        value="Custom"
                        active={activePanel === "Custom"}
                        onClick={setActivePanel}
                    />
                </div>
                <div className="kd-popup-divider my-2" />
            </div>


            {/* Color Picker */}
            {activePanel === "Color" && (
                <div className="mb-4">
                    <ColorPickerCard
                        color={currentBg}
                        // onChangeColor={handleBackgroundSelect}
                    />
                </div>
            )}

            {activePanel === "Upload" && (
                <div className="max-h-72 overflow-hidden">
                    <p className="kd-text-primary text-xs mb-2 ">Upload Images</p>
                    <BgUploadImage handleBackgroundSelect={handleBackgroundSelect} />
                </div>
            )}


            {activePanel === "Custom" && (

                // <div>
                //     <p className="kd-text-primary text-xs mb-2">Custom Image</p>

                //     {/* ---- REAL IMAGE GRID (10 images) ---- */}
                //     <div className="grid grid-cols-2 gap-2 mb-3  max-h-52 overflow-y-auto custom-scrollbar">
                //         {[
                //             "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800",
                //             "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800",
                //             "https://images.unsplash.com/photo-1503264116251-35a269479413?w=800",
                //             "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800",
                //             "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800",
                //             "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=800",

                //         ].map((img, idx) => (
                //             <button
                //                 key={idx}
                //                 onClick={() =>
                //                     handleBackgroundSelect(`url(${img}) center/cover no-repeat`)
                //                 }
                //                 className="w-full h-16 rounded-lg overflow-hidden border border-transparent kd-text-primary transition-all hover:scale-105"
                //             >
                //                 <div
                //                     style={{
                //                         backgroundImage: `url(${img})`,
                //                         backgroundSize: "cover",
                //                         backgroundPosition: "center",
                //                         width: "100%",
                //                         height: "100%",
                //                     }}
                //                 ></div>
                //             </button>
                //         ))}
                //     </div>
                // </div>
                <BackgroundImages handleBackgroundSelect={handleBackgroundSelect} />

            )}


        </div>
    );
}
