"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import useEditorStore, {
  ElementData,
  TableCell,
  TableData,
} from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import {
  nextVisibleCell,
  normalizeRange,
  rangeArea,
  rangeContains,
  rangeOf,
} from "@editor/blocks/Table/lib/cellGrid";
import {
  tableCellStyle,
  tableFrameStyle,
} from "@editor/blocks/Table/lib/tableStyle";
import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";
import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import ElementContextMenu from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";
import { useElementContextMenu } from "@editor/layout/EditorCanvas/RenderElement/useElementContextMenu";

type Props = {
  id: string;
  data: ElementData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
  /** Renders without writing to the document (used by the preview reader). */
  readOnly?: boolean;
};
type CellPosition = { row: number; column: number };

const cloneCells = (cells: TableCell[][]) =>
  cells.map((row) => row.map((cell) => ({ ...cell })));

function RenderTable({ id, data, slideIndex, clipBounds, readOnly = false }: Props) {
  const table = data as TableData;
  const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
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

  // Same gate as RenderText: a read-only mount measures itself but never
  // writes the result back into the slides.
  const updateElement = useMemo<typeof storeUpdateElement>(
    () => (readOnly ? () => { } : storeUpdateElement),
    [readOnly, storeUpdateElement],
  );
  const isSelected = useEditorStore(
    useCallback((s) => s.selectedElementIds.includes(id), [id]),
  );
  const [editing, setEditing] = useState<CellPosition | null>(null);
  const cellRefs = useRef(new Map<string, HTMLTableCellElement>());
  const tableRef = useRef<HTMLTableElement | null>(null);
  // CanvasDragDrop takes pointer capture on pointerdown, so the browser
  // retargets click/dblclick to that wrapper and the cells never see them.
  // The press is recorded here instead and turned into an edit on pointer-up.
  const pressedCellRef = useRef<CellPosition | null>(null);
  const pressedWhileSelectedRef = useRef(false);
  const cellSelection = useEditorUIStore((s) => s.tableCellSelection);
  const setCellSelection = useEditorUIStore((s) => s.setTableCellSelection);
  const selectionRange = useMemo(
    () =>
      cellSelection && cellSelection.elementId === id
        ? normalizeRange(
            table.cells,
            rangeOf(cellSelection.anchor, cellSelection.focus),
          )
        : null,
    [cellSelection, id, table.cells],
  );
  // A single cell needs no highlight — it would just add noise to every click.
  const highlightRange =
    selectionRange && rangeArea(selectionRange) > 1 ? selectionRange : null;

  // Cell selection belongs to the selected table only.
  useEffect(() => {
    if (isSelected) return;
    if (useEditorUIStore.getState().tableCellSelection?.elementId === id)
      setCellSelection(null);
  }, [id, isSelected, setCellSelection]);
  const { contextMenuPos, handleContextMenu, closeContextMenu } =
    useElementContextMenu(id, slideIndex);

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

  const selectTable = useCallback(() => {
    setActiveSlide(slideIndex);
    setActiveElementId(id);
  }, [id, setActiveElementId, setActiveSlide, slideIndex]);

  // A resize scales the cell content with the box, so shrinking a table makes
  // its text smaller instead of just re-wrapping it. Plain moves (both sides
  // unchanged) fall through untouched.
  const applyRect = useCallback(
    (next: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    }) => {
      const ratios = [
        table.width > 0 ? next.width / table.width : 1,
        table.height > 0 ? next.height / table.height : 1,
      ].filter((ratio) => Math.abs(ratio - 1) > 0.005);
      const scale = ratios.length ? Math.min(...ratios) : 1;
      if (scale === 1) return updateElement(id, next, { history: true });
      const current = table.style;
      updateElement(
        id,
        {
          ...next,
          style: {
            ...current,
            fontSize: Math.max(
              4,
              Math.round(current.fontSize * scale * 10) / 10,
            ),
            padding: Math.max(0, Math.round(current.padding * scale * 10) / 10),
          },
        },
        { history: true },
      );
    },
    [id, table.height, table.style, table.width, updateElement],
  );

  const updateCells = useCallback(
    (next: TableCell[][], history = true) => {
      updateElement(id, { cells: next }, { history });
    },
    [id, updateElement],
  );

  const commitCell = useCallback(
    (position: CellPosition, text: string) => {
      const cells = cloneCells(table.cells);
      if (!cells[position.row]?.[position.column]) return;
      cells[position.row][position.column].text = text;
      updateCells(cells);
    },
    [table.cells, updateCells],
  );

  const focusCell = useCallback((row: number, column: number) => {
    const key = `${row}:${column}`;
    setEditing({ row, column });
    requestAnimationFrame(() => {
      const cell = cellRefs.current.get(key);
      if (!cell) return;
      cell.focus();
      // Caret at the end of whatever the cell already holds.
      const range = document.createRange();
      range.selectNodeContents(cell);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }, []);

  // Fired by CanvasDragDrop on a press that did not turn into a drag.
  const handleElementClick = useCallback(() => {
    const cell = pressedCellRef.current;
    pressedCellRef.current = null;
    if (!cell || readOnly || imageExportMode || table.locked) return;
    // First click only selects the table; the next one enters the cell.
    if (!pressedWhileSelectedRef.current) return;
    if (useEditorStore.getState().selectedElementIds.length > 1) return;
    focusCell(cell.row, cell.column);
  }, [focusCell, imageExportMode, readOnly, table.locked]);

  const onCellKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLTableCellElement>,
      row: number,
      column: number,
    ) => {
      if (event.key === "Tab") {
        event.preventDefault();
        // Read and store the text here, while this cell is still editable.
        // Moving on first drops `contentEditable`, and a cell that stops being
        // focusable is not guaranteed to fire a blur — the text would be lost.
        commitCell({ row, column }, event.currentTarget.innerText);
        // Merged-away slots are not rendered, so step over them.
        const next = nextVisibleCell(
          table.cells,
          { row, column },
          event.shiftKey ? -1 : 1,
        );
        focusCell(next.row, next.column);
        return;
      }
      if (event.key === "Escape") {
        event.currentTarget.blur();
      }
    },
    [commitCell, focusCell, table.cells],
  );

  useEffect(() => {
    const element = tableRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const syncHeight = () => {
      const nextHeight = Math.ceil(element.offsetHeight);
      if (nextHeight > table.height + 1)
        updateElement(id, { height: nextHeight }, { history: false });
    };
    const observer = new ResizeObserver(syncHeight);
    observer.observe(element);
    syncHeight();
    return () => observer.disconnect();
  }, [id, table.height, updateElement, table.cells, table.style, table.width]);

  if (data.type !== "table" || table.hidden) return null;
  const style = table.style;
  const rect = {
    x: table.x,
    y: table.y,
    width: table.width,
    height: table.height,
    rotation: table.rotation ?? 0,
  };

  return (
    <>
      <CanvasDragDrop
        id={id}
        rect={rect}
        isSelected={isSelected}
        imageExportMode={imageExportMode}
        clipBounds={clipBounds}
        dragDisabled={Boolean(editing)}
        allowTextSelection={Boolean(editing)}
        onContextMenu={handleContextMenu}
        onSelect={select}
        onElementClick={handleElementClick}
        onChange={applyRect}
      >
        <table ref={tableRef} style={tableFrameStyle(style)}>
          <tbody>
            {table.cells.map((row, rowIndex) => (
              // An explicit equal share stops a focused cell from pulling
              // height away from its neighbours when it gains a line box.
              <tr
                key={rowIndex}
                style={{ height: `${100 / table.cells.length}%` }}
              >
                {row.map((cell, columnIndex) => {
                  if (cell.hidden) return null;
                  const key = `${rowIndex}:${columnIndex}`;
                  const active =
                    editing?.row === rowIndex && editing.column === columnIndex;
                  return (
                    <td
                      key={key}
                      className="kd-table-cell"
                      ref={(el) => {
                        if (el) cellRefs.current.set(key, el);
                        else cellRefs.current.delete(key);
                      }}
                      rowSpan={cell.rowSpan}
                      colSpan={cell.colSpan}
                      contentEditable={!imageExportMode && active}
                      suppressContentEditableWarning
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        if (!table.locked) {
                          selectTable();
                          focusCell(rowIndex, columnIndex);
                        }
                      }}
                      onPointerDown={(event) => {
                        if (active) {
                          event.stopPropagation();
                          return;
                        }
                        const position = {
                          row: rowIndex,
                          column: columnIndex,
                        };
                        // Shift extends the cell range. Kept from the wrapper so
                        // it does not toggle element-level multi-selection.
                        if (
                          event.shiftKey &&
                          cellSelection?.elementId === id &&
                          !table.locked
                        ) {
                          event.stopPropagation();
                          event.preventDefault();
                          setCellSelection({
                            elementId: id,
                            anchor: cellSelection.anchor,
                            focus: position,
                          });
                          pressedCellRef.current = null;
                          return;
                        }
                        setCellSelection({
                          elementId: id,
                          anchor: position,
                          focus: position,
                        });
                        pressedCellRef.current = position;
                        pressedWhileSelectedRef.current = isSelected;
                      }}
                      onClick={() => {
                        // While another cell is being edited the wrapper skips
                        // pointer capture, so this click arrives here directly
                        // and can carry the caret over to the next cell.
                        if (active || table.locked || readOnly || imageExportMode)
                          return;
                        if (!isSelected) return;
                        focusCell(rowIndex, columnIndex);
                      }}
                      // A cell only ever receives focus because it is being
                      // edited, so its blur always carries text worth keeping.
                      // Testing `active` here used to drop it: Tab (and a click
                      // on another cell) moves `editing` on first, so by the
                      // time the blur landed this cell no longer looked active.
                      onBlur={(event) => {
                        commitCell(
                          { row: rowIndex, column: columnIndex },
                          event.currentTarget.innerText,
                        );
                        // Only the cell still holding the caret may clear it —
                        // otherwise leaving one cell would cancel the next.
                        setEditing((current) =>
                          current?.row === rowIndex && current.column === columnIndex
                            ? null
                            : current,
                        );
                      }}
                      onKeyDown={(event) =>
                        onCellKeyDown(event, rowIndex, columnIndex)
                      }
                      style={{
                        ...tableCellStyle(style, {
                          row: rowIndex,
                          column: columnIndex,
                          rowCount: table.cells.length,
                          columnCount: row.length,
                          colSpan: cell.colSpan,
                        }),
                        outline: active ? "2px solid #4f8ef7" : "none",
                        // Range highlight rides on an inset shadow so it never
                        // changes the cell's size the way a border would.
                        boxShadow:
                          !active &&
                          isSelected &&
                          !imageExportMode &&
                          highlightRange &&
                          rangeContains(highlightRange, rowIndex, columnIndex)
                            ? "inset 0 0 0 2px rgba(79, 142, 247, 0.65)"
                            : undefined,
                        cursor: active ? "text" : "inherit",
                        userSelect: active ? "text" : "none",
                      }}
                    >
                      {cell.text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CanvasDragDrop>
      {isSelected && contextMenuPos && (
        <ElementContextMenu
          position={contextMenuPos}
          elementId={id}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
}

export default memo(
  RenderTable,
  (previous, next) =>
    previous.id === next.id &&
    previous.data === next.data &&
    previous.slideIndex === next.slideIndex &&
    previous.clipBounds?.width === next.clipBounds?.width &&
    previous.clipBounds?.height === next.clipBounds?.height,
);
