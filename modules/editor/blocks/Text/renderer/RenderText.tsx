"use client";
import React, { useEffect, useRef, useState, memo, useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import useEditorStore, { DEFAULT_TEXT_COLOR, TextData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { styleClipboard } from "@editor/lib/styleClipboard";
import ElementContextMenu, {
  ContextMenuPosition,
} from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";
import { loadGoogleFont } from "@shared/fonts/useFontLoader";
import TextDragAndDrop, {
  TextTransformRect,
} from "@editor/blocks/Text/editor/TextDragAndDrop";
import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";

let _mc: HTMLCanvasElement | null = null;
let _mx: CanvasRenderingContext2D | null = null;
const TEXT_BOX_PADDING = 6;
const MIN_TEXT_CONTENT_WIDTH = 24;

type TextResizeStart = {
  width: number;
  height: number;
  fontSize: number;
  x: number;
  y: number;
  rotation: number;
};

const TEXT_RESIZE_DEG = Math.PI / 180;

function rotateResizeVector(x: number, y: number, rotation: number) {
  const angle = rotation * TEXT_RESIZE_DEG;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function getCornerFixedAnchor(handle: string, width: number, height: number) {
  switch (handle) {
    case "se":
      return { x: 0, y: 0 };
    case "sw":
      return { x: width, y: 0 };
    case "ne":
      return { x: 0, y: height };
    case "nw":
      return { x: width, y: height };
    default:
      return { x: width / 2, y: height / 2 };
  }
}

function anchorCornerResizeRect(
  handle: string,
  start: TextTransformRect,
  width: number,
  height: number,
): TextTransformRect {
  const oldAnchor = getCornerFixedAnchor(handle, start.width, start.height);
  const oldAnchorVector = rotateResizeVector(
    oldAnchor.x - start.width / 2,
    oldAnchor.y - start.height / 2,
    start.rotation,
  );
  const oldAnchorWorld = {
    x: start.x + start.width / 2 + oldAnchorVector.x,
    y: start.y + start.height / 2 + oldAnchorVector.y,
  };

  const newAnchor = getCornerFixedAnchor(handle, width, height);
  const newAnchorVector = rotateResizeVector(
    newAnchor.x - width / 2,
    newAnchor.y - height / 2,
    start.rotation,
  );
  const newCenter = {
    x: oldAnchorWorld.x - newAnchorVector.x,
    y: oldAnchorWorld.y - newAnchorVector.y,
  };

  return {
    x: newCenter.x - width / 2,
    y: newCenter.y - height / 2,
    width,
    height,
    rotation: start.rotation,
  };
}

function getContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!_mc) {
    _mc = document.createElement("canvas");
    _mx = _mc.getContext("2d");
  }
  return _mx;
}

/**
 * Counts wrapped lines with the exact same break points as the previous
 * character-by-character greedy loop — including the rule that an overflowing
 * space is dropped rather than carried to the next line — but with
 * O(lines * log(lineLength)) measureText calls instead of O(chars). The old
 * version re-measured the whole growing line on every character, which is
 * quadratic on long paragraphs, and this runs on every keystroke and every
 * text-resize pointermove.
 *
 * Relies on width being non-decreasing as characters are appended within a
 * line, which holds for ordinary text.
 */
function countWrappedLines(
  ctx: CanvasRenderingContext2D,
  chars: string[],
  maxW: number,
): number {
  const n = chars.length;
  let pos = 0;
  let breaks = 0;
  while (pos < n) {
    // The first character of a line is always kept, even if it alone
    // overflows — matches the original's unconditional append when the
    // in-progress line was still empty.
    let lo = 1;
    let hi = n - pos;
    let best = 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const width = ctx.measureText(chars.slice(pos, pos + mid).join("")).width;
      if (width <= maxW) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    const overflowIdx = pos + best;
    if (overflowIdx >= n) {
      pos = n;
    } else {
      // The original always counts one more line for the trailing segment
      // after a break — even an empty one, which happens when the overflowing
      // character is whitespace at the very end and gets dropped.
      breaks++;
      const overflowChar = chars[overflowIdx];
      pos = overflowChar.trim() ? overflowIdx : overflowIdx + 1;
    }
  }
  return breaks + 1;
}

function measureTextHeight(
  text: string | undefined,
  fontSize: number,
  fontFamily: string | undefined,
  fontWeight: string | number | undefined,
  fontStyle: string | undefined,
  lineHeight: number | string | undefined,
  boxWidth: number,
): number {
  const ctx = getContext();
  if (!ctx) return fontSize * 1.4;
  const PAD_X = 0,
    PAD_Y = 0;
  const lh =
    typeof lineHeight === "number"
      ? lineHeight
      : parseFloat(String(lineHeight ?? "1.4")) || 1.4;
  const maxW = Math.max(1, boxWidth - PAD_X * 2);
  ctx.font = `${fontStyle || "normal"} ${fontWeight || "400"} ${fontSize}px ${fontFamily || "sans-serif"}`;
  let totalLines = 0;
  for (const para of (text || "").replace(/\r/g, "").split("\n")) {
    if (!para) {
      totalLines++;
      continue;
    }
    totalLines += countWrappedLines(ctx, Array.from(para), maxW);
  }
  return Math.max(1, totalLines) * fontSize * lh + PAD_Y * 2;
}

function getContentScrollHeight(el: HTMLElement): number {
  return Math.max(1, el.scrollHeight - TEXT_BOX_PADDING * 2);
}

function toOuterTextRect(rect: TextTransformRect): TextTransformRect {
  return {
    x: rect.x - TEXT_BOX_PADDING,
    y: rect.y - TEXT_BOX_PADDING,
    width: rect.width + TEXT_BOX_PADDING * 2,
    height: rect.height + TEXT_BOX_PADDING * 2,
    rotation: rect.rotation,
  };
}

function toContentTextRect(rect: TextTransformRect): TextTransformRect {
  return {
    x: rect.x + TEXT_BOX_PADDING,
    y: rect.y + TEXT_BOX_PADDING,
    width: Math.max(1, rect.width - TEXT_BOX_PADDING * 2),
    height: Math.max(1, rect.height - TEXT_BOX_PADDING * 2),
    rotation: rect.rotation,
  };
}

const RenderText: React.FC<{
  id: string;
  data: TextData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
  /**
   * Renders without ever writing to the document. The reader mounts this same
   * component; without it, the auto-fit measurement below would push its own
   * measurements back into the user's slides.
   */
  readOnly?: boolean;
}> = memo(
  ({ id, data, slideIndex, clipBounds, readOnly = false }) => {
    const editingRef = useRef<HTMLDivElement | null>(null);
    const [fontReady, setFontReady] = useState(!data.fontFamily);
    const isEditingRef = useRef(false);
    const dataRef = useRef(data);
    const pendingFsRef = useRef<number | null>(null);
    const resizeStartRef = useRef<TextResizeStart | null>(null);
    const lastHeightRef = useRef<number>(data.height);

    const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
    const setActiveTextRef = useEditorUIStore((s) => s.setActiveTextRef);

    const [isTransforming, setIsTransforming] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    // const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
    const targetElRef = useRef<HTMLElement | null>(null);
    const [editing, setEditing] = useState(false);
    const [contextMenuPos, setContextMenuPos] =
      useState<ContextMenuPosition | null>(null);
    const [tempSize, setTempSize] = useState({
      width: data.width,
      height: data.height,
    });
    const [tempFontSize, setTempFontSize] = useState<TextData["fontSize"]>(
      data.fontSize,
    );

    // dataRef sync
    useEffect(() => {
      dataRef.current = data;
    }, [data]);

    useEffect(() => {
      lastHeightRef.current = data.height;
      const raf = requestAnimationFrame(() => {
        setTempSize({ width: data.width, height: data.height });
      });
      return () => cancelAnimationFrame(raf);
    }, [data.width, data.height]);

    useEffect(() => {
      if (isResizing) return;
      const raf = requestAnimationFrame(() => {
        setTempFontSize(data.fontSize);
      });
      return () => cancelAnimationFrame(raf);
    }, [data.fontSize, isResizing]);

    const {
      updateElement: storeUpdateElement,
      setActiveElementId,
      setActiveSlide,
      toggleSelectedElementId,
    } = useEditorStore(
      useShallow((s) => ({
        updateElement: s.updateElement,
        setActiveElementId: s.setActiveElementId,
        setActiveSlide: s.setActiveSlide,
        toggleSelectedElementId: s.toggleSelectedElementId,
      })),
    );

    // One gate for every write in this component, so a read-only mount (the
    // preview reader) cannot mutate slides while it measures itself.
    const updateElement = useMemo<typeof storeUpdateElement>(
      () => (readOnly ? () => { } : storeUpdateElement),
      [readOnly, storeUpdateElement],
    );

    const isSelected = useEditorStore(
      useCallback((s) => s.selectedElementIds.includes(id), [id]),
    );
    const selectedCount = useEditorStore((s) => s.selectedElementIds.length);

    useEffect(() => {
      if (isSelected) {
        setActiveTextRef(editingRef.current);
      }
    }, [isSelected, setActiveTextRef]);

    useEffect(() => {
      const el = editingRef.current;
      if (!el) return;
      if (editing) {
        isEditingRef.current = true;
        el.focus();
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(r);
      } else {
        isEditingRef.current = false;
        el.innerHTML = dataRef.current.html || dataRef.current.text;
      }
    }, [editing]);

    useEffect(() => {
      const el = editingRef.current;
      if (!el || isEditingRef.current) return;
      el.innerHTML = data.html || data.text;
    }, [data.html, data.text]);

    useEffect(() => {
      if (isResizing || isTransforming || !fontReady) return;
      const el = editingRef.current;
      if (!el) return;
      const raf = requestAnimationFrame(() => {
        const d = dataRef.current;
        const fs =
          typeof d.fontSize === "number"
            ? d.fontSize
            : parseFloat(String(d.fontSize));
        const measuredH = measureTextHeight(
          d.text,
          fs,
          d.fontFamily,
          d.fontWeight,
          d.fontStyle,
          d.lineHeight,
          d.width,
        );
        const h = Math.max(measuredH, getContentScrollHeight(el));
        if (Math.abs(h - lastHeightRef.current) > 0.5) {
          lastHeightRef.current = h;
          setTempSize((p) => ({ ...p, height: h }));
          updateElement(id, { height: h });
        }
      });
      return () => cancelAnimationFrame(raf);
    }, [
      data.text,
      data.html,
      data.fontSize,
      data.fontFamily,
      data.lineHeight,
      data.width,
      data.fontWeight,
      data.fontStyle,
      updateElement,
      id,
      isResizing,
      isTransforming,
      fontReady,
    ]);

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLDivElement>) => {
        const newH = getContentScrollHeight(e.currentTarget);
        lastHeightRef.current = newH;
        updateElement(
          id,
          {
            text: e.currentTarget.innerText,
            html: e.currentTarget.innerHTML,
            height: newH,
          },
          { history: true },
        );
        setEditing(false);
      },
      [id, updateElement],
    );

    const syncHeightToText = useCallback(() => {
      const el = editingRef.current;
      if (!el) return;
      requestAnimationFrame(() => {
        const d = dataRef.current;
        const fs =
          typeof d.fontSize === "number"
            ? d.fontSize
            : parseFloat(String(d.fontSize));
        const h = Math.max(
          measureTextHeight(
            el.innerText || "",
            fs,
            d.fontFamily,
            d.fontWeight,
            d.fontStyle,
            d.lineHeight,
            d.width,
          ),
          getContentScrollHeight(el),
        );
        if (Math.abs(h - lastHeightRef.current) > 0.5) {
          lastHeightRef.current = h;
          setTempSize((s) => ({ ...s, height: h }));
          updateElement(id, { height: h });
        }
      });
    }, [id, updateElement]);

    useEffect(() => {
      const el = editingRef.current;
      if (!el || isResizing || isTransforming) return;

      let frame = 0;
      const syncRenderedHeight = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const nextHeight = getContentScrollHeight(el);
          if (Math.abs(nextHeight - lastHeightRef.current) <= 0.5) return;
          lastHeightRef.current = nextHeight;
          setTempSize((size) => ({ ...size, height: nextHeight }));
          updateElement(id, { height: nextHeight });
        });
      };

      const observer = new ResizeObserver(syncRenderedHeight);
      observer.observe(el);
      syncRenderedHeight();

      return () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
      };
    }, [data.width, data.fontSize, data.fontFamily, id, isResizing, isTransforming, updateElement]);

    const getMeasuredHeight = useCallback((width: number, fontSize: number) => {
      const d = dataRef.current;
      const text = editingRef.current?.innerText || d.text;
      return measureTextHeight(
        text,
        fontSize,
        d.fontFamily,
        d.fontWeight,
        d.fontStyle,
        d.lineHeight,
        width,
      );
    }, []);

    const handleResizeStart = useCallback(() => {
      const d = dataRef.current;
      resizeStartRef.current = {
        width: d.width,
        height: d.height,
        fontSize:
          typeof d.fontSize === "number"
            ? d.fontSize
            : parseFloat(String(d.fontSize)),
        x: d.x,
        y: d.y,
        rotation: d.rotation ?? 0,
      };
      pendingFsRef.current = null;
      setIsResizing(true);
    }, []);

    const handleResize = useCallback(
      (nextOuter: TextTransformRect, handle: string) => {
        const start = resizeStartRef.current;
        if (!start) return;
        const next = toContentTextRect(nextOuter);
        const newW = Math.max(MIN_TEXT_CONTENT_WIDTH, next.width);
        const isCorner = ["nw", "ne", "sw", "se"].includes(handle);
        let newFs = start.fontSize;
        if (isCorner) {
          newFs = Math.max(
            4,
            Math.min(
              800,
              Math.round(start.fontSize * (newW / Math.max(1, start.width))),
            ),
          );
          pendingFsRef.current = newFs;
        }
        const nextHeight = getMeasuredHeight(newW, newFs);
        const nextContent: TextTransformRect = {
          x: handle.includes("w") ? start.x + start.width - newW : start.x,
          y: handle.includes("n")
            ? start.y + start.height - nextHeight
            : start.y,
          width: newW,
          height: nextHeight,
          rotation: next.rotation,
        };
        if (editingRef.current) {
          editingRef.current.style.fontSize = `${newFs}px`;
        }
        if (isCorner) {
          return anchorCornerResizeRect(
            handle,
            toOuterTextRect({ ...start, rotation: next.rotation }),
            newW + TEXT_BOX_PADDING * 2,
            nextHeight + TEXT_BOX_PADDING * 2,
          );
        }
        return toOuterTextRect(nextContent);
      },
      [getMeasuredHeight],
    );

    const handleResizeStop = useCallback(
      (nextOuter: TextTransformRect, handle: string) => {
        const start = resizeStartRef.current;
        const d = dataRef.current;
        setIsTransforming(false);
        setIsResizing(false);
        const next = toContentTextRect(nextOuter);
        const origFs =
          start?.fontSize ??
          (typeof d.fontSize === "number"
            ? d.fontSize
            : parseFloat(String(d.fontSize)));
        const origW = start?.width ?? d.width;
        const newW = Math.max(MIN_TEXT_CONTENT_WIDTH, next.width);
        const isCorner = ["nw", "ne", "sw", "se"].includes(handle);
        const newFs = isCorner
          ? (pendingFsRef.current ??
            Math.max(
              4,
              Math.min(800, Math.round(origFs * (newW / Math.max(1, origW)))),
            ))
          : origFs;
        const autoH = getMeasuredHeight(newW, newFs);
        const isAnchoredCorner = isCorner && start;
        const anchoredContent = isAnchoredCorner
          ? toContentTextRect(
              anchorCornerResizeRect(
                handle,
                toOuterTextRect({ ...start, rotation: next.rotation }),
                newW + TEXT_BOX_PADDING * 2,
                autoH + TEXT_BOX_PADDING * 2,
              ),
            )
          : null;
        const nextX = anchoredContent
          ? anchoredContent.x
          : handle.includes("w") && start
            ? start.x + start.width - newW
            : next.x;
        const nextY = anchoredContent
          ? anchoredContent.y
          : handle.includes("n") && start
            ? start.y + start.height - autoH
            : next.y;
        lastHeightRef.current = autoH;
        setTempSize({ width: newW, height: autoH });
        setTempFontSize(newFs);
        updateElement(
          id,
          {
            width: newW,
            height: autoH,
            fontSize: newFs,
            x: nextX,
            y: nextY,
            rotation: next.rotation,
          },
          { history: true },
        );
        resizeStartRef.current = null;
        pendingFsRef.current = null;
      },
      [getMeasuredHeight, id, updateElement],
    );

    const handleDragStop = useCallback(
      (nextOuter: TextTransformRect) => {
        setIsTransforming(false);
        const next = toContentTextRect(nextOuter);
        updateElement(
          id,
          { x: next.x, y: next.y, rotation: next.rotation },
          { history: true },
        );
      },
      [id, updateElement],
    );

    const handleContainerChange = useCallback((el: HTMLDivElement | null) => {
      targetElRef.current = el;
      // setTargetEl(el);
    }, []);

    const dragIntentRef = useRef(false);

    const handleMouseDown = useCallback(
      (e: React.PointerEvent) => {
        dragIntentRef.current = false;
        setActiveSlide(slideIndex);

        const isCopyStyleMode = useEditorUIStore.getState().isCopyStyleMode;
        if (isCopyStyleMode) {
          const copiedStyle = styleClipboard.getClipboardContent();
          if (copiedStyle) {
            const { applyCopiedStyle } = useEditorStore.getState();
            applyCopiedStyle([id], copiedStyle);
            const { setIsCopyStyleMode, setCopiedStyleSourceType } =
              useEditorUIStore.getState();
            setIsCopyStyleMode(false);
            setCopiedStyleSourceType(null);
          }
          return;
        }

        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          toggleSelectedElementId(id);
          setEditing(false);
          return;
        }
        const currentActiveId = useEditorStore.getState().activeElementId;
        if (currentActiveId !== id) {
          setActiveElementId(id);
          setEditing(false);
        }
      },
      [
        id,
        slideIndex,
        setActiveSlide,
        setActiveElementId,
        toggleSelectedElementId,
      ],
    );

    const handleClick = useCallback(() => {
      setIsTransforming(false);
      if (dragIntentRef.current) return;
      if (selectedCount > 1) return;
      setEditing(true);
      requestAnimationFrame(() => editingRef.current?.focus());
    }, [selectedCount]);

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveSlide(slideIndex);
        const currentActiveId = useEditorStore.getState().activeElementId;
        if (currentActiveId !== id) {
          setActiveElementId(id);
        }
        setContextMenuPos({ x: e.clientX, y: e.clientY });
      },
      [id, slideIndex, setActiveSlide, setActiveElementId],
    );

    const effectiveFontSize = isResizing ? tempFontSize : data.fontSize;

    const handleTransformStart = useCallback(
      ({ kind }: { kind: "drag" | "resize" | "rotate" }) => {
        setIsTransforming(true);
        setContextMenuPos(null);
        if (kind === "resize") {
          setIsResizing(true);
          handleResizeStart();
        }
      },
      [handleResizeStart],
    );

    const handleTransform = useCallback(
      (
        next: TextTransformRect,
        meta: { kind: "drag" | "resize" | "rotate"; handle: string },
      ) => {
        if (meta.kind === "resize") return handleResize(next, meta.handle);
      },
      [handleResize],
    );

    const handleTransformEnd = useCallback(
      (
        next: TextTransformRect,
        meta: { kind: "drag" | "resize" | "rotate"; handle: string },
      ) => {
        if (meta.kind === "resize") {
          handleResizeStop(next, meta.handle);
          return;
        }
        handleDragStop(next);
      },
      [handleDragStop, handleResizeStop],
    );

    useEffect(() => {
      if (!fontReady) return;
      const el = editingRef.current;
      if (!el) return;

      document.fonts.ready.then(() => {
        const d = dataRef.current;
        const fs =
          typeof d.fontSize === "number"
            ? d.fontSize
            : parseFloat(String(d.fontSize));
        const measuredH = measureTextHeight(
          d.text,
          fs,
          d.fontFamily,
          d.fontWeight,
          d.fontStyle,
          d.lineHeight,
          d.width,
        );
        const h = Math.max(measuredH, getContentScrollHeight(el));
        if (Math.abs(h - lastHeightRef.current) > 0.5) {
          lastHeightRef.current = h;
          setTempSize((p) => ({ ...p, height: h }));
          updateElement(id, { height: h });
        }
      });
    }, [fontReady, id, updateElement]);

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const plain = e.clipboardData.getData("text/plain");
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        sel.deleteFromDocument();
        const range = sel.getRangeAt(0);
        const textNode = document.createTextNode(plain);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        syncHeightToText();
      },
      [syncHeightToText],
    );

    useEffect(() => {
      let cancelled = false;
      if (!data.fontFamily) {
        const raf = requestAnimationFrame(() => {
          if (!cancelled) setFontReady(true);
        });
        return () => {
          cancelled = true;
          cancelAnimationFrame(raf);
        };
      }
      const raf = requestAnimationFrame(() => {
        if (!cancelled) setFontReady(false);
      });
      loadGoogleFont(data.fontFamily)
        .then(() => {
          if (!cancelled) setFontReady(true);
        })
        .catch(() => {
          if (!cancelled) setFontReady(true);
        });
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
      };
    }, [data.fontFamily]);

    return (
      <>
        <TextDragAndDrop
          id={id}
          rect={{      
            ...toOuterTextRect({
              x: data.x,
              y: data.y,
              width: tempSize.width,
              height: tempSize.height,
              rotation: data.rotation ?? 0,
            }),
          }}
          isSelected={isSelected}
          disabled={editing}
          imageExportMode={imageExportMode}
          onSelect={handleMouseDown}
          onElementClick={handleClick}
          onTransformStart={handleTransformStart}
          onTransform={handleTransform}
          onTransformEnd={handleTransformEnd}
          onContainerChange={handleContainerChange}
          clipBounds={clipBounds}
        >
          <div
            ref={editingRef}
            contentEditable={editing}
            suppressContentEditableWarning
            data-element-id={id}
            onBlur={handleBlur}
            // No onInput height sync: this box is `height: auto`, so the
            // ResizeObserver below already fires (rAF-debounced, same epsilon
            // guard, same lastHeightRef) whenever typing changes the rendered
            // height. Running both meant two full measurements per keystroke.
            // Paste still calls it explicitly since it mutates the DOM directly.
            onPaste={handlePaste}
            onContextMenu={handleContextMenu}
            onClick={(e) => {
              const anchor = (e.target as HTMLElement).closest("a");
              if (!anchor) return;
              e.preventDefault();
              if (e.ctrlKey || e.metaKey) {
                const href = anchor.getAttribute("href");
                if (href) window.open(href, "_blank");
              }
            }}
            style={{
              width: "100%",
              background: data.backgroundColor || "transparent",
              minHeight: "1em",
              height: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              outline: "none",
              overflow: "hidden",
              textDecoration: data.textDecoration,
              color: data.color ?? DEFAULT_TEXT_COLOR,
              fontSize:
                typeof effectiveFontSize === "number"
                  ? `${effectiveFontSize}px`
                  : effectiveFontSize,
              fontFamily: data.fontFamily,
              textAlign: data.align,
              lineHeight: data.lineHeight,
              letterSpacing: data.letterSpacing,
              fontWeight: data.fontWeight,
              fontStyle: data.fontStyle,
              textTransform: data.textTransform || "none",
              boxSizing: "border-box",
              padding: TEXT_BOX_PADDING,
              position: "relative",
              zIndex: 11,
              opacity: 1,
            }}
          />
        </TextDragAndDrop>

        {isSelected && contextMenuPos && (
          <ElementContextMenu
            position={contextMenuPos}
            elementId={id}
            onClose={() => setContextMenuPos(null)}
          />
        )}
      </>
    );
  },
  (p, n) =>
    p.id === n.id &&
    p.readOnly === n.readOnly &&
    p.slideIndex === n.slideIndex &&
    p.clipBounds?.width === n.clipBounds?.width &&
    p.clipBounds?.height === n.clipBounds?.height &&
    p.data.x === n.data.x &&
    p.data.y === n.data.y &&
    p.data.width === n.data.width &&
    p.data.height === n.data.height &&
    p.data.rotation === n.data.rotation &&
    p.data.text === n.data.text &&
    p.data.html === n.data.html &&
    p.data.fontSize === n.data.fontSize &&
    p.data.fontFamily === n.data.fontFamily &&
    p.data.fontWeight === n.data.fontWeight &&
    p.data.fontStyle === n.data.fontStyle &&
    p.data.textDecoration === n.data.textDecoration &&
    p.data.lineHeight === n.data.lineHeight &&
    p.data.letterSpacing === n.data.letterSpacing &&
    p.data.align === n.data.align &&
    p.data.color === n.data.color &&
    p.data.backgroundColor === n.data.backgroundColor &&
    p.data.opacity === n.data.opacity &&
    (p.data.textTransform || "none") === (n.data.textTransform || "none"),
);

RenderText.displayName = "RenderText";
export default RenderText;