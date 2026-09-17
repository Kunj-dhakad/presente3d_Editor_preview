import React, { useRef, useState, useEffect } from "react";
import useEditorStore from "@editor/store/editorStore";
import { setImageDrag } from "@editor/layout/EditorCanvas/utils/dragPayloads";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { KdMediaUpladIcon, KdMediaUploadLinkIcon } from "@editor/lib/icon/icons";
import { getCenteredMediaPlacement } from "@editor/layout/EditorCanvas/utils/mediaPlacement";
import AssetThumb from "@editor/components/AssetThumb";

interface UploadedImage {
  id: string;
  image_url: string;
  thumbnail_url: string;
  height: string;
  width: string;
}

const UploadImage: React.FC<{ Addtype?: string }> = ({ Addtype }) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");

  const addElement = useEditorStore((s) => s.addElement);
  const [refreshlist, setRefreshlist] = useState(false);
  const token = useProjectInfoStore((s) => s.token);
  const api_url = useProjectInfoStore((s) => s.api_url);
  const selectedId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const [listLoading, setListLoading] = useState(true);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selectors, not the whole store: this panel re-rendered on every edit.
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const canvasWidth = slides[activeSlide]?.width;
  const canvasHeight = slides[activeSlide]?.height;

  const addImage = (src: string, height: number, width: number) => {
    const placement = getCenteredMediaPlacement(canvasWidth, canvasHeight, width, height);

    if (Addtype === "replace") {
      if (!selectedId) return;
      updateElement(selectedId, {
        src: src,
      });
      return;
    } else {
      addElement({
        type: "image",
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
        blur: 0,
        color: "transparent",
        fit: "cover",
        maxWidth: 300,
        maxHeight: 200,
        objectFit: "cover",
        contrast: 100,
        saturate: 100,
        brightness: 100,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
        transform: "none",
        isDragging: false,
        animationType: "None",
      });
    }
  };

  useEffect(() => {
    const fetchImages = async () => {
      setListLoading(true);

      try {
        const formData = new FormData();
        formData.append("access_token", token || "");

        const res = await fetch(`${api_url}sl_editor_listing`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        setUploadedImages(data?.result || []);
      } catch (err) {
        console.error("List Error:", err);
      } finally {
        setListLoading(false);
      }
    };

    fetchImages();
  }, [token, api_url, refreshlist]);

  const uploadFile = async (file: File) => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("access_token", token || "");

      const res = await fetch(`${api_url}sl_editor_image_upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Uploaded:", data);

      setRefreshlist((prev) => !prev);
    } catch (err) {
      console.error("Upload Error:", err);
    }

    setLoading(false);
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadFile(file);
    e.target.value = "";
  };

  const handleLoadFromUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    setUrlLoading(true);
    setUrlError("");

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      addImage(url, img.height, img.width);
      setImageUrlInput("");
      setUrlLoading(false);
    };
    img.onerror = () => {
      setUrlError("Ye image URL load nahi ho paaya.");
      setUrlLoading(false);
    };
    img.src = url;
  };

  const deleteImage = async (id: string) => {
    try {
      const formData = new FormData();
      formData.append("access_token", token || "");
      formData.append("image_id", id);

      await fetch(`${api_url}uploadImageDelete`, {
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
          <h3 className="kd-media-upload-title">Upload Image & URL</h3>
        </div>

        <div
          // onDrop={handleDrop}
          // onDragOver={handleDragOver}
          // onDragLeave={handleDragLeave}
          // onClick={() => fileInputRef.current?.click()}
        >

          <input
            ref={fileInputRef}
            type="file"
             accept="image/png, image/jpeg, image/webp, .png, .jpg, .jpeg, .webp"
            className="hidden"
            onChange={handleUpload}
          />
          <p className="kd-media-upload-subtitle">
            Upload an image or provide an image URL.
          </p>

          <div
            className={`kd-media-upload-dropbox ${isDragOver ? "kd-media-upload-dragover" : ""
              }`}
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
              {loading ? "Uploading..." : " Drag & drop an image here"}
            </p>

            <p className="kd-media-upload-file-info">
              JPG, PNG, WebP up to 10MB
            </p>
          </div>
        </div>

        <div className="kd-media-upload-divider">
          <span />
          <p>OR</p>
          <span />
        </div>

        <div className="kd-media-upload-url-label">
          <KdMediaUploadLinkIcon />
          <label>Paste image URL</label>
        </div>

        <input
          type="text"
          className="kd-media-upload-url-input"
          placeholder="https://example.com/image.jpg"
          value={imageUrlInput}
          onChange={(e) => {
            setImageUrlInput(e.target.value);
            if (urlError) setUrlError("");
          }}
        />

        {urlError && <p className="kd-media-upload-url-error">{urlError}</p>}

        <button
          type="button"
          className="kd-media-upload-load-btn"
          onClick={handleLoadFromUrl}
          disabled={!imageUrlInput.trim() || urlLoading}
        >
          {urlLoading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Loading...
            </>
          ) : (
            "Load Image"
          )}
        </button>
      </div>
      <div
        style={{
          maxHeight: Addtype === "replace" ? "calc(100vh - 560px)" : "calc(100vh - 480px)",
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
          uploadedImages.map((img, index) => (
            <div
              key={index}
              className="kd-media-upload-gallery-card aspect-square"
              onClick={() =>
                addImage(img.image_url, Number(img.height), Number(img.width))
              }
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
                width={200}
                height={200}
                alt="uploaded"
                unoptimized
                className="w-full h-full object-cover"
              />
            </div>
          ))}
      </div>
    </div>
  );
};

export default UploadImage;
