"use client";
import React, { useState } from "react";


import PexelVideo from "./PexelVideo";
import AddVideoLink from "./AddYoutubeLink";
import UploadVideo from "./uploadVideo";
import { KdAiGenrateIcon, KDImageIcon, KdUploadArrowIcon } from "@editor/lib/icon/icons";
import AiGenerateVideo from "./AiGenerateVideo";

type PanelType = "upload" | "pexels" | "ai" | "YoutubeLink";

const AddImagePanel: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelType>("ai");
  return (
    <div className="kd-element-panel">

      <div className="kd-panel-header">
        <span className="kd-panel-header-title">Videos</span>
      </div>

      <div className="kd-panel-divider" />

      <div className="kd-panel-toolbar grid grid-cols-3 gap-1">
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1 py-2 w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "ai" ? "active" : ""}`}
          onClick={() => setActivePanel("ai")}
        >
          <div className="kd-image-add-section-tap-btn-icon-1  h-[30px] w-[30px] flex items-center justify-center">
            <span className="flex items-center justify-center  rounded-lg kd-tap-btn-icon-box">
              <KdAiGenrateIcon />
            </span>
          </div>
          <span className="text-center leading-tight">Generate AI <br /> Video</span>
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
          <span className="text-center leading-tight">Upload Video  <br /> & URL</span>
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
          <span className="text-center leading-tight">Stock  <br /> Videos</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {activePanel === "upload" && <UploadVideo />}
        {activePanel === "pexels" && <PexelVideo />}
        {activePanel === "ai" && <AiGenerateVideo />}
        {activePanel === "YoutubeLink" && <AddVideoLink />}
      </div>
    </div>
  );
};

export default AddImagePanel;
