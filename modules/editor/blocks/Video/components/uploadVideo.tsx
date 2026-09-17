import React, { useRef, useState, useEffect } from "react";
import useEditorStore from "@editor/store/editorStore";
import { setVideoDrag } from "@editor/layout/EditorCanvas/utils/dragPayloads";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash, faPlay } from "@fortawesome/free-solid-svg-icons";
import { KdMediaUpladIcon, KdMediaUploadLinkIcon } from "@editor/lib/icon/icons";
import { getCenteredMediaPlacement } from "@editor/layout/EditorCanvas/utils/mediaPlacement";
import AssetThumb from "@editor/components/AssetThumb";

interface UploadedVideo {
    id: string;
    image_url?: string;
    url?: string;
    thumbnail_url?: string;
    height?: number;
    width?: number;
}

const UploadVideo: React.FC<{ Addtype?: string }> = ({ Addtype }) => {
    const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [refreshlist, setRefreshlist] = useState(false);
    const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [videoUrlInput, setVideoUrlInput] = useState("");
    const [urlLoading, setUrlLoading] = useState(false);
    const [urlError, setUrlError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addElement = useEditorStore((s) => s.addElement);
    const selectedId = useEditorStore((s) => s.activeElementId);
    const updateElement = useEditorStore((s) => s.updateElement);
    const token = useProjectInfoStore((s) => s.token);
    const api_url = useProjectInfoStore((s) => s.api_url);
    // Selectors, not the whole store: this panel re-rendered on every edit.
    const slides = useEditorStore((s) => s.slides);
    const activeSlide = useEditorStore((s) => s.activeSlide);
    const canvasWidth = slides[activeSlide]?.width;
    const canvasHeight = slides[activeSlide]?.height;

    const addVideoToCanvas = (src: string, height: number, width: number) => {
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
            setListLoading(true);
            try {
                const formData = new FormData();
                formData.append("access_token", token || "");
                const res = await fetch(`${api_url}sl_editor_video_listing`, {
                    method: "POST",
                    body: formData,
                });

                const data = await res.json();
                setUploadedVideos(data?.result || []);
            } catch (err) {
                console.error("List Error:", err);
            } finally {
                setListLoading(false);
            }
        };

        fetchVideos();
    }, [token, api_url, refreshlist]);

    const uploadFile = async (file: File) => {
        if (!file.type.startsWith("video/")) {
            alert("Please upload a video file (mp4, webm, etc.)");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("video", file);
            formData.append("access_token", token || "");

            const res = await fetch(`${api_url}sl_editor_video_upload`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            console.log("Video Uploaded:", data);

            setRefreshlist((prev) => !prev);
        } catch (err) {
            console.error("Upload Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        uploadFile(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadFile(file);
        e.target.value = "";
    };

    // Image panel ki tarah: URL se seedha canvas par. Dimensions ke liye video ka
    // metadata probe karte hain — image wahan naya Image() se karta hai.
    const handleLoadFromUrl = () => {
        const url = videoUrlInput.trim();
        if (!url) return;

        setUrlLoading(true);
        setUrlError("");

        const probe = document.createElement("video");
        probe.preload = "metadata";
        probe.crossOrigin = "anonymous";

        probe.onloadedmetadata = () => {
            addVideoToCanvas(url, probe.videoHeight, probe.videoWidth);
            setVideoUrlInput("");
            setUrlLoading(false);
        };

        probe.onerror = () => {
            setUrlError("Ye video URL load nahi ho paaya.");
            setUrlLoading(false);
        };

        probe.src = url;
    };

    const deleteVideo = async (id: string) => {
        try {
            const formData = new FormData();
            formData.append("access_token", token || "");
            formData.append("video_id", id);

            await fetch(`${api_url}uploadVideoDelete`, {
                method: "POST",
                body: formData,
            });

            setRefreshlist((prev) => !prev);
        } catch (err) {
            console.error("Delete Error:", err);
        }
    };

    return (
        <div className="flex flex-col px-2">
            <div className="kd-media-upload-card">
                <div className="kd-media-upload-header">
                    {KdMediaUpladIcon(18, 18)}
                    <h3 className="kd-media-upload-title">Upload Video & URL</h3>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                     accept="video/mp4, video/webm, .mp4, .webm"
                    className="hidden"
                    onChange={handleUpload}
                />

                <p className="kd-media-upload-subtitle">
                    Upload a video or provide a video URL.
                </p>

                <div
                    className={`kd-media-upload-dropbox ${isDragOver ? "kd-media-upload-dragover" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <div className="kd-media-upload-main-icon">
                        {loading ? (
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        ) : (
                            KdMediaUpladIcon(30, 30)
                        )}
                    </div>

                    <p className="kd-media-upload-drop-text">
                        {loading ? "Uploading..." : "Drag & drop a video here"}
                    </p>

                    <p className="kd-media-upload-file-info">
                        MP4, WebM up to 10MB
                    </p>
                </div>

                <div className="kd-media-upload-divider">
                    <span />
                    <p>OR</p>
                    <span />
                </div>

                <div className="kd-media-upload-url-label">
                    <KdMediaUploadLinkIcon />
                    <label>Paste video URL</label>
                </div>

                <input
                    type="text"
                    className="kd-media-upload-url-input"
                    placeholder="https://example.com/video.mp4"
                    value={videoUrlInput}
                    onChange={(e) => {
                        setVideoUrlInput(e.target.value);
                        if (urlError) setUrlError("");
                    }}
                />

                {urlError && <p className="kd-media-upload-url-error">{urlError}</p>}

                <button
                    type="button"
                    className="kd-media-upload-load-btn"
                    onClick={handleLoadFromUrl}
                    disabled={!videoUrlInput.trim() || urlLoading}
                >
                    {urlLoading ? (
                        <>
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Loading...
                        </>
                    ) : (
                        "Load Video"
                    )}
                </button>
            </div>

            <div
                style={{
                    maxHeight:
                        Addtype === "replace"
                            ? "calc(100vh - 560px)"
                            : "calc(100vh - 480px)",
                }}
                className="kd-asset-grid mt-3 overflow-y-auto kd-custom-scrollbar"
            >
                {listLoading &&
                    Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="kd-media-upload-gallery-skeleton aspect-square animate-pulse"
                        />
                    ))}

                {!listLoading &&
                    uploadedVideos.map((item, index) => {
                        const thumb = item.image_url;
                        const videoUrl = item.url;
                        const video_height = item.height;
                        const video_width = item.width;

                        if (!videoUrl || !video_height || !video_width) return null;

                        return (
                            <div
                                key={index}
                                className="kd-media-upload-gallery-card aspect-square"
                                onClick={() => addVideoToCanvas(videoUrl, video_height, video_width)}
                                onMouseEnter={() => setHoveredVideo(item.id)}
                                onMouseLeave={() => setHoveredVideo(null)}
                                draggable
                                onDragStart={(e) => {
                                    setVideoDrag(e.dataTransfer, videoUrl);
                                }}
                            >
                                {hoveredVideo === item.id && (
                                    <button
                                        className="kd-media-upload-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteVideo(item.id);
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                )}

                                {thumb ? (
                                    <AssetThumb
                                        src={thumb}
                                        width={200}
                                        height={200}
                                        unoptimized
                                        className="w-full h-full object-cover"
                                        alt="video thumbnail"
                                    />
                                ) : (
                                    <video
                                        src={videoUrl}
                                        preload="metadata"
                                        className="w-full h-full object-cover"
                                        onLoadedMetadata={(e) => {
                                            (e.target as HTMLVideoElement).currentTime = 0.1;
                                        }}
                                    />
                                )}

                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 kd-fg-on-media text-lg opacity-85 pointer-events-none">
                                    <FontAwesomeIcon icon={faPlay} />
                                </span>
                            </div>
                        );
                    })}

                {!listLoading && uploadedVideos.length === 0 && (
                    <div className="col-span-2 text-center kd-panel-subtext py-8">
                        No videos uploaded yet
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadVideo;
