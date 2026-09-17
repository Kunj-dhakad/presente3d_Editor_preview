"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { FaSearch, FaArrowLeft } from "react-icons/fa";
import useEditorStore, { ElementData } from "@editor/store/editorStore";
import AssetThumb from "@editor/components/AssetThumb";

interface BookCoverItem {
  id: number;
  title: string;
  thumbnail_url: string;
  front_thumbnail?: string;
  back_thumbnail?: string;
  json_url: string;
  category: string;
}

const BOOK_COVERS: BookCoverItem[] = [
  {
    id: 1,
    title: "Chemistry of Life",
    thumbnail_url:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/ChemistryLife_Front.png",
    front_thumbnail:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/ChemistryLife_Front.png",
    back_thumbnail:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/ChemistryLife_Back.png",
    json_url:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/ChemistryLife.json",
    category: "Book Cover",
  },
  {
    id: 2,
    title: "Makeup Artist",
    thumbnail_url:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/Artist_Front.png",
    front_thumbnail:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/Artist_Front.png",
    back_thumbnail:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/Artist_Back.png",
    json_url:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/Artist.json",
    category: "Book Cover",
  },
  {
    id: 3,
    title: "Explaining Science",
    thumbnail_url:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/ExplainingScience_Front.png",
    front_thumbnail:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/ExplainingScience_Front.png",
    back_thumbnail:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/ExplainingScience_Back.png",
    json_url:
      "https://kd-presentation-editor.s3.dualstack.us-east-1.amazonaws.com/testing/BookCoverPage/ExplainingScience.json",
    category: "Book Cover",
  },
];

interface SlideElement {
  id: string;
  data: ElementData;
}

interface Slide {
  id: string;
  height: number;
  width: number;
  background: string;
  subtitle_url?: string;
  subtitle_text?: string;
  subtitle_json?: string;
  thumbnail?: string;
  elements: SlideElement[];
}

interface TemplateJson {
  slides: Slide[];
}

const BookCoverpage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedCover, setSelectedCover] = useState<BookCoverItem | null>(
    null,
  );
  const [frontSlide, setFrontSlide] = useState<Slide | null>(null);
  const [backSlide, setBackSlide] = useState<Slide | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<"front" | "back" | "both" | null>(
    null,
  );

  // Card click → load JSON & show both pages
  async function openCoverPreview(item: BookCoverItem) {
    try {
      setLoading(true);
      setSelectedCover(item);

      const res = await fetch(item.json_url);
      let json: TemplateJson | string = await res.json();

      if (typeof json === "string") {
        json = JSON.parse(json);
      }

      const modern = json as TemplateJson;

      if (!modern?.slides || modern.slides.length === 0) {
        console.error("Invalid template structure");
        return;
      }

      const slides = modern.slides;
      setFrontSlide(slides[0]);
      setBackSlide(slides[slides.length - 1]);
    } catch (err) {
      console.error("Error loading cover:", err);
      setSelectedCover(null);
    } finally {
      setLoading(false);
    }
  }

  // Apply only Front → first page
  function applyFront() {
    if (!frontSlide) return;
    setApplying("front");
    try {
      useEditorStore.getState().insertSlideAtStart(frontSlide);
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(null);
    }
  }

  // Apply only Back → last page
  function applyBack() {
    if (!backSlide) return;
    setApplying("back");
    try {
      useEditorStore.getState().insertSlideAtEnd(backSlide);
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(null);
    }
  }

  // Apply both together (first + last)
  function applyBoth() {
    if (!frontSlide || !backSlide) return;
    setApplying("both");
    try {
      useEditorStore.getState().applyBookCovers(frontSlide, backSlide);
      console.log("Both covers added (first + last)");
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(null);
    }
  }

  const filtered = useMemo(() => {
    return BOOK_COVERS.filter((el) =>
      el.title.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  // ========== PREVIEW VIEW (after card click) ==========
  if (selectedCover) {
    return (
      <div className="kd-element-panel w-full h-full px-2 flex flex-col overflow-hidden">
        {/* Header with back */}
        <div className="kd-panel-header">
          <button
            type="button"
            onClick={() => {
              setSelectedCover(null);
              setFrontSlide(null);
              setBackSlide(null);
            }}
            aria-label="Back to book covers"
            className="kd-icon-btn"
          >
            <FaArrowLeft className="text-xs" />
          </button>
          <span className="kd-panel-header-title">
            {selectedCover.title}
          </span>
        </div>

        <div className="kd-panel-divider" />

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 kd-bd-strong border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="kd-panel-body kd-custom-scrollbar flex flex-col">
            {/* Apply Both Button */}
            <button
              type="button"
              onClick={applyBoth}
              disabled={applying === "both"}
              className="kd-panel-btn-primary disabled:opacity-50"
              style={{ marginBottom: 16 }}
            >
              {applying === "both" ? "Applying..." : "Apply both pages"}
            </button>

            {/* Two Pages Preview */}
            <div className="kd-asset-grid">
              {/* FRONT PAGE */}
              <div
                onClick={applyFront}
                className={`Kd-add-template-card relative cursor-pointer p-1 ${
                  applying === "front" ? "opacity-70" : ""
                }`}
                style={
                  applying === "front"
                    ? { borderColor: "var(--kd-accent)" }
                    : undefined
                }
              >
                <AssetThumb
                  src={
                    selectedCover.front_thumbnail || selectedCover.thumbnail_url
                  }
                  alt="Front Cover"
                  width={160}
                  height={200}
                  unoptimized
                  className="w-full h-auto object-cover rounded-lg"
                />
                <div className="absolute bottom-0 left-0 right-0 kd-bg-scrim kd-fg-on-media text-[10px] text-center py-1">
                  Front • Click to add first
                </div>
                {applying === "front" && (
                  <div className="absolute inset-0 flex items-center justify-center kd-bg-scrim">
                    <div className="w-5 h-5 border-2 kd-bd-inverse border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* BACK PAGE */}
              <div
                onClick={applyBack}
                className={`Kd-add-template-card relative cursor-pointer p-1 ${
                  applying === "back" ? "opacity-70" : ""
                }`}
                style={
                  applying === "back"
                    ? { borderColor: "var(--kd-accent)" }
                    : undefined
                }
              >
                <AssetThumb
                  src={
                    selectedCover.back_thumbnail || selectedCover.thumbnail_url
                  }
                  alt="Back Cover"
                  width={160}
                  height={200}
                  unoptimized
                  className="w-full h-auto object-cover rounded-lg"
                />
                <div className="absolute bottom-0 left-0 right-0 kd-bg-scrim kd-fg-on-media text-[10px] text-center py-1">
                  Back • Click to add last
                </div>
                {applying === "back" && (
                  <div className="absolute inset-0 flex items-center justify-center kd-bg-scrim">
                    <div className="w-5 h-5 border-2 kd-bd-inverse border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== GRID VIEW ==========
  return (
    <div className="kd-element-panel">
      <div className="kd-panel-header">
        <span className="kd-panel-header-title">Book Cover Pages</span>
      </div>

      <div className="kd-panel-divider" />

      {/* Search */}
      <div className="kd-panel-toolbar">
        <div className="kd-search-box">
          <FaSearch className="kd-icon-text text-sm" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Book Covers..."
          />
        </div>
      </div>

      <div className="kd-panel-divider" />

      {/* Cards Grid */}
      <div className="kd-panel-body kd-custom-scrollbar">
        <div className="kd-asset-grid">
          {filtered.map((el) => (
            <div
              key={el.id}
              onClick={() => openCoverPreview(el)}
              className="Kd-add-template-card p-1 flex flex-col items-center justify-center cursor-pointer"
              title={el.title}
            >
              <Image
                src={el.thumbnail_url}
                alt={el.title}
                width={120}
                height={150}
                unoptimized
                className="object-contain Kd-add-template-card-img rounded"
              />
              <span className="text-xs mt-1 text-center line-clamp-2 px-1">
                {el.title}
              </span>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="kd-panel-subtext" style={{ padding: "32px 0", textAlign: "center" }}>
            No book covers found
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCoverpage;
