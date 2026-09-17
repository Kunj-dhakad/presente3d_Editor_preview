"use client";

import React, { lazy, Suspense } from "react";
import {
  BarChart3,
  Frame,
  Grid2X2,
  ImageIcon,
  QrCode,
  Shapes,
  Sticker,
  Table2,
} from "lucide-react";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { ElementsCategory } from "./types";
import { AssetTileSkeletons } from "./LibraryStates";

/** Stand-in with the same shape as a library panel while its chunk loads. */
function LibrarySkeleton() {
  return (
    <div className="kd-element-panel">
      <div className="kd-panel-header">
        <div className="kd-skeleton" style={{ width: 28, height: 28, borderRadius: "var(--kd-r-xs)" }} />
        <div className="kd-skeleton" style={{ width: 120, height: 16, borderRadius: "var(--kd-r-xs)" }} />
      </div>
      <div className="kd-panel-divider" />
      <div className="kd-panel-toolbar">
        <div className="kd-skeleton" style={{ height: 32, borderRadius: "var(--kd-r-sm)" }} />
      </div>
      <div className="kd-panel-body kd-asset-grid kd-asset-grid-3">
        <AssetTileSkeletons />
      </div>
    </div>
  );
}

const AllElements = lazy(() => import("./AllElements"));
const ShapesLibrary = lazy(
  () => import("@editor/blocks/Shape/components"),
);
const FramesLibrary = lazy(
  () => import("@editor/blocks/Frame/components"),
);
const QRCodeLibrary = lazy(
  () => import("@editor/blocks/QRCode/components"),
);
const GifsLibrary = lazy(() => import("@editor/blocks/GIF/components"));
const StickersLibrary = lazy(
  () => import("@editor/blocks/Sticker/components"),
);
const TableDataLibrary = lazy(
  () => import("@editor/blocks/Table/components"),
);
const ChartsLibrary = lazy(
  () => import("@editor/blocks/Chart/components"),
);

const cards: {
  id: ElementsCategory;
  title: string;
  caption: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "all",
    title: "All Elements",
    caption: "Browse every asset",
    icon: <Grid2X2 size={22} />,
  },
  {
    id: "shapes",
    title: "Shapes",
    caption: "Lines, icons & graphics",
    icon: <Shapes size={22} />,
  },
  {
    id: "frames",
    title: "Frames",
    caption: "Mask images into shapes",
    icon: <Frame size={22} />,
  },
  {
    id: "qrcode",
    title: "QR Code",
    caption: "Link to a page or text",
    icon: <QrCode size={22} />,
  },
  {
    id: "gifs",
    title: "GIFs",
    caption: "Animated media",
    icon: <ImageIcon size={22} />,
  },
  {
    id: "stickers",
    title: "Stickers",
    caption: "Decorative stickers",
    icon: <Sticker size={22} />,
  },
  {
    id: "table",
    title: "Table Data",
    caption: "Custom tables",
    icon: <Table2 size={22} />,
  },
  {
    id: "charts",
    title: "Charts",
    caption: "Visualize data",
    icon: <BarChart3 size={22} />,
  },
];

const libraries: Record<
  ElementsCategory,
  React.LazyExoticComponent<React.ComponentType>
> = {
  all: AllElements,
  shapes: ShapesLibrary,
  frames: FramesLibrary,
  qrcode: QRCodeLibrary,
  gifs: GifsLibrary,
  stickers: StickersLibrary,
  table: TableDataLibrary,
  charts: ChartsLibrary,
};

export default function Elements() {
  const activeCategory = useEditorUIStore(
    (s) => s.activeElementsCategory,
  ) as ElementsCategory | null;
  const setActiveCategory = useEditorUIStore(
    (s) => s.setActiveElementsCategory,
  );
  if (!activeCategory)
    return (
      <div className="kd-element-panel">
        <div className="kd-panel-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <h2 className="kd-panel-header-title">Elements</h2>
          <p className="kd-panel-subtext">Choose what you want to add</p>
        </div>
        <div className="kd-panel-divider" />
        <div className="kd-panel-body kd-asset-grid kd-custom-scrollbar">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveCategory(card.id)}
              className="kd-element-card group p-3 text-left cursor-pointer"
            >
              <span
                className="mb-3 inline-flex p-2"
                style={{
                  borderRadius: "var(--kd-r-sm)",
                  background: "var(--kd-accent-soft)",
                  color: "var(--kd-accent)",
                }}
              >
                {card.icon}
              </span>
              <span
                className="block font-semibold"
                style={{ fontSize: "var(--kd-fs-md)", color: "var(--kd-text)" }}
              >
                {card.title}
              </span>
              <span className="mt-1 block kd-panel-subtext">{card.caption}</span>
            </button>
          ))}
        </div>
      </div>
    );
  const Library = libraries[activeCategory];
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <Library />
    </Suspense>
  );
}
