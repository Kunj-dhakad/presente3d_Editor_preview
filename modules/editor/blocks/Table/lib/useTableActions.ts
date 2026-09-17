"use client";

/**
 * Every row/column/merge action a table offers, in one place.
 *
 * The top toolbar, the sidebar and the grips on the canvas all drive the same
 * functions here, so "add row" means the same thing wherever it is clicked and
 * the enabled/disabled state can never disagree between two surfaces.
 *
 * Everything is relative to the cell selection when there is one, and falls
 * back to the end of the table when there is not.
 */

import { useMemo } from "react";
import useEditorStore, { TableCell, TableData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import {
  CellPosition,
  CellRange,
  deleteColumns,
  deleteRows,
  extendRange,
  hasMergedCell,
  insertColumn,
  insertRow,
  mergeRange,
  normalizeRange,
  rangeArea,
  rangeOf,
  splitRange,
} from "@editor/blocks/Table/lib/cellGrid";

export type TableActions = ReturnType<typeof useTableActions>;

const EMPTY: TableCell[][] = [];

export function useTableActions(elementId: string, table: TableData) {
  const updateElement = useEditorStore((s) => s.updateElement);
  const cellSelection = useEditorUIStore((s) => s.tableCellSelection);
  const setCellSelection = useEditorUIStore((s) => s.setTableCellSelection);

  const cells = table.cells ?? EMPTY;
  const rowCount = cells.length;
  const columnCount = cells[0]?.length ?? 0;

  const selection = useMemo<CellRange | null>(
    () =>
      cellSelection && cellSelection.elementId === elementId
        ? normalizeRange(
            cells,
            rangeOf(cellSelection.anchor, cellSelection.focus),
          )
        : null,
    [cellSelection, elementId, cells],
  );

  return useMemo(() => {
    // Row/column edits go through the grid helpers so merged cells stay intact.
    const commit = (cells: TableCell[][]) =>
      updateElement(
        elementId,
        { rows: cells.length, columns: cells[0]?.length ?? 0, cells },
        { history: true },
      );

    const select = (anchor: CellPosition, focus: CellPosition = anchor) =>
      setCellSelection({ elementId, anchor, focus });

    const area = selection;
    const hasSelection = Boolean(area);
    // Without a picked cell the actions still work — they just act on the last
    // row/column instead of leaving the user with a dead button.
    const firstRow = area?.top ?? Math.max(0, rowCount - 1);
    const lastRow = area?.bottom ?? Math.max(0, rowCount - 1);
    const firstColumn = area?.left ?? Math.max(0, columnCount - 1);
    const lastColumn = area?.right ?? Math.max(0, columnCount - 1);

    const insertRowAt = (index: number) => {
      commit(insertRow(cells, index));
      select({ row: Math.min(index, rowCount), column: firstColumn });
    };
    const insertColumnAt = (index: number) => {
      commit(insertColumn(cells, index));
      select({ row: firstRow, column: Math.min(index, columnCount) });
    };

    // With a range picked, merge it. With a single cell, merge it into its
    // neighbour so one click still does something useful.
    const mergePlan = (() => {
      if (!area) return null;
      if (rangeArea(area) > 1)
        return { range: area, label: "Merge the selected cells" };
      const right = extendRange(cells, area, "right");
      if (right) return { range: right, label: "Merge with the cell on the right" };
      const down = extendRange(cells, area, "down");
      if (down) return { range: down, label: "Merge with the cell below" };
      return null;
    })();

    const canSplit = Boolean(area && hasMergedCell(cells, area));

    return {
      rowCount,
      columnCount,
      selection: area,
      hasSelection,
      /** 1-based description of what the actions will act on. */
      target: area
        ? rangeArea(area) > 1
          ? `rows ${area.top + 1}–${area.bottom + 1}, cols ${area.left + 1}–${area.right + 1}`
          : `row ${area.top + 1}, col ${area.left + 1}`
        : null,

      commit,
      select,

      insertRowAt,
      insertColumnAt,
      addRowAbove: () => insertRowAt(firstRow),
      addRowBelow: () => insertRowAt(lastRow + 1),
      addRowAtEnd: () => insertRowAt(rowCount),
      addColumnLeft: () => insertColumnAt(firstColumn),
      addColumnRight: () => insertColumnAt(lastColumn + 1),
      addColumnAtEnd: () => insertColumnAt(columnCount),

      canDeleteRow: rowCount > 1,
      canDeleteColumn: columnCount > 1,
      deleteSelectedRows: () => {
        if (rowCount <= 1) return;
        commit(deleteRows(cells, firstRow, lastRow));
        setCellSelection(null);
      },
      deleteSelectedColumns: () => {
        if (columnCount <= 1) return;
        commit(deleteColumns(cells, firstColumn, lastColumn));
        setCellSelection(null);
      },
      deleteLastRow: () =>
        rowCount > 1 && commit(deleteRows(cells, rowCount - 1, rowCount - 1)),
      deleteLastColumn: () =>
        columnCount > 1 &&
        commit(deleteColumns(cells, columnCount - 1, columnCount - 1)),

      mergePlan,
      canMerge: Boolean(mergePlan),
      merge: () => {
        if (!mergePlan) return;
        commit(mergeRange(cells, mergePlan.range));
        // Collapse the selection onto the cell that survived.
        select({ row: mergePlan.range.top, column: mergePlan.range.left });
      },
      canSplit,
      split: () => {
        if (!area || !canSplit) return;
        commit(splitRange(cells, area));
      },
    };
  }, [
    columnCount,
    elementId,
    rowCount,
    selection,
    setCellSelection,
    cells,
    updateElement,
  ]);
}
