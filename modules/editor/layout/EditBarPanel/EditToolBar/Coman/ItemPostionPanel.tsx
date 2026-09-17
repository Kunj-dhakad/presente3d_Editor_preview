"use client";
import React from "react";
import {
  kdIconPosition_Forward,
  kdIconPosition_Backward,
  kdIconPosition_ToFront,
  kdIconPosition_ToBack,
  kdIconPosition_Top,
  kdIconPosition_Left,
  kdIconPosition_Middle,
  kdIconPosition_Center,
  kdIconPosition_Bottom,
  kdIconPosition_Right,
} from "@editor/lib/icon/icons";

import useEditorStore, { Transform } from "@editor/store/editorStore";
type NumericField = "width" | "height" | "x" | "y" | "rotation";
type ElementPatch = Partial<Transform>;
interface ActionBtnProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const ActionBtn = ({ icon: Icon, label, onClick, disabled }: ActionBtnProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="kd-item-position-btn flex items-center justify-center gap-2 px-3 py-2  w-full"
  >
    <Icon size={15} />
    <span>{label}</span>
  </button>
);

interface AlignBtnProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const AlignBtn = ({ icon: Icon, label, onClick, disabled }: AlignBtnProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="kd-item-position-btn flex items-center justify-center gap-2 px-3 py-2  w-full"
    title={label}
  >
    <Icon size={15} />
    <span>{label}</span>
  </button>
);

interface InputFieldProps {
  label: string;
  field: NumericField;
  value?: number;
  onChange: (field: NumericField, value: string) => void;
}


const InputField = ({ label, field, value, onChange }: InputFieldProps) => (
  <div className="kdIconPosition-input-field flex items-center overflow-hidden">
    <div className="kdIconPosition-input-label h-full px-3 flex items-center justify-center">
      {label}
    </div>
 
    <input
      type="number"
      className="kdIconPosition-input-value w-full h-full py-2 text-center outline-none"
      value={value !== undefined ? Math.round(value) : ""}
      placeholder="--"
      onChange={(e) => onChange(field, e.target.value)}
    />
  </div>
 
);
interface PositionPanelProps {
  onClose?: () => void;
}

export default function ItemPostionPanel({ }: PositionPanelProps) {

  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const bringForward = useEditorStore((s) => s.bringForward);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendBackward = useEditorStore((s) => s.sendBackward);
  const sendToBack = useEditorStore((s) => s.sendToBack);

  const slide = slides[activeSlide];
  const activeElement = slide?.elements.find((el) => el.id === activeElementId);
  const data = activeElement?.data;

  const slideWidth = slide?.width ?? 346;
  const slideHeight = slide?.height ?? 490;
  const noElement = !activeElementId;

  const handleAlign = (type: string) => {
    if (!activeElementId || !data) return;
    const w = data.width ?? 100;
    const h = data.height ?? 100;

    const patches: Record<string, ElementPatch> = {
      top: { y: 0 },
      middle: { y: (slideHeight - h) / 2 },
      bottom: { y: slideHeight - h },
      left: { x: 0 },
      center: { x: (slideWidth - w) / 2 },
      right: { x: slideWidth - w },
    };

    if (patches[type]) {
      updateElement(activeElementId, patches[type], { history: true });
    }
  };

  const handleNumberChange = (field: NumericField, value: string) => {
    if (!activeElementId || !data) return;
    const num = parseFloat(value);
    if (isNaN(num)) return;

    if (field === "width" && data.width && data.height) {
      const ratio = data.height / data.width;
      const patch: ElementPatch = { width: num, height: Math.round(num * ratio) };
      updateElement(activeElementId, patch, { history: true });
    } else if (field === "height" && data.width && data.height) {
      const ratio = data.width / data.height;
      const patch: ElementPatch = { height: num, width: Math.round(num * ratio) };
      updateElement(activeElementId, patch, { history: true });
    } else {
      const patch: ElementPatch = { [field]: num };
      updateElement(activeElementId, patch, { history: true });
    }
  };

  return (
    <div className="p-3 w-full flex flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="kd-item-position-heading-text ">Position</span>
      </div>
      <>
        <div className="grid grid-cols-2 gap-2 ">
          <ActionBtn icon={kdIconPosition_Forward} label="Forward" disabled={noElement} onClick={() => activeElementId && bringForward(activeElementId)} />
          <ActionBtn icon={kdIconPosition_Backward} label="Backward" disabled={noElement} onClick={() => activeElementId && sendBackward(activeElementId)} />
          <ActionBtn icon={kdIconPosition_ToFront} label="To front" disabled={noElement} onClick={() => activeElementId && bringToFront(activeElementId)} />
          <ActionBtn icon={kdIconPosition_ToBack} label="To back" disabled={noElement} onClick={() => activeElementId && sendToBack(activeElementId)} />
        </div>

        <div>
          <p className="kd-item-position-heading-text mb-2">Align to page</p>
          <div className="grid grid-cols-2 gap-2">
            <AlignBtn icon={kdIconPosition_Top} label="Top" disabled={noElement} onClick={() => handleAlign("top")} />
            <AlignBtn icon={kdIconPosition_Left} label="Left" disabled={noElement} onClick={() => handleAlign("left")} />
            <AlignBtn icon={kdIconPosition_Middle} label="Middle" disabled={noElement} onClick={() => handleAlign("middle")} />
            <AlignBtn icon={kdIconPosition_Center} label="Center" disabled={noElement} onClick={() => handleAlign("center")} />
            <AlignBtn icon={kdIconPosition_Bottom} label="Bottom" disabled={noElement} onClick={() => handleAlign("bottom")} />
            <AlignBtn icon={kdIconPosition_Right} label="Right" disabled={noElement} onClick={() => handleAlign("right")} />
          </div>
        </div>


        <div>
          <p className="kd-item-position-heading-text mb-2">Advanced</p>
          <div className="mt-3">
            <div className="grid grid-cols-2 gap-2 mb-1.5">
              <InputField
                label="W"
                field="width"
                value={data?.width}
                onChange={handleNumberChange}
              />
              <InputField
                label="H"
                field="height"
                value={data?.height}
                onChange={handleNumberChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-x-[7px]">
              <InputField
                label="X"
                field="x"
                value={data?.x}
                onChange={handleNumberChange}
              />
              <InputField
                label="Y"
                field="y"
                value={data?.y}
                onChange={handleNumberChange}
              />
            </div>
          </div>
        </div>
      </>



    </div>
  );
}