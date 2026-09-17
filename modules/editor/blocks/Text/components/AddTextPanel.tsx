"use client";
import React, { useEffect, useState } from "react";
import useEditorStore, { DEFAULT_TEXT_COLOR } from "@editor/store/editorStore";
import { addBookIndex } from "@editor/lib/bookIndex";
import Image from "next/image";
import BookIndexStyleGallery from "@editor/blocks/Index/components/BookIndexStyleGallery";
import { TOC_STYLE_PRESETS, TocStyleKey } from "@editor/blocks/Index/lib/tocStyles";
import {
  setTextDrag,
  setTextTemplateDrag,
} from "@editor/layout/EditorCanvas/utils/dragPayloads";
import { addTextTemplateAtPoint } from "./textTemplate";
import { fetchLibrary } from "@editor/lib/data/libraryCache";
type TextPresetKey = "text-h1" | "text-h2" | "text-h3" | "text-p";

type TextPreset = {
  text: string;
  fontSize: number;
  fontWeight: number | string;
  lineHeight?: number;
  fontStyle?: "normal" | "italic";
  width: number;
  height: number;
};

const TEXT_PRESETS: Record<TextPresetKey, TextPreset> = {
  "text-h1": {
    text: "Add a heading",
    fontSize: 36,
    fontWeight: 600,
    width: 255,
    height: 50,
  },
  "text-h2": {
    text: "Add a subheading",
    fontSize: 24,
    fontWeight: 600,
    width: 215,
    height: 44,
  },
  "text-h3": {
    text: "Add a body text",
    fontSize: 16,
    fontWeight: 500,
    width: 135,
    height: 43,
  },
  "text-p": {
    text: "Start writing your paragraph here…",
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.6,
    width: 210,
    height: 40,
  },
};

type DefaultStyleCardProps = {
  label: string;
  dragType: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, type: string) => void;
};

const DefaultStyleCard: React.FC<DefaultStyleCardProps> = ({
  label,
  dragType,
  style,
  onClick,
  onDragStart,
}) => {
  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={(e) => onDragStart(e, dragType)}
      className="kd-text-Add-defult-card flex flex-col items-center mt-1 justify-center gap-1 p-3"
    >
      <span style={style}>{label}</span>
    </div>
  );
};

interface TextTemplate {
  id: number;
  thumbnail_url: string;
  json_url: string;
  category: string | null;
  create_at: string;
  update_at: string;
}


const AddTextPanel = () => {
  const addElement = useEditorStore((s) => s.addElement);
  // Selectors, not the whole store: this panel re-rendered on every edit.
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);

  const canvasWidth = slides[activeSlide]?.width;
  const canvasHeight = slides[activeSlide]?.height;
  const defaultX = canvasWidth ? canvasWidth / 2 : 100;
  const defaultY = canvasHeight ? canvasHeight / 2 : 100;

  const [templates, setTemplates] = useState<TextTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [panelView, setPanelView] = useState<"list" | "index-styles">("list");

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    type: string,
    sample?: string,
  ) => {
    setTextDrag(e.dataTransfer, type, sample);
  };

  const addTextByType = (type: TextPresetKey) => {
    const preset = TEXT_PRESETS[type];
    addElement({
      type: "text",
      x: defaultX - preset.width / 2,
      y: defaultY - preset.height / 2,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      fontFamily: "Plus Jakarta Sans",
      textAlign: "left",
      lineHeight: 1.2,
      letterSpacing: 0,
      color: DEFAULT_TEXT_COLOR,
      ...preset,
    });
  };

  const addChapter = () =>
    addElement({
      type: "text",
      bookRole: "chapter",
      text: "Chapter title",
      chapterSubtitle: "",
      chapterAutoNumber: true,
      x: defaultX - 135,
      y: 32,
      width: 270,
      height: 70,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      fontFamily: "Plus Jakarta Sans",
      fontSize: 30,
      fontWeight: 700,
      lineHeight: 1.2,
      textAlign: "left",
      letterSpacing: 0,
      color: DEFAULT_TEXT_COLOR,
    });

  const addTextByTemplate = (template: TextTemplate) =>
    addTextTemplateAtPoint(template.json_url, defaultX, defaultY);

  useEffect(() => {
    const getTemplates = async () => {
      try {
        setLoading(true);

        // Cached: panel har baar khulne par ye list dobara nahi aati.
        const result = await fetchLibrary<unknown>("/api/TextTemplate");

        // The route answers with an error object rather than a list when the
        // database is unreachable, and `.map` over that throws.
        setTemplates(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error(" Error fetching text templates:", error);
      } finally {
        setLoading(false);
      }
    };

    getTemplates();
  }, []);

  if (panelView === "index-styles") {
    return (
      <BookIndexStyleGallery
        onBack={() => setPanelView("list")}
        onSelect={(styleKey) => {
          addBookIndex(styleKey);
          setPanelView("list");
        }}
      />
    );
  }

  return (
    <div className="kd-text-add-panel-container">
      <div className="kd-text-add-panel-fixed">
        <div className="flex items-center justify-between mb-3">
          <span className="kd-toolPanel-heding-text">Text</span>
        </div>
        <div className="w-full kd-toolPanel-hr-devide-border mb-2" />

        {/* <p className="kd-toolPanel-sub-heding-text pt-2">Default Text Styles</p> */}

        <div className="kd-default-styles-list">
          <DefaultStyleCard
            label="📖 Chapter"
            dragType="book-chapter"
            style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "Plus Jakarta Sans",
            }}
            onClick={addChapter}
            onDragStart={handleDragStart}
          />
          <DefaultStyleCard
            label="Book Index"
            dragType="book-index"
            style={{
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "Plus Jakarta Sans",
            }}
            onClick={() => setPanelView("index-styles")}
            onDragStart={handleDragStart}
          />
          <DefaultStyleCard
            label="Add Heading"
            dragType="text-h1"
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "Plus Jakarta Sans",
            }}
            onClick={() => addTextByType("text-h1")}
            onDragStart={handleDragStart}
          />
          <DefaultStyleCard
            label="Add Sub Heading"
            dragType="text-h2"
            style={{
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "Plus Jakarta Sans",
            }}
            onClick={() => addTextByType("text-h2")}
            onDragStart={handleDragStart}
          />
          <DefaultStyleCard
            label="Add Body Text"
            dragType="text-p"
            style={{
              fontSize: 13,
              fontWeight: 400,
              fontFamily: "Playpen Sans",
            }}
            onClick={() => addTextByType("text-h3")}
            onDragStart={handleDragStart}
          />
          <DefaultStyleCard
            label="paragraph"
            dragType="text-h3"
            style={{
              fontSize: 12,
              fontWeight: 400,
              fontFamily: "Plus Jakarta Sans",
            }}
            onClick={() => addTextByType("text-p")}
            onDragStart={handleDragStart}
          />
        </div>
        <div className="w-full kd-toolPanel-hr-devide-border mt-5   mb-2" />
      </div>
      <div className="kd-text-add-panel-scroll">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse kd-text-add-panel-card rounded-lg overflow-hidden"
              >
                <div className="w-full h-32 kd-text-add-panel-card" />
              </div>
            ))}
          </div>
        ) : templates.length > 0 ? (
          <div className="kd-text-add-panel-scroll">
            <div className="grid grid-cols-2 gap-4">
              {templates.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => setTextTemplateDrag(e.dataTransfer, card.json_url)}
                  className="kd-text-add-panel-card flex flex-col items-center justify-center gap-1 p-3"
                  onClick={() => addTextByTemplate(card)}
                >
                  <Image
                    src={card.thumbnail_url}
                    unoptimized
                    width={500}
                    height={500}
                    alt="Picture of the author"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-sm kd-fg-muted">
            No templates found
          </div>
        )}
      </div>
    </div>
  );
};

export default AddTextPanel;
