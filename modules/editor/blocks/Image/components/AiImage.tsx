"use client";
import React, { useEffect, useState } from "react";
import useEditorStore from "@editor/store/editorStore";
import { setImageDrag } from "@editor/layout/EditorCanvas/utils/dragPayloads";
import { KdAddVideoEmptyIcon, KdAiGenerateMagicIcon } from "@editor/lib/icon/icons";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import { getCenteredMediaPlacement } from "@editor/layout/EditorCanvas/utils/mediaPlacement";
import AssetThumb from "@editor/components/AssetThumb";

const MAX_PROMPT_LENGTH = 1000;

interface AiImages {
  id: string;
  image_url: string;
  thumbnail_url: string;
  height: number;
  width: number;
}

const AiImage: React.FC<{ Addtype?: string }> = ({ Addtype }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshlist, setRefreshlist] = useState(false);
  const [aiImages, setAiImages] = useState<AiImages[]>([]);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);

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

  const addImage = (src: string, height: number = 300, width: number = 300) => {
    const placement = getCenteredMediaPlacement(canvasWidth, canvasHeight, width, height);

    if (Addtype === "replace") {
      if (!selectedId) return;
      updateElement(selectedId, { src: src });
      return;
    } else {
      addElement({
        type: "image",
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
  };

  const generateAIImage = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("access_token", token || "");
      formData.append("prompt", prompt || "");

      const res = await fetch(`${api_url}sl_editor_Ai_generate_image`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      console.log("Generated Image:", data);

      if (Addtype === "replace") {
        addImage(data.image_url);
      } else {
        setRefreshlist((prev) => !prev);
      }
      setPrompt("");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const formData = new FormData();
        formData.append("access_token", token || "");
        const res = await fetch(`${api_url}sl_editor_Ai_generate_image_list`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        console.log("Image List:", data);

        setAiImages(data?.result || []);
      } catch (err) {
        console.error("List Error:", err);
      }
    };
    fetchImages();
  }, [api_url, refreshlist, token]);

  const deleteImage = async (id: string) => {
    try {
      const formData = new FormData();
      formData.append("access_token", token || "");
      formData.append("id", id);

      await fetch(`${api_url}aiGenerateImageDelete`, {
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
          placeholder="Describe your image (e.g. modern office, sunset view)"
          rows={3}
          className="w-full resize-none rounded-[10px] p-2 outline-none kd-ai-video-textarea"
        />

        <button
          onClick={generateAIImage}
          disabled={!prompt.trim() || loading}
          className="flex items-center justify-center gap-1 w-full py-2.5 rounded-lg text-[12px] font-semibold cursor-pointer disabled:cursor-not-allowed hover:opacity-90 kd-ai-video-generate-btn"
        >
          {loading ? (
            <FontAwesomeIcon className="animate-spin" icon={faSpinner} />
          ) : (
            <KdAiGenerateMagicIcon />
          )}
          {loading ? "Generating..." : "Generate Image"}
        </button>
      </div>

      {/* Generated Images */}
      {aiImages.length > 0 && (
        <div className="kd-ai-video-grid h-full overflow-y-auto kd-custom-scrollbar pb-1">
          {aiImages.map((img, index) => (
            <div
              key={img.id || index}
              className="kd-ai-video-card p-1 h-[60px] md:h-[110px] xl:h-[110px] 2xl:h-[110px]"
              onClick={() => addImage(img.image_url, img.height, img.width)}
              onMouseEnter={() => setHoveredImage(img.id)}
              onMouseLeave={() => setHoveredImage(null)}
              draggable
              onDragStart={(e) => setImageDrag(e.dataTransfer, img.image_url)}
            >
              {hoveredImage === img.id && (
                <button
                  className="kd-ai-video-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteImage(img.id);
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}

              <AssetThumb
                src={img.image_url}
                unoptimized
                alt="ai"
                width={300}
                height={300}
                className="object-cover w-full h-full"
              />
            </div>
          ))}
        </div>
      )}

      {/* History section */}
      {aiImages.length === 0 && (
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

export default AiImage;
