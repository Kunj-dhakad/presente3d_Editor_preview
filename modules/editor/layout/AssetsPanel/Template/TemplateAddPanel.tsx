"use client";
import React, { useEffect, useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import TemplatePreviewPanel from "./TemplatePreviewPanel";
import type { TemplateListItem } from "./types";
import {
  setImageDrag,
  setShapeDrag,
} from "@editor/layout/EditorCanvas/utils/dragPayloads";
import AssetThumb from "@editor/components/AssetThumb";

const TEMPLATE_BUCKET =
  "https://kdmeditor.s3.us-east-1.amazonaws.com/kd_videoeditor/files/templates";

const FALLBACK_TEMPLATES: TemplateListItem[] = [
  {
    id: -1,
    title: "Positive Parenting",
    template_category: "General",
    thumbnail_url: `${TEMPLATE_BUCKET}/positive_paranting.png`,
    json_url: `${TEMPLATE_BUCKET}/POSITIVE_PARENTING_.json`,
    json: "",
  },
  {
    id: -2,
    title: "Journey Beyond Borders",
    template_category: "General",
    thumbnail_url: `${TEMPLATE_BUCKET}/jorney_beyond_border.png`,
    json_url: `${TEMPLATE_BUCKET}/Journey_Beyond_Borders.json`,
    json: "",
  },
  {
    id: -3,
    title: "Growing Happy Kids",
    template_category: "General",
    thumbnail_url: `${TEMPLATE_BUCKET}/growing_happy_kids.png`,
    json_url: `${TEMPLATE_BUCKET}/Growing_Happy_kids_.json`,
    json: "",
  },
  {
    id: -4,
    title: "Little Explorer",
    template_category: "General",
    thumbnail_url: `${TEMPLATE_BUCKET}/LITTLE_EXPLORER.png`,
    json_url: `${TEMPLATE_BUCKET}/LITTLE_EXPLORER.json`,
    json: "",
  },
];

const TemplateAddPanel: React.FC<{ Addtype?: string }> = ({}) => {
  const [elements, setElements] = useState<TemplateListItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] =
    useState<TemplateListItem | null>(null);
  const token = useProjectInfoStore((s) => s.token);
  const api_url = useProjectInfoStore((s) => s.api_url);
  useEffect(() => {
    (async () => {
      try {
        const formData = new FormData();
        formData.append("access_token", token || "");
        formData.append("search_temp", search);

        const res = await fetch(`${api_url}sl_editor_template_listing`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          console.error("API Error:", res.status);
          setElements(FALLBACK_TEMPLATES);
          return;
        }

        const data = await res.json();
        const list = Array.isArray(data?.result) ? data.result : [];
        // The search term is sent to the API, so an empty result can simply
        // mean "no match" — only stand in for the catalogue itself.
        setElements(list.length ? list : FALLBACK_TEMPLATES);
      } catch (err) {
        console.error("Fetch failed:", err);
        setElements(FALLBACK_TEMPLATES);
      } finally {
        setLoading(false);
      }
    })();
  }, [api_url, search, token]);

  const filtered = useMemo(() => {
    return elements.filter((el) => {
      const s = el.title?.toLowerCase().includes(search.toLowerCase());
      const c =
        activeCategory === "All" || el.template_category === activeCategory;
      return s && c;
    });
  }, [elements, search, activeCategory]);

  // ========== DETAIL VIEW (after card click) ==========
  if (previewTemplate) {
    return (
      <TemplatePreviewPanel
        key={previewTemplate.id}
        template={previewTemplate}
        onBack={() => setPreviewTemplate(null)}
      />
    );
  }

  // ========== GRID VIEW ==========
  return (
    <div className="kd-element-panel">
      <div className="kd-panel-header">
        <span className="kd-panel-header-title">Templates</span>
      </div>
      <div className="kd-panel-divider" />

      {/* HEADER */}
      <div className="kd-panel-toolbar">
        {/* Search */}
        <div className="kd-search-box">
          <FaSearch className="kd-icon-text text-sm" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Templates..."
          />
        </div>
      </div>

      <div className="kd-panel-divider" />

      {/* CONTENT */}
      <div className="kd-panel-body kd-custom-scrollbar">
        {loading && (
          <div className="kd-asset-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="Kd-add-template-card aspect-square p-1">
                <div
                  className="w-full h-full animate-pulse"
                  style={{ borderRadius: 6, background: "var(--kd-accent-soft)" }}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="kd-asset-grid">
            {filtered.map((el) => (
              <button
                key={el.id}
                type="button"
                onClick={() => setPreviewTemplate(el)}
                aria-label={`Preview template ${el.title}`}
                title={el.title}
                draggable
                // One handler on the card, not one here and another on the
                // <img>: dragstart bubbles, so two handlers ran for a drag
                // started on the picture and the outer one overwrote the
                // inner one's payload, while a drag started on the card's
                // padding got a payload with no element kind at all.
                onDragStart={(e) => {
                  if (el.template_category === "Shapes") {
                    setShapeDrag(e.dataTransfer, el.thumbnail_url);
                  } else {
                    setImageDrag(e.dataTransfer, el.thumbnail_url);
                  }
                }}
                className="Kd-add-template-card p-1 flex items-center justify-center  cursor-pointer"
              >
                <AssetThumb
                  src={el.thumbnail_url}
                  alt={el.title}
                  width={64}
                  height={64}
                  unoptimized
                  draggable={false}
                  className="sobject-contain Kd-add-template-card-img"
                />
              </button>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div
            className="kd-panel-subtext"
            style={{ padding: "32px 0", textAlign: "center" }}
          >
            No templates found
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateAddPanel;
