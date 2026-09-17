"use client";
import React, { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { ElementItem } from "@editor/layout/AssetsPanel/AddSection/Elements/types";
import { useElementLibrary } from "@editor/layout/AssetsPanel/AddSection/Elements/useElementLibrary";
import {
  AssetTileSkeletons,
  LibraryEmpty,
  LibraryError,
} from "@editor/layout/AssetsPanel/AddSection/Elements/LibraryStates";
import AssetThumb from "@editor/components/AssetThumb";

/** Items shown in a category's row before "See all" takes over. */
const ROW_SIZE = 3;

/** Module level, so a re-render does not remount every tile in the grid. */
function Tile({
  item,
  onInsert,
}: {
  item: ElementItem;
  onInsert: (item: ElementItem) => void;
}) {
  return (
    <button
      type="button"
      title={item.name}
      onClick={() => onInsert(item)}
      className="kd-asset-tile"
    >
      <AssetThumb
        src={item.svg_url}
        alt={item.name}
        width={56}
        height={56}
        unoptimized
        loading="lazy"
      />
    </button>
  );
}

export default function AllElements() {
  const [query, setQuery] = useState("");
  // Which category's own page is open; null means the browse view.
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const { items, status, retry } = useElementLibrary();

  const addElement = useEditorStore((s) => s.addElement);
  // Selectors, not the whole store — this panel re-rendered on every edit.
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const back = useEditorUIStore((s) => s.setActiveElementsCategory);
  const canvas = slides[activeSlide];

  const insert = (item: ElementItem) => {
    const size = 150;
    const placement = {
      x: Math.max(16, ((canvas?.width ?? size) - size) / 2),
      y: Math.max(16, ((canvas?.height ?? size) - size) / 2),
      width: size,
      height: size,
      opacity: 1,
      rotation: 0,
      zIndex: 1,
    };
    addElement(
      item.category === "Shapes"
        ? { type: "shape", shape: item.svg_code, ...placement }
        : {
            type: "svg",
            src: item.svg_url,
            ...placement,
            fit: "contain",
            isDragging: false,
            animationType: "None",
          },
    );
  };

  // Grouped in the order the API returned the categories. Declared up here
  // because the category page below returns early, and a hook cannot sit
  // behind a conditional return.
  const sections = useMemo(() => {
    const byCategory = new Map<string, ElementItem[]>();
    for (const item of items) {
      const list = byCategory.get(item.category);
      if (list) list.push(item);
      else byCategory.set(item.category, [item]);
    }
    return Array.from(byCategory, ([category, list]) => ({
      category,
      // Some rows come back with no category at all, which rendered a heading
      // with nothing in it.
      label: category?.trim() || "Other",
      list,
    }));
  }, [items]);

  /* ------------------------------------------------------------------ */
  /* One category's own page                                             */
  /* ------------------------------------------------------------------ */

  if (openCategory) {
    const needle = query.trim().toLowerCase();
    const inCategory = items.filter(
      (item) =>
        item.category === openCategory && item.name.toLowerCase().includes(needle),
    );

    return (
      <div className="kd-element-panel">
        <div className="kd-panel-header">
          <button
            type="button"
            // Back to the category list, not out of the library — leaving the
            // panel entirely is what the header arrow one level up does.
            onClick={() => {
              setOpenCategory(null);
              setQuery("");
            }}
            aria-label="Back to all elements"
            className="kd-icon-btn"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="kd-panel-header-title">
              {openCategory.trim() || "Other"}
            </h2>
            <p className="kd-panel-subtext">
              {inCategory.length} element{inCategory.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="kd-panel-divider" />

        <div className="kd-panel-toolbar">
          <label className="kd-search-box">
            <Search size={15} className="kd-icon-text" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${(openCategory.trim() || "other").toLowerCase()}...`}
            />
          </label>
        </div>

        <div className="kd-panel-body kd-asset-grid kd-asset-grid-3 kd-custom-scrollbar">
          {inCategory.map((item) => (
            <Tile key={item.id} item={item} onInsert={insert} />
          ))}

          {inCategory.length === 0 && (
            <LibraryEmpty message="No elements match your search" />
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Browse: a row per category                                          */
  /* ------------------------------------------------------------------ */

  const needle = query.trim().toLowerCase();

  const searchResults = needle
    ? items.filter((item) => item.name.toLowerCase().includes(needle))
    : [];

  return (
    <div className="kd-element-panel">
      <div className="kd-panel-header">
        <button
          type="button"
          onClick={() => back(null)}
          aria-label="Back to elements"
          className="kd-icon-btn"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="kd-panel-header-title">All Elements</h2>
          <p className="kd-panel-subtext">Elements / Complete Library</p>
        </div>
      </div>
      <div className="kd-panel-divider" />

      <div className="kd-panel-toolbar">
        <label className="kd-search-box">
          <Search size={15} className="kd-icon-text" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search elements..."
          />
        </label>
      </div>

      <div className="kd-panel-body kd-custom-scrollbar">
        {status === "loading" && (
          <div className="kd-asset-grid kd-asset-grid-3">
            <AssetTileSkeletons />
          </div>
        )}

        {status === "error" && <LibraryError onRetry={retry} />}

        {/* A search spans every category, so it drops the sections and just
            lists what matched. */}
        {status === "ready" && needle && (
          <div className="kd-asset-grid kd-asset-grid-3">
            {searchResults.map((item) => (
              <Tile key={item.id} item={item} onInsert={insert} />
            ))}
            {searchResults.length === 0 && (
              <LibraryEmpty message="No elements match your search" />
            )}
          </div>
        )}

        {status === "ready" && !needle && (
          <>
            {sections.map(({ category, label, list }) => (
              <section key={category || label} className="kd-el-section">
                {/* Layout in utilities as well as the class, so the row keeps
                    its title and action side by side either way. */}
                <header className="kd-el-section-head flex items-center justify-between gap-2">
                  <h3 className="kd-el-section-title min-w-0 truncate">{label}</h3>
                  {list.length > ROW_SIZE && (
                    <button
                      type="button"
                      onClick={() => setOpenCategory(category)}
                      className="kd-el-section-more shrink-0 flex items-center gap-0.5"
                    >
                      See all
                      <ChevronRight size={13} />
                    </button>
                  )}
                </header>

                <div className="kd-asset-grid kd-asset-grid-3">
                  {list.slice(0, ROW_SIZE).map((item) => (
                    <Tile key={item.id} item={item} onInsert={insert} />
                  ))}
                </div>
              </section>
            ))}

            {sections.length === 0 && <LibraryEmpty message="No elements yet" />}
          </>
        )}
      </div>
    </div>
  );
}
