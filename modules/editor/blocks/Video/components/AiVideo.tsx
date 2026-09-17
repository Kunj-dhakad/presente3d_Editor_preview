"use client";

import React, { useEffect, useState } from "react";
import useEditorStore from "@editor/store/editorStore";
import { setImageDrag } from "@editor/layout/EditorCanvas/utils/dragPayloads";
import { Sparkles, SendHorizontal } from "lucide-react";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import { getCenteredMediaPlacement } from "@editor/layout/EditorCanvas/utils/mediaPlacement";
import AssetThumb from "@editor/components/AssetThumb";
interface AiImages {
  id: string;
  image_url: string;
  thumbnail_url: string;
  height: string;
  width: string;
}
const AiImage: React.FC<{ Addtype?: string }> = ({ Addtype }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshlist, setRefreshlist] = useState(false);
  const [aiImages, setAiImages] = useState<AiImages[]>([]);

  const addElement = useEditorStore((s) => s.addElement);
  const token = useProjectInfoStore((s) => s.token);
  const api_url = useProjectInfoStore((s) => s.api_url);
  const selectedId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  // Selectors, not the whole store: this panel re-rendered on every edit.
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const canvasWidth = slides[activeSlide]?.width;
  const canvasHeight = slides[activeSlide]?.height;

  const addImage = (src: string) => {
    const placement = getCenteredMediaPlacement(canvasWidth, canvasHeight, 300, 200);
    if (Addtype === "replace") {
      if (!selectedId) return;
      updateElement(selectedId, {
        src: src,
      });
      return;
    } else {
      addElement({
        type: "image",
        src: src,

        // Transform
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        rotation: 0,
        opacity: 1,
        zIndex: 1,

        // Border
        stroke: "",
        strokeWidth: 0,
        borderRadius: "0",

        // Shadow
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        color: "transparent",

        // Extra Image Properties
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

  }

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
        addImage(data.image_url)
      } else {
        setRefreshlist((prev) => !prev);
      }

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

      // list refresh
      setRefreshlist((prev) => !prev);

    } catch (err) {
      console.error("Delete Error:", err);
    }
  };
  return (
    <div className="w-full kd-bg-primery rounded-xl  px-2 kd-text-primery">
      <div className="kd-popup-divider mb-2" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="kd-icon-text" size={18} />
        <h3 className="text-sm font-semibold">AI Video Generator</h3>
      </div>

      <div className="kd-ai-generator-inputWrapper">
        <textarea
          rows={3}
          placeholder="Describe your image (e.g. modern office, sunset view)"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="kd-ai-generator-textarea kd-custom-scrollbar text-sm p-1"
        />

        <button
          onClick={generateAIImage}
          className="kd-ai-generator-sendBtn"
        >
          {loading ? (
            <FontAwesomeIcon className="animate-spin" icon={faSpinner} />
          ) : (
            <SendHorizontal size={18} />
          )}
        </button>

      </div>


      {/* Generated Images */}
      {aiImages.length > 0 && (
        
        <div 
         style={{ maxHeight: Addtype === "replace" ? "calc(100vh - 420px)" : "calc(100vh - 350px)" }}
        className="kd-asset-grid mt-2 pt-2 overflow-y-auto kd-custom-scrollbar">
          {aiImages.map((img, index) => (
            <div
              key={index}
              className="kd-add-image-card group"
              onClick={() => addImage(img.image_url)}
              onMouseEnter={() => setHoveredImage(img.id)}
              onMouseLeave={() => setHoveredImage(null)}
              draggable
              onDragStart={(e) => setImageDrag(e.dataTransfer, img.image_url)}
            >
              {hoveredImage === img.id && (
                <button
                  className="kd-media-upload-delete-btn"

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
    </div>
  );
};

export default AiImage;
