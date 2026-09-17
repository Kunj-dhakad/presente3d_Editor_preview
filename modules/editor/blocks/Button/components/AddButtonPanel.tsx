"use client";
import React from "react";
import useEditorStore from "@editor/store/editorStore";
import { ButtonData } from "@editor/store/editorStore";
import { setButtonDrag } from "@editor/layout/EditorCanvas/utils/dragPayloads";

const BUTTON_STYLES: {
  id: string;
  label: string;
  previewStyle: React.CSSProperties;
  data: Partial<ButtonData>;
}[] = [
    {
      id: "gradient-red-pill",
      label: "Gradient Red",
      previewStyle: {
        background: "linear-gradient(135deg, #c0392b, #e74c3c)",
        borderRadius: 999,
        color: "#fff",
        fontWeight: 700,
        border: "none",
      },
      data: {
        gradientFrom: "#c0392b",
        gradientTo: "#e74c3c",
        gradientDirection: "diagonal",
        backgroundColor: "#c0392b",
        textColor: "#ffffff",
        borderRadius: 999,
        fontWeight: 700,
        borderWidth: 0,
      },
    },
    {
      id: "dark-arrow-pill",
      label: "Dark Arrow",
      previewStyle: {
        background: "linear-gradient(135deg, #2c2c2c, #5a3e28)",
        borderRadius: 999,
        color: "#fff",
        fontWeight: 700,
        border: "none",
      },
      data: {
        gradientFrom: "#2c2c2c",
        gradientTo: "#5a3e28",
        gradientDirection: "diagonal",
        backgroundColor: "#2c2c2c",
        textColor: "#ffffff",
        borderRadius: 999,
        fontWeight: 700,
        icon: "↗",
        iconPosition: "right",
        borderWidth: 0,
      },
    },
    {
      id: "gradient-yellow",
      label: "Yellow Gradient",
      previewStyle: {
        background: "linear-gradient(135deg, #f39c12, #e67e22)",
        borderRadius: 999,
        color: "#fff",
        fontWeight: 700,
        border: "none",
      },
      data: {
        gradientFrom: "#f39c12",
        gradientTo: "#e67e22",
        gradientDirection: "diagonal",
        backgroundColor: "#f39c12",
        textColor: "#ffffff",
        borderRadius: 999,
        fontWeight: 700,
        icon: "↗",
        iconPosition: "right",
        borderWidth: 0,
      },
    },
    {
      id: "outline-orange",
      label: "Outline Orange",
      previewStyle: {
        background: "transparent",
        borderRadius: 999,
        color: "#e67e22",
        fontWeight: 600,
        border: "2px solid #e67e22",
      },
      data: {
        backgroundColor: "transparent",
        textColor: "#e67e22",
        borderRadius: 999,
        fontWeight: 600,
        icon: "+",
        iconPosition: "right",
        borderColor: "#e67e22",
        borderWidth: 2,
      },
    },
    {
      id: "solid-teal",
      label: "Teal + Icon",
      previewStyle: {
        background: "#1abc9c",
        borderRadius: 999,
        color: "#fff",
        fontWeight: 700,
        border: "none",
      },
      data: {
        backgroundColor: "#1abc9c",
        textColor: "#ffffff",
        borderRadius: 999,
        fontWeight: 700,
        icon: "+",
        iconPosition: "right",
        borderWidth: 0,
      },
    },
    {
      id: "solid-red-plus",
      label: "Red + Icon",
      previewStyle: {
        background: "#e74c3c",
        borderRadius: 999,
        color: "#fff",
        fontWeight: 700,
        border: "none",
      },
      data: {
        backgroundColor: "#e74c3c",
        textColor: "#ffffff",
        borderRadius: 999,
        fontWeight: 700,
        icon: "+",
        iconPosition: "right",
        borderWidth: 0,
      },
    },
    {
      id: "outline-black",
      label: "Outline Black",
      previewStyle: {
        background: "transparent",
        borderRadius: 8,
        color: "#222",
        fontWeight: 500,
        border: "1.5px solid #222",
      },
      data: {
        backgroundColor: "transparent",
        textColor: "#222222",
        borderRadius: 8,
        fontWeight: 500,
        icon: "+",
        iconPosition: "right",
        borderColor: "#222222",
        borderWidth: 2,
      },
    },
    {
      id: "dark-left-icon",
      label: "Dark Left Icon",
      previewStyle: {
        background: "#222",
        borderRadius: 999,
        color: "#fff",
        fontWeight: 600,
        border: "none",
      },
      data: {
        backgroundColor: "#222222",
        textColor: "#ffffff",
        borderRadius: 999,
        fontWeight: 600,
        icon: "›",
        iconPosition: "left",
        borderWidth: 0,
      },
    },
    {
      id: "gradient-blue",
      label: "Blue Gradient",
      previewStyle: {
        background: "linear-gradient(135deg, #2980b9, #6dd5fa)",
        borderRadius: 999,
        color: "#fff",
        fontWeight: 700,
        border: "none",
      },
      data: {
        gradientFrom: "#2980b9",
        gradientTo: "#6dd5fa",
        gradientDirection: "diagonal",
        backgroundColor: "#2980b9",
        textColor: "#ffffff",
        borderRadius: 999,
        fontWeight: 700,
        icon: "+",
        iconPosition: "right",
        borderWidth: 0,
      },
    },
    {
      id: "solid-dark-border",
      label: "Dark Border",
      previewStyle: {
        background: "#555",
        borderRadius: 6,
        color: "#fff",
        fontWeight: 600,
        border: "2px solid #888",
      },
      data: {
        backgroundColor: "#555555",
        textColor: "#ffffff",
        borderRadius: 6,
        fontWeight: 600,
        borderColor: "#888888",
        borderWidth: 2,
      },
    },
    {
      id: "gradient-purple",
      label: "Purple Gradient",
      previewStyle: {
        background: "linear-gradient(135deg, #8e44ad, #c39bd3)",
        borderRadius: 999,
        color: "#fff",
        fontWeight: 700,
        border: "none",
      },
      data: {
        gradientFrom: "#8e44ad",
        gradientTo: "#c39bd3",
        gradientDirection: "diagonal",
        backgroundColor: "#8e44ad",
        textColor: "#ffffff",
        borderRadius: 999,
        fontWeight: 700,
        icon: "+",
        iconPosition: "right",
        borderWidth: 0,
      },
    },
    {
      id: "solid-green",
      label: "Green Pill",
      previewStyle: {
        background: "#27ae60",
        borderRadius: 999,
        color: "#fff",
        fontWeight: 700,
        border: "none",
      },
      data: {
        backgroundColor: "#27ae60",
        textColor: "#ffffff",
        borderRadius: 999,
        fontWeight: 700,
        icon: "+",
        iconPosition: "right",
        borderWidth: 0,
      },
    },
    {
      id: "outline-purple",
      label: "Outline Purple",
      previewStyle: {
        background: "transparent",
        borderRadius: 999,
        color: "#8e44ad",
        fontWeight: 600,
        border: "2px solid #8e44ad",
      },
      data: {
        backgroundColor: "transparent",
        textColor: "#8e44ad",
        borderRadius: 999,
        fontWeight: 600,
        icon: "+",
        iconPosition: "right",
        borderColor: "#8e44ad",
        borderWidth: 2,
      },
    },
    {
      id: "solid-pink",
      label: "Hot Pink",
      previewStyle: {
        background: "#e91e8c",
        borderRadius: 6,
        color: "#fff",
        fontWeight: 700,
        border: "none",
      },
      data: {
        backgroundColor: "#e91e8c",
        textColor: "#ffffff",
        borderRadius: 6,
        fontWeight: 700,
        borderWidth: 0,
      },
    },
  ];

// ─── Component ────────────────────────────────────────────────────────────────
const AddButtonPanel = () => {
  const addElement = useEditorStore((s) => s.addElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);

  const slide = slides[activeSlide];
  const canvasW = slide?.width ?? 350;
  const canvasH = slide?.height ?? 490;

  const handleAdd = (style: (typeof BUTTON_STYLES)[0]) => {
    const btnData: ButtonData = {
      type: "button",
      text: "Read More",
      x: canvasW / 2 - 70,
      y: canvasH / 2 - 22,
      width: 140,
      height: 44,
      fontSize: 14,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      fontFamily: "Inter",
      buttonStyle: style.id,
      ...style.data,
    };
    addElement(btnData);
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    style: (typeof BUTTON_STYLES)[0]
  ) => {
    setButtonDrag(e.dataTransfer, style.id, style.data);
  };

  return (
    <div className="kd-btn-add-panel-container">
      <div className="mx-3 mt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="kd-toolPanel-heding-text">
            Buttons
          </span>
        </div>
        <div className="kd-toolPanel-hr-devide-border  mb-2" />

        <div className="text-xs  opacity-60 mb-3">
          Button styles
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 kd-btn-add-panel-scroll">
        {BUTTON_STYLES.map((style) => (
          <div
            key={style.id}
            draggable
            onClick={() => handleAdd(style)}
            onDragStart={(e) => handleDragStart(e, style)}
            className="kd-btn-Add-defult-card py-7 rounded-lg text-center cursor-grab  transition-all flex flex-col items-center gap-2"
          >
            <button
              style={{
                ...style.previewStyle,
                padding: "7px 14px",
                fontSize: 12,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
                whiteSpace: "nowrap",
              }}
            >
              {style.data.icon && style.data.iconPosition === "left" && (
                <span>{style.data.icon}</span>
              )}
              <span>Read More</span>
              {style.data.icon && style.data.iconPosition !== "left" && (
                <span>{style.data.icon}</span>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AddButtonPanel;