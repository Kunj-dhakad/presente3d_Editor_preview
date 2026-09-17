"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEditorStore, { TextData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { getChapters, type ChapterEntry } from "@editor/blocks/Index/lib/ChapterManager";
import { paginateBookIndex } from "@editor/blocks/Index/lib/BookIndexPaginator";
import TextDragAndDrop, {
  TextTransformRect,
} from "@editor/blocks/Text/editor/TextDragAndDrop";
import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import TocIndexBody, {
  type TocIndexBodyHandle,
} from "@editor/blocks/Index/renderer/TocIndexBody";
import { useElementContextMenu } from "@editor/layout/EditorCanvas/RenderElement/useElementContextMenu";
import ElementContextMenu from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";

type Props = {
  id: string;
  data: TextData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
};

function RenderBookIndex({ id, data, slideIndex, clipBounds }: Props) {
  const selected = useEditorStore((s) => s.selectedElementIds.includes(id));
  const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
  // Subscribing to the whole `slides` array re-ran the TOC derivation on every
  // keystroke anywhere in the document. getChapters is memoized and returns a
  // stable reference when the chapters themselves haven't changed.
  const chapters = useEditorStore((s) => getChapters(s.slides));
  const setActiveSlide = useEditorStore((s) => s.setActiveSlide);
  const setActiveElementId = useEditorStore((s) => s.setActiveElementId);
  const toggleSelectedElementId = useEditorStore(
    (s) => s.toggleSelectedElementId,
  );
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateChapterTitle = useEditorStore((s) => s.updateChapterTitle);
  const syncBookIndex = useEditorStore((s) => s.syncBookIndex);
  const { contextMenuPos, handleContextMenu, closeContextMenu } = useElementContextMenu(id, slideIndex);
  // `slides` was in this dep list, so syncBookIndex — a full-document scan that
  // can itself call set() — re-ran on every store write. It only needs to run
  // when this element has no root yet.
  useEffect(() => {
    if (!data.indexRootId) syncBookIndex(id);
  }, [data.indexRootId, id, syncBookIndex]);

  const select = useCallback(
    (event: React.PointerEvent) => {
      setActiveSlide(slideIndex);
      if (event.ctrlKey || event.metaKey || event.shiftKey)
        toggleSelectedElementId(id);
      else setActiveElementId(id);
    },
    [
      id,
      setActiveElementId,
      setActiveSlide,
      slideIndex,
      toggleSelectedElementId,
    ],
  );

  const move = useCallback(
    (next: TextTransformRect) => {
      updateElement(
        id,
        {
          x: next.x,
          y: next.y,
          width: next.width,
          height: next.height,
          rotation: next.rotation,
        },
        { history: true },
      );
    },
    [id, updateElement],
  );

  const goTo = useCallback(
    (page: number) => {
      setActiveSlide(page - 1);
      const target = document.querySelector(
        `[data-slide-index="${page - 1}"]`,
      ) as HTMLElement | null;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [setActiveSlide],
  );

  // TextDragAndDrop captures the pointer on press, so the browser retargets
  // click and dblclick to that wrapper — the entries below never see them.
  // Presses are recorded here and replayed once the wrapper reports a click.
  const bodyRef = useRef<TocIndexBodyHandle>(null);
  const pressRef = useRef<{
    chapter: ChapterEntry;
    onTitle: boolean;
    at: number;
  } | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const handleEntryPress = useCallback(
    (press: { chapter: ChapterEntry; onTitle: boolean }) => {
      pressRef.current = { ...press, at: Date.now() };
    },
    [],
  );

  // A press only counts for the click that follows it, never a later one.
  const freshPress = useCallback(() => {
    const press = pressRef.current;
    return press && Date.now() - press.at < 1000 ? press : null;
  }, []);

  // A press on the chapter name renames it, anywhere else jumps to its page.
  const handleElementClick = useCallback(() => {
    const press = freshPress();
    if (!press) return;
    if (press.onTitle) bodyRef.current?.editChapter(press.chapter.elementId);
    else goTo(press.chapter.startPage);
  }, [freshPress, goTo]);

  // The wrapper still gets the real dblclick, so renaming works on a
  // double-click even when the index was not selected beforehand.
  useEffect(() => {
    if (!container) return;
    const onDoubleClick = () => {
      const press = freshPress();
      if (press?.onTitle) bodyRef.current?.editChapter(press.chapter.elementId);
    };
    container.addEventListener("dblclick", onDoubleClick);
    return () => container.removeEventListener("dblclick", onDoubleClick);
  }, [container, freshPress]);

  const rect = {
    x: data.x,
    y: data.y,
    width: data.width,
    height: data.height,
    rotation: data.rotation ?? 0,
  };
  const pageNumber = data.indexPage ?? 0;
  const page = useMemo(
    () =>
      paginateBookIndex(chapters, data)[pageNumber] ?? {
        page: pageNumber,
        entries: [],
      },
    [chapters, data, pageNumber],
  );

  return (
    <TextDragAndDrop
      id={id}
      rect={rect}
      isSelected={selected}
      imageExportMode={imageExportMode}
      onSelect={select}
      onElementClick={handleElementClick}
      onContainerChange={setContainer}
      onTransformEnd={move}
      clipBounds={clipBounds}
    >
      <section
        onContextMenu={handleContextMenu}
        // A press anywhere in the index that is not the rename input itself
        // closes that input — the input stops propagation, so it never fires
        // for its own clicks.
        onPointerDown={() => bodyRef.current?.commitActiveEdit()}
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
          background: data.backgroundColor || "transparent",
          color: data.color ?? "#111827",
          fontFamily: data.fontFamily,
          fontSize: data.fontSize ?? 14,
          fontWeight: data.fontWeight ?? 400,
          lineHeight: data.lineHeight ?? 1.4,
          padding: `${data.tocMarginTop || 16}px ${data.tocIndent || 16}px ${data.tocMarginBottom || 16}px`,
        }}
      >
        <TocIndexBody
          ref={bodyRef}
          data={data}
          page={page}
          pageNumber={pageNumber}
          noChapters={chapters.length === 0}
          onEntryClick={goTo}
          editable
          onRenameChapter={updateChapterTitle}
          onEntryPress={handleEntryPress}
        />
      </section>
      {selected && contextMenuPos && (
        <ElementContextMenu
          position={contextMenuPos}
          elementId={id}
          onClose={closeContextMenu}
        />
      )}
    </TextDragAndDrop>
  );
}

// Every other element renderer is memoized; this one was not.
export default memo(RenderBookIndex);
