"use client";
import React, { useState } from "react";
// import { Upload, Image as ImageIcon, Sparkles } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import PexelImage from "@editor/blocks/Image/components/PexelImage";
import UploadImage from "@editor/blocks/Image/components/uploadImage";
import Image from "next/image";
import AiImage from "@editor/blocks/Image/components/AiImage";
import { KdAiGenrateIcon, KDImageIcon, KdUploadArrowIcon } from "@editor/lib/icon/icons";

type PanelType = "upload" | "pexels" | "ai";
// interface CardProps {
//   title: string;
//   icon: React.ElementType;
//   value: PanelType;
//   active: boolean;
//   onClick: (value: PanelType) => void;
// }

// const OptionCard: React.FC<CardProps> = ({
//   title,
//   icon: Icon,
//   value,
//   active,
//   onClick,
// }) => {
//   return (
//     <button
//       onClick={() => onClick(value)}
//       className={`
//         kd-btn
//         px-2 py-1
//         flex items-center gap-2
//         text-sm
//         transition
//         ${active
//           ? "kd-btn-active"
//           : ""
//         }
//       `}
//     >
//       <Icon size={16} />
//       {title}
//     </button>
//   );
// };

/* ---------------- MAIN PANEL ---------------- */

const ImageReplacePanel: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelType>("upload");

  const activeElementData = useEditorStore((state) => {
    const slide = state.slides[state.activeSlide];
    if (!slide || !state.activeElementId) return null;
    return slide.elements.find(
      (el) => el.id === state.activeElementId
    )?.data;
  });

  const activeImage =
    activeElementData?.type === "image" ? activeElementData.src : "";
  return (
    // <div className="h-full">

    //   <div className="flex px-2 pt-2 overflow-hidden">
    //     <div className="flex-1 h-32 kd-replace-preview relative flex items-center justify-center overflow-hidden">
    //       {activeImage && (
    //         <Image
    //           src={activeImage}
    //           alt="preview"
    //           fill
    //           unoptimized
    //           className="object-cover p-2 rounded-2xl"
    //         />
    //       )}
    //     </div>

    //     {/* <div className="flex flex-col gap-2 w-32 ps-2">
    //       <OptionCard
    //         title="Upload"
    //         icon={Upload}
    //         value="upload"
    //         active={activePanel === "upload"}
    //         onClick={setActivePanel}
    //       />
    //       <OptionCard
    //         title="Pexels"
    //         icon={ImageIcon}
    //         value="pexels"
    //         active={activePanel === "pexels"}
    //         onClick={setActivePanel}
    //       />
    //       <OptionCard
    //         title="AI Image"
    //         icon={Sparkles}
    //         value="ai"
    //         active={activePanel === "ai"}
    //         onClick={setActivePanel}
    //       />
    //     </div> */}

    //   </div>

    //   <div className="grid grid-cols-3 gap-1 p-2 mb-1">
    //     <div
    //       className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1 py-2 w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "ai" ? "active" : ""}`}
    //       onClick={() => setActivePanel("ai")}
    //     >
    //       <div className="kd-image-add-section-tap-btn-icon-1  h-[30px] w-[30px] flex items-center justify-center">
    //         <span className="flex items-center justify-center rounded-lg kd-tap-btn-icon-box">
    //           <KdAiGenrateIcon />
    //         </span>
    //       </div>
    //       <span className="text-center leading-tight">Generate AI <br /> Image</span>
    //     </div>

    //     <div
    //       className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1  w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "upload" ? "active" : ""}`}
    //       onClick={() => setActivePanel("upload")}
    //     >
    //       <div className="kd-image-add-section-tap-btn-icon-2 h-[30px] w-[30px] flex items-center justify-center">
    //         <span className="flex items-center justify-center  rounded-lg kd-tap-btn-icon-box">
    //           <KdUploadArrowIcon />
    //         </span>
    //       </div>
    //       <span className="text-center leading-tight">Upload Image  <br /> & URL</span>
    //     </div>

    //     <div
    //       className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1  w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "pexels" ? "active" : ""}`}
    //       onClick={() => setActivePanel("pexels")}
    //     >
    //       <div className="kd-image-add-section-tap-btn-icon-3  h-[30px] w-[30px] flex items-center justify-center">
    //         <span className="flex items-center justify-center rounded-lg kd-tap-btn-icon-box">
    //           <KDImageIcon />
    //         </span>
    //       </div>
    //       <span className="text-center leading-tight">Stock  <br /> Images</span>
    //     </div>
    //   </div>



    //   <div className="mt-2  overflow-y-auto">
    //     {activePanel === "upload" && <UploadImage Addtype="replace" />}
    //     {activePanel === "pexels" && <PexelImage Addtype="replace" />}
    //     {activePanel === "ai" && <AiImage Addtype="replace" />}
    //   </div>

    // </div>

    <div className="h-full flex flex-col">

      <div className="shrink-0">
        <div className="flex px-2 pt-2 overflow-hidden">
          <div className="flex-1 h-32 kd-replace-preview relative flex items-center justify-center overflow-hidden">
            {activeImage && (
              <Image
                src={activeImage}
                alt="preview"
                fill
                unoptimized
                className="object-contain p-2 rounded-2xl"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 p-2 mb-1">
          <div
            className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1 py-2 w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "ai" ? "active" : ""}`}
            onClick={() => setActivePanel("ai")}
          >
            <div className="kd-image-add-section-tap-btn-icon-1 h-[30px] w-[30px] flex items-center justify-center">
              <span className="flex items-center justify-center rounded-lg kd-tap-btn-icon-box">
                <KdAiGenrateIcon />
              </span>
            </div>
            <span className="text-center leading-tight">Generate AI <br /> Image</span>
          </div>

          <div
            className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1 w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "upload" ? "active" : ""}`}
            onClick={() => setActivePanel("upload")}
          >
            <div className="kd-image-add-section-tap-btn-icon-2 h-[30px] w-[30px] flex items-center justify-center">
              <span className="flex items-center justify-center rounded-lg kd-tap-btn-icon-box">
                <KdUploadArrowIcon />
              </span>
            </div>
            <span className="text-center leading-tight">Upload Image <br /> & URL</span>
          </div>

          <div
            className={`flex flex-col items-center justify-center gap-2 rounded-xl px-1 w-full cursor-pointer transition-all kd-image-add-section-tap-btn ${activePanel === "pexels" ? "active" : ""}`}
            onClick={() => setActivePanel("pexels")}
          >
            <div className="kd-image-add-section-tap-btn-icon-3 h-[30px] w-[30px] flex items-center justify-center">
              <span className="flex items-center justify-center rounded-lg kd-tap-btn-icon-box">
                <KDImageIcon />
              </span>
            </div>
            <span className="text-center leading-tight">Stock <br /> Images</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activePanel === "upload" && <UploadImage Addtype="replace" />}
        {activePanel === "pexels" && <PexelImage Addtype="replace" />}
        {activePanel === "ai" && <AiImage Addtype="replace" />}
      </div>

    </div>
  );

};

export default ImageReplacePanel;
