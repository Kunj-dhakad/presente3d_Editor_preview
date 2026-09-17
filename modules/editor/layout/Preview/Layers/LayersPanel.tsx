import { memo, useCallback, useRef, useState } from "react";
import useEditorStore, { ElementData, ElementType } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";

const NO_ELEMENTS: ElementType[] = [];
import { KdPreviewlayer6dot } from "@editor/lib/icon/icons";


function getDisplayText(data: ElementData): string | null {
  if (data.type === "text" || data.type === "button") {
    return data.text?.trim() ? data.text.trim().slice(0, 18) : null;
  }
  if (data.type === "table") return `${data.rows} × ${data.columns} table`;
  if (data.type === "chart") return data.title || `${data.chartType} chart`;
  if (data.type === "frame") return `${data.frameShape} frame`;
  // The content is what tells two QR codes apart; nothing else about them does.
  if (data.type === "qr-code")
    return data.content?.trim() ? data.content.trim().slice(0, 18) : "QR code";
  return null;
}

function buildNames(elements: ElementType[]): Map<string, string> {
  const counter: Partial<Record<ElementData["type"], number>> = {};
  const map = new Map<string, string>();

  for (const el of elements) {
    const t = el.data.type;
    counter[t] = (counter[t] ?? 0) + 1;

    const displayText = getDisplayText(el.data);
    if (displayText) {
      map.set(el.id, displayText);
    } else {
      map.set(el.id, `${t.charAt(0).toUpperCase() + t.slice(1)} ${counter[t]}`);
    }
  }

  return map;
}
interface RowProps {
  el: ElementType;
  name: string;
  isSelected: boolean;
  isDragOver: boolean;
  realIndex: number;
  onSelect: (id: string) => void;
  onDragStart: (e: React.DragEvent, realIndex: number, id: string) => void;
  onDragOver: (e: React.DragEvent, realIndex: number) => void;
  onDrop: (e: React.DragEvent, realIndex: number) => void;
  onDragEnd: () => void;
}

const LayerRow = memo(function LayerRow({
  el, name, isSelected, isDragOver,
  onSelect, onDragStart, onDragOver, onDrop, onDragEnd, realIndex,
}: RowProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, realIndex, el.id)}
      onDragOver={(e) => onDragOver(e, realIndex)}
      onDrop={(e) => onDrop(e, realIndex)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(el.id)}
      className={`w-full mt-3  flex items-center border cursor-pointer select-none transition-all duration-100 overflow-hidden
    kd-layer-row
    ${isSelected ? "kd-layer-row-selected" : ""}
    ${isDragOver ? "kd-layer-row-dragover" : ""}
  `}
    >
      {/* Left Purple Box */}
      <div
        className={`py-2 px-3 rounded-tl-lg rounded-bl-lg flex items-center justify-center shrink-0 transition-colors
      kd-layer-icon-box
      ${isSelected ? "kd-layer-icon-box-selected" : ""}
    `}
      >
        <div className="grid grid-cols-1">
          <KdPreviewlayer6dot />
        </div>
      </div>

      {/* Text */}
      <p className="Kd-layer-text-Style flex items-center justify-center flex-1 truncate transition-all">
        {name}
      </p>
    </div>
  );
});


export function LayersPanel() {
  // A fresh `[]` from the selector is a new reference on every store write, so
  // the panel re-rendered constantly whenever there was no active slide.
  const elements = useEditorStore((s) => s.slides[s.activeSlide]?.elements ?? NO_ELEMENTS);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const setActiveElementId = useEditorStore((s) => s.setActiveElementId);
  const moveElementToIndex = useEditorStore((s) => s.moveElementToIndex);

  const reversed = [...elements].reverse();
  const nameMap = buildNames(elements);

  const dragRealIdxRef = useRef<number | null>(null);
  const dragElIdRef = useRef<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const onDragStart = useCallback((e: React.DragEvent, realIndex: number, id: string) => {
    dragRealIdxRef.current = realIndex;
    dragElIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, realIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(realIndex);
  }, []);

  const onDrop = useCallback((e: React.DragEvent, toRealIndex: number) => {
    e.preventDefault();
    setDragOverIdx(null);

    const from = dragRealIdxRef.current;
    const id = dragElIdRef.current;
    dragRealIdxRef.current = null;
    dragElIdRef.current = null;

    if (from === null || id === null || from === toRealIndex) return;

    moveElementToIndex(id, toRealIndex);
  }, [moveElementToIndex]);

  const onDragEnd = useCallback(() => {
    dragRealIdxRef.current = null;
    dragElIdRef.current = null;
    setDragOverIdx(null);
  }, []);

  const onSelect = useCallback((id: string) => {
    // A watermark is a page-level overlay: it is pointer-events:none on the
    // canvas and has no top toolbar, so selecting it here used to leave the
    // editor in a state with nothing to act on. Its panel is where it is
    // actually edited, so send the author there instead.
    const target = elements.find((el) => el.id === id);
    if (target?.data.type === "watermark") {
      const ui = useEditorUIStore.getState();
      setActiveElementId(null);
      useEditorStore.getState().setActiveRightPanel("WatermarkPanel");
      ui.setLastMainPanel("WatermarkPanel");
      ui.setActivePanelType("main");
      ui.setSiteBarCollapsed(false);
      ui.setSidebarWidth("main");
      return;
    }
    setActiveElementId(activeElementId === id ? null : id);
  }, [activeElementId, elements, setActiveElementId]);

  return (
    <div

      className="w-full h-full flex items-center justify-center flex-col select-none"
    >
      <div className="w-full h-full kd-custom-scrollbar px-2 overflow-y-auto  ">
        {reversed.length === 0 ? (
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--kd-text-subtle)", padding: "20px 12px" }}>
            No elements
          </p>
        ) : (
          reversed.map((el, revIdx) => {
            const realIndex = elements.length - 1 - revIdx;
            return (
              <LayerRow
                key={el.id}
                el={el}
                name={nameMap.get(el.id) ?? el.data.type}
                isSelected={activeElementId === el.id}
                isDragOver={dragOverIdx === realIndex}
                realIndex={realIndex}
                onSelect={onSelect}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
              />
            );
          })
        )}
      </div>
    </div>


  );
}

export default LayersPanel;
