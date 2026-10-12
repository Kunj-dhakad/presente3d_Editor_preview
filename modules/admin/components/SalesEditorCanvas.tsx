"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SalesPage } from "@shared/salesPage";
import type { SalesDrag, SalesDropTarget, SalesViewEditor } from "@shared/salesPageEditing";
import SalesPageView from "@site/components/SalesPageView";

type Props = {
  page: SalesPage; device: "desktop" | "tablet" | "mobile"; selectedId: string;
  reveal: { id: string; nonce: number } | null; drag: SalesDrag | null; editor: SalesViewEditor;
  onSelect: (id: string, edit?: boolean) => void; onDismiss: (restoreFocus?: boolean) => void;
  onDrop: (target: SalesDropTarget) => void;
};
const documentHtml = '<!doctype html><html><head><title>Sales page editor</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/sales-page.css"><link rel="stylesheet" href="/sales-page-editor.css"><style>html,body{margin:0;padding:0}body{overflow-x:hidden}</style></head><body><div id="preview-root"></div></body></html>';

export default function SalesEditorCanvas({ page, device, selectedId, reveal, drag, editor, onSelect, onDismiss, onDrop }: Props) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const viewport = device === "desktop" ? Math.max(1200, size.width) : device === "tablet" ? 768 : 390;
  const scale = Math.min(1, size.width / viewport);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize({ width: element.clientWidth, height: element.clientHeight }));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!target || !reveal) return;
    [...target.querySelectorAll<HTMLElement>("[data-sp-section]")].find(element => element.dataset.spSection === reveal.id)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [target, reveal]);
  useEffect(() => {
    const document = target?.ownerDocument;
    if (!document) return;
    const dismiss = (event: PointerEvent) => { if (!(event.target as Element).closest("[contenteditable=true]")) onDismiss(); };
    const edit = (event: MouseEvent) => {
      const node = event.target as Element;
      if (node.closest("[data-sp-text],.sp-editor-image,.sp-editor-section-tools,.sp-editor-item-handle")) return;
      const element = node.closest<HTMLElement>("[data-sp-section],.sp-header");
      if (element) onSelect(element.dataset.spSection || "page", true);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onDismiss(true); editor.onDragEnd(); } };
    document.addEventListener("pointerdown", dismiss, true); document.addEventListener("dblclick", edit); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss, true); document.removeEventListener("dblclick", edit); document.removeEventListener("keydown", escape); };
  }, [target, onDismiss, onSelect, editor]);
  useEffect(() => {
    const document = target?.ownerDocument;
    const view = document?.defaultView;
    if (!document || !view || !drag) return;
    document.documentElement.classList.add("sp-editor-dragging");
    const indicator = document.createElement("div");
    indicator.className = "sp-editor-drop-indicator"; indicator.textContent = drag.kind === "item" ? "Move item here" : drag.kind === "insert" ? "Add block here" : "Move section here";
    document.body.append(indicator);
    let point: { x: number; y: number } | null = null;
    let destination: SalesDropTarget | null = null;
    let animation = 0;
    function paint() {
      if (!point) { indicator.hidden = true; destination = null; return; }
      const node = document!.elementFromPoint(point.x, point.y);
      const section = node?.closest<HTMLElement>("[data-sp-section]");
      const item = node?.closest<HTMLElement>("[data-sp-item]");
      if (drag!.kind === "item" && (!item || section?.dataset.spSection !== drag!.sectionId)) { indicator.hidden = true; destination = null; return; }
      const element = drag!.kind === "item" ? item : section;
      const box = element?.getBoundingClientRect();
      const after = box ? point.y > box.top + box.height / 2 : true;
      destination = { sectionId: section?.dataset.spSection, itemId: item?.dataset.spItem, after };
      const top = box ? after ? box.bottom : box.top : point.y;
      indicator.hidden = false;
      indicator.style.top = `${Math.max(12, Math.min(view!.innerHeight - 24, top))}px`;
      indicator.style.left = `${Math.max(10, box?.left || 10)}px`;
      indicator.style.width = `${Math.max(40, Math.min(box?.width || view!.innerWidth - 20, view!.innerWidth - 20))}px`;
    }
    const over = (event: DragEvent) => { event.preventDefault(); editor.onDragReady(); if (event.dataTransfer) event.dataTransfer.dropEffect = drag.kind === "insert" ? "copy" : "move"; point = { x: event.clientX, y: event.clientY }; paint(); };
    const drop = (event: DragEvent) => { event.preventDefault(); point = { x: event.clientX, y: event.clientY }; paint(); if (destination) onDrop(destination); editor.onDragEnd(); };
    const leave = (event: DragEvent) => { if (!event.relatedTarget) { point = null; paint(); } };
    // The faded library stays mounted as Chrome's drag source. Forward drops through it to the canvas.
    const frame = view.frameElement as HTMLIFrameElement | null;
    const host = frame?.ownerDocument;
    const forward = (event: DragEvent) => {
      if (!frame) return;
      const bounds = frame.getBoundingClientRect();
      const visible = root.current?.getBoundingClientRect();
      if (!visible || event.clientX < visible.left || event.clientX > visible.right || event.clientY < visible.top || event.clientY > visible.bottom) return;
      event.preventDefault();
      const ratio = bounds.width / frame.clientWidth;
      const converted = new DragEvent(event.type, { clientX: (event.clientX - bounds.left) / ratio, clientY: (event.clientY - bounds.top) / ratio, dataTransfer: event.dataTransfer, cancelable: true });
      if (event.type === "drop") drop(converted); else over(converted);
    };
    function scroll() {
      if (point) {
        const direction = point.y < 70 ? -1 : point.y > view!.innerHeight - 70 ? 1 : 0;
        if (direction) { view!.scrollBy(0, direction * 10); paint(); }
      }
      animation = view!.requestAnimationFrame(scroll);
    }
    paint(); scroll(); document.addEventListener("dragover", over); document.addEventListener("drop", drop); document.addEventListener("dragleave", leave); host?.addEventListener("dragover", forward); host?.addEventListener("drop", forward);
    return () => { view.cancelAnimationFrame(animation); indicator.remove(); document.documentElement.classList.remove("sp-editor-dragging"); document.removeEventListener("dragover", over); document.removeEventListener("drop", drop); document.removeEventListener("dragleave", leave); host?.removeEventListener("dragover", forward); host?.removeEventListener("drop", forward); };
  }, [target, drag, editor, onDrop]);
  return <div ref={root} className={`spb-canvas spb-device-${device}`}><iframe title="Sales page live preview" style={{ width: viewport, height: size.height / Math.max(scale, .1), transform: `scale(${scale})` }} srcDoc={documentHtml} onLoad={event => setTarget(event.currentTarget.contentDocument?.getElementById("preview-root") || null)} />{target && createPortal(<SalesPageView page={page} preview selectedId={selectedId} onSelect={onSelect} editor={editor} />, target)}</div>;
}
