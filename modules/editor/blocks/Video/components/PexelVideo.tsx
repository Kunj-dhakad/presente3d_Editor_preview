import React, { useEffect, useState } from "react";
import { createClient } from "@editor/lib/pexels-client";
import { FaArrowLeft, FaArrowRight, FaSearch } from "react-icons/fa";
import useEditorStore from "@editor/store/editorStore";
import CustomSelect from "./CustomSelect";
import { KdVideoPlayBtnICon } from "@editor/lib/icon/icons";
import { getCenteredMediaPlacement } from "@editor/layout/EditorCanvas/utils/mediaPlacement";
import { setVideoDrag } from "@editor/layout/EditorCanvas/utils/dragPayloads";
import AssetThumb from "@editor/components/AssetThumb";

const client = createClient();

const orientationOptions = [
    { label: "Landscape", value: "landscape" },
    { label: "Portrait", value: "portrait" },
    { label: "Square", value: "square" },
];

interface VideoFile {
    id: number;
    quality: string;
    file_type: string;
    link: string;
    width?: number;
    height?: number;
}

interface PexelVideoType {
    id: number;
    width: number;
    height: number;
    url: string;
    image: string;
    duration: number;
    video_files: VideoFile[];
}


const getBestVideoSrc = (files: VideoFile[]): string => {
    if (!files || files.length === 0) return "";
    const priority = ["hd", "sd", "hls"];
    for (const q of priority) {
        const match = files.find((f) => f.quality === q);
        if (match?.link) return match.link;
    }

    return files[0]?.link ?? "";
};

const PexelVideo: React.FC<{ Addtype?: string }> = ({ Addtype }) => {
    const [videos, setVideos] = useState<PexelVideoType[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("Nature");
    const [orientation, setOrientation] = useState<string>("landscape");
    const [page, setPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);

    const addElement = useEditorStore((s) => s.addElement);
    const selectedId = useEditorStore((s) => s.activeElementId);
    const updateElement = useEditorStore((s) => s.updateElement);

    // Selectors, not the whole store: this panel re-rendered on every edit.
    const slides = useEditorStore((s) => s.slides);
    const activeSlide = useEditorStore((s) => s.activeSlide);
    const canvasWidth = slides[activeSlide]?.width;
    const canvasHeight = slides[activeSlide]?.height;


    const addVideo = (src: string, height: number, width: number) => {
        if (!src) return;

        const placement = getCenteredMediaPlacement(canvasWidth, canvasHeight, width, height);

        if (Addtype === "replace") {
            if (!selectedId) return;
            updateElement(selectedId, { src });
            return;
        }

        addElement({
            type: "video",
            src,
            x: placement.x,
            y: placement.y,
            width: placement.width,
            height: placement.height,
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            stroke: "",
            strokeWidth: 0,
            borderRadius: "0",
            offsetX: 0,
            offsetY: 0,
            color: "transparent",
            isDragging: false,
            animationType: "None",
        });
    };

    useEffect(() => {
        const fetchVideos = async () => {
            setLoading(true);
            try {
                const response = await client.videos.search({
                    query: searchTerm || "Nature",
                    per_page: 20,
                    orientation: orientation || "",
                    page: page || 1,
                });

                if ("videos" in response) {
                    setVideos(response.videos as PexelVideoType[]);
                }
            } catch (error) {
                console.error("Error fetching videos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, [searchTerm, orientation, page]);

    return (
        <div className="px-2 space-y-2 flex flex-col h-full">
            {/* Search */}
            <div className="kd-search-wrapper">
                <FaSearch className="kd-search-icon" />
                <input
                    type="text"
                    placeholder="Search videos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="kd-search-input"
                />
            </div>

            {/* Filters */}
            <div className=" gap-2">
                <CustomSelect
                    value={orientation}
                    options={orientationOptions}
                    onChange={setOrientation}
                />
            </div>

            <div className="kd-popup-divider" />

            {/* Video Grid */}
            <div
                className="kd-asset-grid mt-2 overflow-y-auto kd-custom-scrollbar pb-6 flex-1 min-h-0"

            >
                {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <div
                            key={i}
                            className="w-full h-[150px] kd-add-image-card animate-pulse"
                        />
                    ))
                    : videos.map((video, index) => {
                        const videoSrc = getBestVideoSrc(video.video_files);

                        return (
                            <div
                                key={index}
                                className={`kd-add-image-card relative cursor-pointer ${orientation === "landscape"
                                    ? "min-h-24"
                                    : orientation === "portrait"
                                        ? "min-h-[200px]"
                                        : "min-h-[120px]"
                                    }`}
                                onClick={() => addVideo(videoSrc, video.height, video.width)}
                                draggable
                                onDragStart={(e) => setVideoDrag(e.dataTransfer, videoSrc)}
                            >

                                {video.image ? (
                                    <AssetThumb
                                        src={video.image}
                                        unoptimized
                                        alt="video thumbnail"
                                        className="w-full h-full object-cover p-1"
                                        width={500}
                                        height={500}
                                    />

                                ) : (
                                    <video
                                        src={videoSrc}
                                        muted
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                )}

                                {/* Duration badge */}
                                {video.duration > 0 && (
                                    <span
                                        style={{
                                            position: "absolute",
                                            bottom: 4,
                                            right: 6,
                                            background: "var(--kd-scrim)",
                                            color: "var(--kd-text-inverse)",
                                            fontSize: 10,
                                            borderRadius: 4,
                                            padding: "1px 5px",
                                        }}
                                    >
                                        {Math.floor(video.duration / 60)}:
                                        {String(video.duration % 60).padStart(2, "0")}
                                    </span>
                                )}

                                {/* Play icon overlay */}
                                <span
                                    style={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform: "translate(-50%,-50%)",
                                        fontSize: 22,
                                        opacity: 0.8,
                                        pointerEvents: "none",
                                    }}
                                >
                                    <KdVideoPlayBtnICon/>
                                </span>
                            </div>
                        );
                    })}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center me-1">
                <div className="flex gap-2">
                    <button
                        className="kd-btn kd-btn-ghost px-2 py-1"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    >
                        <FaArrowLeft size={16} />
                    </button>
                    <button
                        className="kd-btn kd-btn-ghost px-2 py-1"
                        onClick={() => setPage((p) => p + 1)}
                    >
                        <FaArrowRight size={16} />
                    </button>
                </div>
                <span className="text-sm kd-text-muted">Page {page}</span>
            </div>
        </div>
    );
};

export default PexelVideo;
