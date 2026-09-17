import React, { useEffect, useState } from 'react';
import { createClient } from "@editor/lib/pexels-client";
import { FaArrowLeft, FaArrowRight, FaSearch } from 'react-icons/fa';
import useEditorStore from '@editor/store/editorStore';
import { setImageDrag } from '@editor/layout/EditorCanvas/utils/dragPayloads';
import CustomSelect from './CustomSelect';
import { getCenteredMediaPlacement } from '@editor/layout/EditorCanvas/utils/mediaPlacement';
import AssetThumb from "@editor/components/AssetThumb";
const client = createClient();


const orientationOptions = [
  { label: "Landscape", value: "landscape" },
  { label: "Portrait", value: "portrait" },
  { label: "Square", value: "square" },
];

const colorOptions = [
  { label: "All Colors", value: "" },
  { label: "Red", value: "red" },
  { label: "Orange", value: "orange" },
  { label: "Yellow", value: "yellow" },
  { label: "Pink", value: "pink" },
  { label: "Violet", value: "violet" },
  { label: "Blue", value: "blue" },
  { label: "Black", value: "black" },
];



interface PexelPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large: string;
    medium?: string;
    small?: string;
    [key: string]: string | undefined;
  };
  alt?: string | null;
}

const PexelImage: React.FC<{ Addtype?: string }> = ({ Addtype }) => {
  const [images, setImages] = useState<PexelPhoto[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [orientation, setOrientation] = useState<string>('landscape');
  const [imagecolor, setImagecolor] = useState<string>('');
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
  }

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const response = await client.photos.search({
          query: searchTerm || 'Nature',
          per_page: 20,
          orientation: orientation || '',
          color: imagecolor || '',
          page: page || 1,
        });
        if ('photos' in response) {
          setImages(response.photos);
        } else {
          console.error('Error fetching images:', response);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [searchTerm, orientation, imagecolor, page]);



  return (
    <div className="px-2 space-y-2 flex flex-col h-full">
      {/* Search */}
      <div className="kd-search-wrapper">
        <FaSearch className="kd-search-icon" />
        <input
          type="text"
          placeholder="Search images..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="kd-search-input"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <CustomSelect
          value={orientation}
          options={orientationOptions}
          onChange={setOrientation}
        />
        <CustomSelect
          value={imagecolor}
          options={colorOptions}
          onChange={setImagecolor}
        />
      </div>

      {/* Divider */}
      <div className="kd-popup-divider" />

      {/* Image Grid */}
      <div className="kd-asset-grid mt-2 overflow-y-auto kd-custom-scrollbar pb-6 flex-1 min-h-0"
      >
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="w-full h-[150px] kd-add-image-card animate-pulse"
            />
          ))
        ) : (
          images.map((image, index) => (
            <div
              key={index}
              className={`kd-add-image-card cursor-pointer ${orientation === "landscape"
                  ? "min-h-24"
                  : orientation === "portrait"
                    ? "min-h-[200px]"
                    : "min-h-[120px]" 
                }`}
              onClick={() => addImage(image.src.original, image.height, image.width)}
              draggable
              onDragStart={(e) => setImageDrag(e.dataTransfer, image.src.original)}
            >
              <AssetThumb
                unoptimized
                src={image.src.large}
                width={300}
                height={300}
                alt={image.alt || "pexels image"}
                className="w-full h-full object-cover p-1"
              />
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center me-1 ">
        <div className="flex gap-2 ">
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

        <span className="text-sm kd-text-muted">
          Page {page}
        </span>
      </div>

    </div>
  );

};

export default PexelImage;


