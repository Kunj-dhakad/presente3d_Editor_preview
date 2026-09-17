"use client";
import React, { useState } from "react";
// import { Upload, Image as ImageIcon, Sparkles } from "lucide-react";
import PexelImage from "./PexelImage";
import UploadImage from "./uploadImage";
// import AIImageReplace from "../imageReplace/AIImageReplace";
import AiImage from "./AiImage";
import { KdAiGenrateIcon, KDImageIcon, KdUploadArrowIcon } from "@editor/lib/icon/icons";

type PanelType = "upload" | "pexels" | "ai";

const AddImagePanel: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelType>("ai");

  return (
    <div className="kd-element-panel">

      <div className="kd-panel-header">
        <span className="kd-panel-header-title">Images</span>
      </div>

      <div className="kd-panel-divider" />

      <div className="kd-panel-toolbar grid grid-cols-3 gap-1">
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1 py-2 w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "ai" ? "active" : ""}`}
          onClick={() => setActivePanel("ai")}
        >
          <div className="kd-image-add-section-tap-btn-icon-1  h-[30px] w-[30px] flex items-center justify-center">
            <span className="flex items-center justify-center rounded-lg kd-tap-btn-icon-box">
              <KdAiGenrateIcon />
            </span>
          </div>
          <span className="text-center leading-tight">Generate AI <br /> Image</span>
        </div>

        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1  w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "upload" ? "active" : ""}`}
          onClick={() => setActivePanel("upload")}
        >
          <div className="kd-image-add-section-tap-btn-icon-2 h-[30px] w-[30px] flex items-center justify-center">
            <span className="flex items-center justify-center  rounded-lg kd-tap-btn-icon-box">
              <KdUploadArrowIcon />
            </span>
          </div>
          <span className="text-center leading-tight">Upload Image  <br /> & URL</span>
        </div>

        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1  w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "pexels" ? "active" : ""}`}
          onClick={() => setActivePanel("pexels")}
        >
          <div className="kd-image-add-section-tap-btn-icon-3  h-[30px] w-[30px] flex items-center justify-center">
            <span className="flex items-center justify-center rounded-lg kd-tap-btn-icon-box">
              <KDImageIcon />
            </span>
          </div>
          <span className="text-center leading-tight">Stock  <br /> Images</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {activePanel === "upload" && <UploadImage />}
        {activePanel === "pexels" && <PexelImage />}
        {activePanel === "ai" && <AiImage />}
      </div>
    </div>
  );
};

export default AddImagePanel;
