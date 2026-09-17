"use client";
import React, { useState } from "react";
import {
  BringToFront,
  SendToBack,
  ChevronUp,
  ChevronDown,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  AlignCenterHorizontal,
  Lock,
  Unlock,
  X,
} from "lucide-react";
import useEditorStore, { Transform } from "@editor/store/editorStore";

type Tab = "Arrange" | "Layers";
type NumericField = "width" | "height" | "x" | "y" | "rotation";
type ElementPatch = Partial<Transform>;

// ✅ Fix 1: All sub-components declared OUTSIDE the main component
// to avoid "Cannot create components during render" error

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
    className="kd-btn flex items-center gap-2 px-3 py-2 text-xs w-full"
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
    className="kd-btn flex items-center gap-2 px-3 py-2 text-xs w-full"
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
  <div className="flex flex-col gap-0.5">
    <span className="kd-text-muted text-[10px] uppercase tracking-wide">
      {label}
    </span>
    <input
      type="number"
      className="kd-input w-full text-xs px-2 py-1 rounded text-center"
      value={value !== undefined ? Math.round(value) : ""}
      placeholder="--"
      onChange={(e) => onChange(field, e.target.value)}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

interface PositionPanelProps {
  onClose?: () => void;
}

export default function PositionPanel({ onClose }: PositionPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Arrange");
  const [ratioLocked, setRatioLocked] = useState(false);

  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const bringForward = useEditorStore((s) => s.bringForward);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendBackward = useEditorStore((s) => s.sendBackward);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const setActiveElementId = useEditorStore((s) => s.setActiveElementId);

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
      top:    { y: 0 },
      middle: { y: (slideHeight - h) / 2 },
      bottom: { y: slideHeight - h },
      left:   { x: 0 },
      center: { x: (slideWidth - w) / 2 },
      right:  { x: slideWidth - w },
    };

    if (patches[type]) {
      updateElement(activeElementId, patches[type], { history: true });
    }
  };

  // ✅ Fix 2: Using Partial<Transform> instead of `as any`
  const handleNumberChange = (field: NumericField, value: string) => {
    if (!activeElementId || !data) return;
    const num = parseFloat(value);
    if (isNaN(num)) return;

    if (field === "width" && ratioLocked && data.width && data.height) {
      const ratio = data.height / data.width;
      const patch: ElementPatch = { width: num, height: Math.round(num * ratio) };
      updateElement(activeElementId, patch, { history: true });
    } else if (field === "height" && ratioLocked && data.width && data.height) {
      const ratio = data.width / data.height;
      const patch: ElementPatch = { height: num, width: Math.round(num * ratio) };
      updateElement(activeElementId, patch, { history: true });
    } else {
      const patch: ElementPatch = { [field]: num };
      updateElement(activeElementId, patch, { history: true });
    }
  };

  return (
    <div className="kd-popup-main-container p-3 w-[220px] flex flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="kd-text-primary font-semibold text-sm">Position</span>
        {onClose && (
          <button onClick={onClose} className="kd-btn p-1">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b kd-border-primary">
        {(["Arrange", "Layers"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 pb-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "kd-text-accent border-b-2 border-(--kd-accent)"
                : "kd-text-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── ARRANGE TAB ── */}
      {activeTab === "Arrange" && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <ActionBtn icon={ChevronUp}    label="Forward"  disabled={noElement} onClick={() => activeElementId && bringForward(activeElementId)} />
            <ActionBtn icon={ChevronDown}  label="Backward" disabled={noElement} onClick={() => activeElementId && sendBackward(activeElementId)} />
            <ActionBtn icon={BringToFront} label="To front" disabled={noElement} onClick={() => activeElementId && bringToFront(activeElementId)} />
            <ActionBtn icon={SendToBack}   label="To back"  disabled={noElement} onClick={() => activeElementId && sendToBack(activeElementId)} />
          </div>

          <div className="kd-popup-divider" />

          <div>
            <p className="kd-text-primary text-xs font-semibold mb-2">Align to page</p>
            <div className="grid grid-cols-2 gap-1.5">
              <AlignBtn icon={AlignStartHorizontal}  label="Top"    disabled={noElement} onClick={() => handleAlign("top")} />
              <AlignBtn icon={AlignStartVertical}    label="Left"   disabled={noElement} onClick={() => handleAlign("left")} />
              <AlignBtn icon={AlignCenterHorizontal} label="Middle" disabled={noElement} onClick={() => handleAlign("middle")} />
              <AlignBtn icon={AlignCenterVertical}   label="Center" disabled={noElement} onClick={() => handleAlign("center")} />
              <AlignBtn icon={AlignEndHorizontal}    label="Bottom" disabled={noElement} onClick={() => handleAlign("bottom")} />
              <AlignBtn icon={AlignEndVertical}      label="Right"  disabled={noElement} onClick={() => handleAlign("right")} />
            </div>
          </div>

          <div className="kd-popup-divider" />

          <div>
            <p className="kd-text-primary text-xs font-semibold mb-2">Advanced</p>

            {/* Width / Height / Ratio */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <InputField label="Width"  field="width"  value={data?.width}  onChange={handleNumberChange} />
              <InputField label="Height" field="height" value={data?.height} onChange={handleNumberChange} />
              <div className="flex flex-col gap-0.5">
                <span className="kd-text-muted text-[10px] uppercase tracking-wide">Ratio</span>
                <button
                  onClick={() => setRatioLocked(!ratioLocked)}
                  className={`kd-btn w-full py-1 flex items-center justify-center ${ratioLocked ? "kd-btn-active" : ""}`}
                  title={ratioLocked ? "Unlock ratio" : "Lock ratio"}
                >
                  {ratioLocked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
              </div>
            </div>

            {/* X / Y */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <InputField label="X" field="x" value={data?.x} onChange={handleNumberChange} />
              <InputField label="Y" field="y" value={data?.y} onChange={handleNumberChange} />
            </div>

            {/* Rotation */}
            <div className="grid grid-cols-2 gap-1.5">
              <InputField label="Rotate" field="rotation" value={data?.rotation} onChange={handleNumberChange} />
            </div>
          </div>
        </>
      )}

      {/* ── LAYERS TAB ── */}
      {activeTab === "Layers" && (
        <div className="flex flex-col gap-1">
          <p className="kd-text-muted text-[11px] mb-1">All elements</p>
          {(slide?.elements.length ?? 0) === 0 && (
            <p className="kd-text-muted text-xs text-center py-4">No elements on this slide</p>
          )}
          {[...(slide?.elements ?? [])].reverse().map((el, i) => {
            const isActive = el.id === activeElementId;
            const labelMap: Record<string, string> = {
              text: "Text", image: "Image", button: "Button",
              shape: "Shape", video: "Video", svg: "SVG",
            };
            return (
              <button
                key={el.id}
                onClick={() => setActiveElementId(el.id)}
                className={`kd-btn flex items-center gap-2 px-2 py-1.5 text-xs w-full text-left ${isActive ? "kd-btn-active" : ""}`}
              >
                <span className="kd-text-muted text-[10px] w-4">
                  {(slide?.elements.length ?? 0) - i}
                </span>
                <span className="kd-text-primary truncate">
                  {labelMap[el.data.type] ?? el.data.type}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}