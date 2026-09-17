"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import { KdMediaUploadLinkIcon, KdMediaUpladIcon } from "@editor/lib/icon/icons";
import AssetThumb from "@editor/components/AssetThumb";

interface UploadedImage {
  id: string;
  image_url: string;
  thumbnail_url: string;
  height: string;
  width: string;
}

const BgUploadImage: React.FC<{ handleBackgroundSelect: (background: string) => void }> = ({ handleBackgroundSelect }) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshlist, setRefreshlist] = useState(false);
  const token = useProjectInfoStore((s) => s.token);
  const api_url = useProjectInfoStore((s) => s.api_url);
  const [listLoading, setListLoading] = useState(true);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = "";
  };

  const handleLoadFromUrl = async () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    setUrlLoading(true);
    try {
      handleBackgroundSelect(`url(${url}) center/cover no-repeat`);
      setImageUrlInput("");
    } catch (err) {
      console.error("URL Load Error:", err);
    } finally {
      setUrlLoading(false);
    }
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

  const ImageSkeleton = () => {
    return (
      <div className="kd-image-card p-2">
        <div className="w-full aspect-square kd-bg-tertiary rounded animate-pulse" />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full px-2">
      <div className="kd-media-upload-card shrink-0">
        <div className="kd-media-upload-header">
         {KdMediaUpladIcon(30, 30)}
          <h3 className="kd-media-upload-title">Upload Image & URL</h3>
        </div>

        <div>
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
              {loading ? "Uploading..." : "Drag & drop an image here"}
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
           accept="image/png, image/jpeg, image/webp, .png, .jpg, .jpeg, .webp"
          placeholder="https://example.com/image.jpg"
          value={imageUrlInput}
          onChange={(e) => setImageUrlInput(e.target.value)}
        />

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

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 pt-2 mt-2 overflow-y-auto kd-custom-scrollbar pr-2">
        {listLoading &&
          Array.from({ length: 6 }).map((_, i) => <ImageSkeleton key={i} />)}

        {!listLoading &&
          uploadedImages.map((img, index) => (
            <div
              key={index}
              className="kd-image-card relative overflow-hidden cursor-pointer h-32"
              onMouseEnter={() => setHoveredImage(img.id)}
              onMouseLeave={() => setHoveredImage(null)}
              onClick={() => handleBackgroundSelect(`url(${img.image_url}) center/cover no-repeat`)}
            >
              {hoveredImage === img.id && (
                <button
                  className="absolute top-2 right-2 kd-bg-danger kd-text-secondary text-xs p-0.5 rounded z-10"
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
                className="cursor-pointer rounded"
              />
            </div>
          ))}
      </div>
    </div>
  );
};

export default BgUploadImage;