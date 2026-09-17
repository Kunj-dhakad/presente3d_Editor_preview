"use client";
import React, { useState } from "react";
import { Upload, Image as ImageIcon, Sparkles } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
// import Image from "next/image";
import AddYoutubeLink from "@editor/blocks/Video/components/AddYoutubeLink";
import PexelVideo from "@editor/blocks/Video/components/PexelVideo";
import UploadVideo from "@editor/blocks/Video/components/uploadVideo";

type PanelType = "upload" | "pexels" | "ai";

interface CardProps {
  title: string;
  icon: React.ElementType;
  value: PanelType;
  active: boolean;
  onClick: (value: PanelType) => void;
}

/* ---------------- OPTION CARD ---------------- */

const OptionCard: React.FC<CardProps> = ({
  title,
  icon: Icon,
  value,
  active,
  onClick,
}) => {
  return (
    <button
      onClick={() => onClick(value)}
      className={`
        kd-btn
        px-2 py-1
        flex items-center gap-2
        text-sm
        transition
        ${active
          ? "kd-btn-active"
          : ""
        }
      `}
    >
      <Icon size={16} />
      {title}
    </button>
  );
};

/* ---------------- MAIN PANEL ---------------- */

const VideoReplacePanel: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelType>("upload");

  const activeElementData = useEditorStore((state) => {
    const slide = state.slides[state.activeSlide];
    if (!slide || !state.activeElementId) return null;
    return slide.elements.find(
      (el) => el.id === state.activeElementId
    )?.data;
  });

  const activeImage =
    activeElementData?.type === "video" ? activeElementData.src : "";
  return (
    <div >

      <div className="flex px-2 pt-2">
        <div className="flex-1 kd-replace-preview relative flex items-center justify-center overflow-hidden">
          {activeImage && (
            <video
              src={activeImage}
              className="object-contain"
            />
          )}
        </div>

        <div className="flex flex-col gap-2 w-32 ps-2">
          <OptionCard
            title="Upload"
            icon={Upload}
            value="upload"
            active={activePanel === "upload"}
            onClick={setActivePanel}
          />
          <OptionCard
            title="Pexels"
            icon={ImageIcon}
            value="pexels"
            active={activePanel === "pexels"}
            onClick={setActivePanel}
          />
          <OptionCard
            title="Link"
            icon={Sparkles}
            value="ai"
            active={activePanel === "ai"}
            onClick={setActivePanel}
          />
        </div>

      </div>


      <div className="min-h-[400px] mt-2">
        {activePanel === "upload" && <UploadVideo Addtype="replace" />}
        {activePanel === "pexels" && <PexelVideo Addtype="replace" />}
        {activePanel === "ai" && <AddYoutubeLink Addtype="replace" />}
      </div>

    </div>
  );

};

export default VideoReplacePanel;
