"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
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
        setListLoading(false); // ✅ stop skeleton
      }
    };

    fetchImages();
  }, [token, api_url, refreshlist]);



  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); // VERY IMPORTANT
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

  const ImageSkeleton = () => {
    return (
      <div className="kd-image-card p-2">
        <div className="w-full aspect-square kd-bg-tertiary  rounded animate-pulse" />
      </div>
    );
  };



  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      setRefreshlist(true);
    } catch (err) {
      console.error("Upload Error:", err);
    }

    setLoading(false);
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

      // list refresh
      setRefreshlist((prev) => !prev);

    } catch (err) {
      console.error("Delete Error:", err);
    }
  };








  /* IMAGE LIST API */
  return (
    <div className="">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="kd-upload-box">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <div className="kd-upload-inner">
          {!loading ? <span className="text-xs kd-text-primary">
            Click or drop image here
          </span>
            : (
              <span className="text-xm kd-text-primary animate-pulse">
                Uploading..<FontAwesomeIcon className="animate-spin" icon={faSpinner} />
              </span>
            )}
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3 max-h-80 pt-2 mt-2 overflow-y-auto custom-scrollbar">

        {/* Skeleton Loading */}
        {listLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <ImageSkeleton key={i} />
          ))}

        {/* Real Images */}
        {!listLoading &&
          uploadedImages.map((img, index) => (
            <div
              key={index}
              className="kd-image-card overflow-hidden cursor-pointer"
               onMouseEnter={() => setHoveredImage(img.id)}
              onMouseLeave={() => setHoveredImage(null)}
              onClick={() => handleBackgroundSelect(`url(${img.image_url}) center/cover no-repeat`)}
            >


              {hoveredImage === img.id && (
                <button
                  className="absolute top-2 right-2  kd-bg-danger kd-text-secondary text-xs p-0.5 rounded z-10"
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
