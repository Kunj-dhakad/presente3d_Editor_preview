"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { KdAddVideoEmptyIcon, KdAiGenerateMagicIcon, KdVideoPlayBtnICon } from "@editor/lib/icon/icons";
import useEditorStore from "@editor/store/editorStore";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import { getCenteredMediaPlacement } from "@editor/layout/EditorCanvas/utils/mediaPlacement";
import { setVideoDrag } from "@editor/layout/EditorCanvas/utils/dragPayloads";
const MAX_PROMPT_LENGTH = 1000;

interface AiVideoItem {
    id: string;
    url: string;
    thumbnail_url: string;
    image_url: string;
    height: number;
    width: number;
    status?: string;
}

const POLL_INTERVAL = 5000;

const AiGenerateVideo: React.FC<{ Addtype?: string }> = ({ Addtype }) => {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [refreshlist, setRefreshlist] = useState(false);
    const [aiVideos, setAiVideos] = useState<AiVideoItem[]>([]);
    const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);

    // tracks video_ids that are still pending/processing -> need polling
    const [pendingIds, setPendingIds] = useState<string[]>([]);
    const lastInsertIdRef = useRef<string | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const addElement = useEditorStore((s) => s.addElement);
    const token = useProjectInfoStore((s) => s.token);
    const api_url = useProjectInfoStore((s) => s.api_url);
    const selectedId = useEditorStore((s) => s.activeElementId);
    const updateElement = useEditorStore((s) => s.updateElement);

    // Selectors, not the whole store: this panel re-rendered on every edit.
    const slides = useEditorStore((s) => s.slides);
    const activeSlide = useEditorStore((s) => s.activeSlide);
    const canvasWidth = slides[activeSlide]?.width;
    const canvasHeight = slides[activeSlide]?.height;

    /* ---------------- ADD VIDEO TO CANVAS ---------------- */
    const addVideo = useCallback(
        (src: string, height: number = 300, width: number = 300) => {
            const placement = getCenteredMediaPlacement(canvasWidth, canvasHeight, width, height);

            if (Addtype === "replace") {
                if (!selectedId) return;
                updateElement(selectedId, {
                    src: src,
                });
                return;
            } else {
                addElement({
                    type: "video",
                    src: src,
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
                    blur: 0,
                    color: "transparent",
                    fit: "cover",
                    maxWidth: 300,
                    maxHeight: 200,
                    objectFit: "cover",
                    contrast: 100,
                    hueRotate: 0,
                    saturate: 100,
                    grayscale: 0,
                    sepia: 0,
                    brightness: 100,
                    transform: "none",
                    isDragging: false,
                    animationType: "None",
                });
            }
        },
        [Addtype, selectedId, updateElement, addElement, canvasWidth, canvasHeight]
    );

    const generateAIVideo = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);

        try {
            const formData = new FormData();
            formData.append("access_token", token || "");
            formData.append("keyword", prompt || "");

            const res = await fetch(`${api_url}sl_editor_ai_video_generate`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            console.log("Generate Triggered:", data);

            const videoId = data?.["1"] ?? data?.video_id ?? data?.result?.video_id;
            const insertId = data?.last_insert_id ?? data?.result?.last_insert_id ?? videoId;

            if (videoId != null) {
                const videoIdStr = String(videoId);
                lastInsertIdRef.current = insertId != null ? String(insertId) : null;
                setPendingIds((prev) => (prev.includes(videoIdStr) ? prev : [...prev, videoIdStr]));
            }

            setRefreshlist((prev) => !prev);
            setPrompt("");
        } catch (err) {
            console.error(err);
        }
        setIsGenerating(false);
    };

    const pollVideoStatus = useCallback(
        async (videoId: string) => {
            try {
                const formData = new FormData();
                formData.append("access_token", token || "");
                formData.append("video_id", videoId);
                if (lastInsertIdRef.current) {
                    formData.append("last_insert_id", lastInsertIdRef.current);
                }

                const res = await fetch(`${api_url}sl_editor_get_ai_video_generate`, {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                console.log("Poll Status:", videoId, data);

                const status = data?.status || data?.result?.status;

                if (status === "completed" || status === "done" || status === 1) {
                    setPendingIds((prev) => prev.filter((id) => id !== videoId));
                    setRefreshlist((prev) => !prev);

                    if (Addtype === "replace") {
                        const videoUrl = data?.video_url || data?.result?.video_url;
                        if (videoUrl) addVideo(videoUrl);
                    }
                } else if (status === "failed" || status === "error" || status === 0) {
                    setPendingIds((prev) => prev.filter((id) => id !== videoId));
                    setRefreshlist((prev) => !prev);
                }
            } catch (err) {
                console.error("Poll Error:", err);
            }
        },
        [token, api_url, Addtype, addVideo]
    );



    useEffect(() => {
        const fetchVideoList = async () => {
            try {
                const formData = new FormData();
                formData.append("access_token", token || "");

                const res = await fetch(
                    `${api_url}sl_editor_get_ai_video_generate_list`,
                    {
                        method: "POST",
                        body: formData,
                    }
                );

                const data = await res.json();
                console.log("Video List:", data);

                const list: AiVideoItem[] = data?.result || [];
                setAiVideos(list);

                const stillPending = list
                    .filter(
                        (v) => v.status === "pending" || v.status === "processing"
                    )
                    .map((v) => v.id);

                setPendingIds((prev) => {
                    const merged = Array.from(
                        new Set([...prev, ...stillPending])
                    );

                    return merged.filter(
                        (id) =>
                            stillPending.includes(id) ||
                            !list.find((v) => v.id === id)
                    );
                });
            } catch (err) {
                console.error("List Error:", err);
            }
        };

        fetchVideoList();
    }, [token, api_url, refreshlist]);

    useEffect(() => {
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }

        if (pendingIds.length === 0) return;

        pollTimerRef.current = setInterval(() => {
            pendingIds.forEach((id) => pollVideoStatus(id));
        }, POLL_INTERVAL);

        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, [pendingIds, pollVideoStatus]);

    /* ---------------- DELETE ---------------- */
    const deleteVideo = async (id: string) => {
        try {
            const formData = new FormData();
            formData.append("access_token", token || "");
            formData.append("id", id);

            await fetch(`${api_url}ai-generate-video-delete`, {
                method: "POST",
                body: formData,
            });

            setRefreshlist((prev) => !prev);
        } catch (err) {
            console.error("Delete Error:", err);
        }
    };

    return (
        <div className="flex flex-col h-full p-2 gap-4">
            {/* Prompt section */}
            <div className="flex flex-col gap-2 kd-ai-video-textArea-box p-3">
                <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold kd-ai-video-label">Enter Your Prompt</span>
                    <span className="text-[11px] font-normal kd-ai-video-count">
                        {prompt.length}/{MAX_PROMPT_LENGTH}
                    </span>
                </div>

                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    maxLength={MAX_PROMPT_LENGTH}
                    placeholder="Describe the video you want to create..."
                    rows={3}
                    className="w-full resize-none rounded-[10px] p-2 outline-none kd-ai-video-textarea"
                />

                <button
                    onClick={generateAIVideo}
                    disabled={!prompt.trim() || isGenerating}
                    className="flex items-center justify-center gap-1 w-full py-2.5 rounded-lg text-[12px] font-semibold cursor-pointer disabled:cursor-not-allowed hover:opacity-90 kd-ai-video-generate-btn"
                >
                    <KdAiGenerateMagicIcon />
                    {isGenerating ? "Generating..." : "Generate Video"}
                </button>
            </div>

            {/* Generated Videos */}
    
            {aiVideos.length > 0 && (
                <div className="kd-ai-video-grid h-full overflow-y-auto kd-custom-scrollbar pb-1">
                    {aiVideos.map((vid, index) => {
                        const isPending = vid.status === "pending" || vid.status === "processing";

                        return (
                            <div
                                key={vid.id || index}
                                className="kd-ai-video-card p-1 h-[60px] md:h-[110px] xl:h-[110px] 2xl:h-[110px]"
                                onClick={() => {
                                    if (isPending) return;
                                    addVideo(vid.url, vid.height, vid.width);
                                }}
                                onMouseEnter={(e) => {
                                    setHoveredVideo(vid.id);
                                    if (!isPending) e.currentTarget.querySelector("video")?.play();
                                }}
                                onMouseLeave={(e) => {
                                    setHoveredVideo(null);
                                    const v = e.currentTarget.querySelector("video");
                                    if (v) {
                                        v.pause();
                                        v.currentTime = 0;
                                    }
                                }}
                                draggable={!isPending}
                                onDragStart={(e) => {
                                    if (isPending) return;
                                    setVideoDrag(e.dataTransfer, vid.url);
                                }}
                            >
                                {hoveredVideo === vid.id && !isPending && (
                                    <button
                                        className="kd-ai-video-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteVideo(vid.id);
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                )}

                                {isPending ? (
                                    <div className="kd-ai-video-pending">
                                        <FontAwesomeIcon className="animate-spin" icon={faSpinner} />
                                        <span>Generating...</span>
                                    </div>
                                ) : (
                                    <>
                                        <video
                                            src={vid.url}
                                            poster={vid.image_url}
                                            muted
                                            loop
                                            playsInline
                                        />
                                        <div className="kd-ai-video-play-overlay">
                                            <KdVideoPlayBtnICon/>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {/* History section */}
            {aiVideos.length === 0 && (
                <div className="flex flex-col gap-2 flex-1 h-28 min-h-0">
                    <span className=" kd-ai-video-label">History</span>

                    <div className="flex-1 flex flex-col items-center justify-center gap-2.5 rounded-xl px-4 py-8 min-h-24 kd-ai-video-history-empty">
                        <KdAddVideoEmptyIcon />
                        <span className="text-xs text-center font-normal kd-ai-video-history-empty-text">
                            There are no recent History.
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiGenerateVideo;
