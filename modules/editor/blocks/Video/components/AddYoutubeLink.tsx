"use client";

import React, { useState } from "react";
import { SendHorizontal, Video } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import { getCenteredMediaPlacement } from "@editor/layout/EditorCanvas/utils/mediaPlacement";

const AddVideoLink: React.FC<{ Addtype?: string }> = ({ Addtype }) => {
    const [videoUrl, setVideoUrl] = useState("");

    const addElement = useEditorStore((s) => s.addElement);
    const selectedId = useEditorStore((s) => s.activeElementId);
    const updateElement = useEditorStore((s) => s.updateElement);
    // Selectors, not the whole store: this panel re-rendered on every edit.
    const slides = useEditorStore((s) => s.slides);
    const activeSlide = useEditorStore((s) => s.activeSlide);
    const canvasWidth = slides[activeSlide]?.width;
    const canvasHeight = slides[activeSlide]?.height;

    // const addVideo = () => {
    //     if (!videoUrl.trim()) return;
    //     const src = videoUrl.trim();

    //     if (Addtype === "replace") {
    //         if (!selectedId) return;
    //         updateElement(selectedId, { src });
    //         return;
    //     }

    //     addElement({
    //         type: "video",
    //         src,
    //         thumbnail: "",
    //         x: 80,
    //         y: 120,
    //         width: 400,
    //         height: 250,
    //         rotation: 0,
    //         opacity: 1,
    //         zIndex: 1,
    //         stroke: "",
    //         strokeWidth: 0,
    //         borderRadius: "8",
    //         offsetX: 0,
    //         offsetY: 0,
    //         color: "transparent",
    //         isDragging: false,
    //         animationType: "None",
    //     });

    //     setVideoUrl("");
    // };



    const getYoutubeThumbnail = (url: string) => {
        const regExp =
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/;

        const match = url.match(regExp);

        if (!match) return null;

        const videoId = match[1];

        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    };

    const addVideo = () => {
        if (!videoUrl.trim()) return;

        const src = videoUrl.trim();
        const thumbnail = getYoutubeThumbnail(src) || "";
        const placement = getCenteredMediaPlacement(canvasWidth, canvasHeight, 400, 250);

        if (Addtype === "replace") {
            if (!selectedId) return;

            updateElement(selectedId, {
                src,
                thumbnail,
            });

            return;
        }

        addElement({
            type: "video",
            src,
            thumbnail,
            x: placement.x,
            y: placement.y,
            width: placement.width,
            height: placement.height,
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            stroke: "",
            strokeWidth: 0,
            borderRadius: "8",
            offsetX: 0,
            offsetY: 0,
            color: "transparent",
            isDragging: false,
            animationType: "None",
        });

        setVideoUrl("");
    };



    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") addVideo();
    };

    return (
        <div className="w-full kd-bg-primery rounded-xl px-2 kd-text-primery">
            <div className="flex items-center gap-2 mb-3">
                <Video size={18} />
                <h3 className="text-sm font-semibold">Add Video From Link</h3>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Paste YouTube or video link..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 text-sm p-2 rounded-md kd-input"
                />
                <button onClick={addVideo} className="kd-ai-generator-sendBtn">
                    <SendHorizontal size={18} />
                </button>
            </div>
        </div>
    );
};

export default AddVideoLink;
