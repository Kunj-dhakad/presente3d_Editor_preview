"use client";

import React, { useMemo } from "react";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
} from "lucide-react";
import useEditorStore, { TableCell, TableData } from "@editor/store/editorStore";
import {
  deleteColumn as deleteColumnAt,
  deleteRow as deleteRowAt,
  insertColumn as insertColumnAt,
  insertRow as insertRowAt,
} from "@editor/blocks/Table/lib/cellGrid";
import {
  applyPreset,
  inferLayout,
  inferTheme,
  presetFor,
  tableLayouts,
  tablePalettes,
  type TableLayoutId,
  type TableThemeId,
} from "@editor/blocks/Table/lib/tableThemes";
import { useTableActions } from "@editor/blocks/Table/lib/useTableActions";
import {
  Block,
  Field,
  Hint,
  Section,
  Segmented,
  Swatch,
  Switch,
  Toggle,
  actionButton,
  numberInput,
  numeric as value,
  smallInput,
  textInput,
} from "@editor/layout/EditBarPanel/SettingsControls";

export default function TableSettings() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const table = useMemo(
    () =>
      slides[activeSlide]?.elements.find((element) => element.id === activeId)?.data as
        | TableData
        | undefined,
    [activeId, activeSlide, slides],
  );
  const actions = useTableActions(
    activeId ?? "",
    (table ?? { cells: [] }) as TableData,
  );
  if (!table || table.type !== "table" || !activeId) return null;

  const patch = (p: Partial<TableData>) => updateElement(activeId, p, { history: true });
  const updateStyle = (p: Partial<TableData["style"]>) =>
    patch({ style: { ...table.style, ...p } });
  const commit = (cells: TableCell[][]) =>
    patch({ rows: cells.length, columns: cells[0]?.length ?? 0, cells });

  const rowCount = table.cells.length;
  const columnCount = table.cells[0]?.length ?? 0;

  // Counts are reached one row/column at a time; rebuilding the grid from
  // scratch would throw away merged cells.
  const resize = (rows: number, columns: number) => {
    let cells: TableCell[][] = table.cells;
    while (cells.length < rows) cells = insertRowAt(cells, cells.length);
    while (cells.length > rows && cells.length > 1) cells = deleteRowAt(cells, cells.length - 1);
    while ((cells[0]?.length ?? 0) < columns) cells = insertColumnAt(cells, cells[0]?.length ?? 0);
    while ((cells[0]?.length ?? 0) > columns && (cells[0]?.length ?? 0) > 1)
      cells = deleteColumnAt(cells, (cells[0]?.length ?? 1) - 1);
    commit(cells);
  };

  const spacing = table.style.cellSpacing ?? 0;

  // Colour and layout are picked separately here, so changing one keeps the
  // other — unlike the library, where a card sets both at once.
  const layout = inferLayout(table.style);
  const theme = inferTheme(table.style);
  const repaint = (next: ReturnType<typeof presetFor>) =>
    patch({ styleId: next.id, style: applyPreset(table.style, next) });
  const applyTheme = (id: TableThemeId) => repaint(presetFor(id, layout));
  const applyLayout = (id: TableLayoutId) =>
    repaint(presetFor(theme ?? "slate", id));

  return (
    <div className="pb-6">
      {/* The library panel is where looks are browsed as pictures. Here they are
          two plain controls instead, so editing never repeats the add flow. */}
      <Section title="Style">
        <Field label="Colour">
          <span className="flex items-center gap-1.5">
            {tablePalettes.map((palette) => (
              <button
                key={palette.id}
                type="button"
                title={palette.label}
                onClick={() => applyTheme(palette.id)}
                style={{ background: palette.base }}
                className={`kd-set-dot-choice ${
                  theme === palette.id ? "kd-set-dot-choice-active" : ""
                }`}
              />
            ))}
          </span>
        </Field>
        <Field label="Layout">
          <Segmented
            options={tableLayouts.map((item) => ({
              value: item.id,
              label: item.label.split(" ")[0],
            }))}
            active={layout}
            onChange={applyLayout}
          />
        </Field>
      </Section>

      <Section title="Table">
        <Field label="Rows">
          <input
            className={numberInput}
            type="number"
            min="1"
            value={rowCount}
            onChange={(e) => resize(Math.max(1, value(e.target.value, rowCount)), columnCount)}
          />
        </Field>
        <Field label="Columns">
          <input
            className={numberInput}
            type="number"
            min="1"
            value={columnCount}
            onChange={(e) => resize(rowCount, Math.max(1, value(e.target.value, columnCount)))}
          />
        </Field>
        <Field label="Size (W × H)">
          <input
            className={smallInput}
            type="number"
            min="40"
            value={Math.round(table.width)}
            onChange={(e) => patch({ width: value(e.target.value, table.width) })}
          />
          <input
            className={smallInput}
            type="number"
            min="20"
            value={Math.round(table.height)}
            onChange={(e) => patch({ height: value(e.target.value, table.height) })}
          />
        </Field>
        <Field label="Cell size">
          <span className="kd-set-readout">
            {Math.round(table.width / Math.max(1, columnCount))} ×{" "}
            {Math.round(table.height / Math.max(1, rowCount))} px
          </span>
        </Field>
      </Section>

      {/* Everything here works from the cells picked on the canvas, so the panel
          says which ones those are instead of asking for row/column numbers. */}
      <Section title="Rows & columns">
        <Hint>
          {actions.target
            ? `Working from ${actions.target}.`
            : "Click a cell on the canvas to pick what these act on."}
        </Hint>
        <Block className="grid grid-cols-2 gap-1.5">
          <button type="button" className={actionButton} onClick={actions.addRowAbove}>
            <ArrowUpToLine size={12} /> Row above
          </button>
          <button type="button" className={actionButton} onClick={actions.addRowBelow}>
            <ArrowDownToLine size={12} /> Row below
          </button>
          <button type="button" className={actionButton} onClick={actions.addColumnLeft}>
            <ArrowLeftToLine size={12} /> Column left
          </button>
          <button type="button" className={actionButton} onClick={actions.addColumnRight}>
            <ArrowRightToLine size={12} /> Column right
          </button>
          <button
            type="button"
            className={actionButton}
            disabled={!actions.canDeleteRow}
            onClick={actions.deleteSelectedRows}
          >
            <Trash2 size={12} /> Delete row
          </button>
          <button
            type="button"
            className={actionButton}
            disabled={!actions.canDeleteColumn}
            onClick={actions.deleteSelectedColumns}
          >
            <Trash2 size={12} /> Delete column
          </button>
          <button
            type="button"
            className={actionButton}
            disabled={!actions.canMerge}
            onClick={actions.merge}
            title={actions.mergePlan?.label ?? "Pick cells to merge"}
          >
            <TableCellsMerge size={12} /> Merge
          </button>
          <button
            type="button"
            className={actionButton}
            disabled={!actions.canSplit}
            onClick={actions.split}
            title="Split the merged cells back apart"
          >
            <TableCellsSplit size={12} /> Split
          </button>
        </Block>
        <Hint>
          Tip: click a cell, then Shift+click another to select a block of cells.
        </Hint>
      </Section>

      <Section title="Layout">
        <Field label="Header row">
          <Switch
            on={Boolean(table.style.headerRow)}
            onChange={(next) => updateStyle({ headerRow: next })}
          />
        </Field>
        {table.style.headerRow && (
          <Field label="Header fill">
            <Swatch
              color={table.style.headerBackground ?? table.style.cellBackground}
              onChange={(next) => updateStyle({ headerBackground: next })}
            />
            <Swatch
              color={table.style.headerTextColor ?? "#ffffff"}
              onChange={(next) => updateStyle({ headerTextColor: next })}
            />
          </Field>
        )}
        <Field label="Banded rows">
          <Switch
            on={Boolean(table.style.bandedRows)}
            onChange={(next) => updateStyle({ bandedRows: next })}
          />
        </Field>
        {table.style.bandedRows && (
          <Field label="Band fill">
            <Swatch
              color={table.style.bandBackground ?? table.style.cellBackground}
              onChange={(next) => updateStyle({ bandBackground: next })}
            />
          </Field>
        )}
        <Field label="Cell gap">
          <input
            className={numberInput}
            type="number"
            min="0"
            max="24"
            value={spacing}
            onChange={(e) => updateStyle({ cellSpacing: Math.max(0, value(e.target.value, spacing)) })}
          />
        </Field>
        {spacing > 0 && (
          <Field label="Cell radius">
            <input
              className={numberInput}
              type="number"
              min="0"
              value={table.style.cellRadius ?? 0}
              onChange={(e) => updateStyle({ cellRadius: Math.max(0, value(e.target.value, 0)) })}
            />
          </Field>
        )}
      </Section>

      <Section title="Borders & fill">
        <Field label="Grid lines">
          <Segmented
            options={[
              { value: "all", label: "All" },
              { value: "horizontal", label: "Rows" },
              { value: "outer", label: "Frame" },
              { value: "none", label: "None" },
            ]}
            active={table.style.borderStyle ?? "all"}
            onChange={(next) => updateStyle({ borderStyle: next })}
          />
        </Field>
        <Field label="Line width">
          <input
            className={numberInput}
            type="number"
            min="0"
            step="0.5"
            value={table.style.borderWidth}
            onChange={(e) => updateStyle({ borderWidth: value(e.target.value, table.style.borderWidth) })}
          />
        </Field>
        <Field label="Corner radius">
          <input
            className={numberInput}
            type="number"
            min="0"
            value={table.style.borderRadius ?? 0}
            onChange={(e) => updateStyle({ borderRadius: value(e.target.value, 0) })}
          />
        </Field>
        <Field label="Cell padding">
          <input
            className={numberInput}
            type="number"
            min="0"
            value={table.style.padding}
            onChange={(e) => updateStyle({ padding: value(e.target.value, table.style.padding) })}
          />
        </Field>
        <Field label="Line color">
          <Swatch color={table.style.borderColor} onChange={(next) => updateStyle({ borderColor: next })} />
        </Field>
        <Field label="Table fill">
          <Swatch color={table.style.background} onChange={(next) => updateStyle({ background: next })} />
        </Field>
        <Field label="Cell fill">
          <Swatch color={table.style.cellBackground} onChange={(next) => updateStyle({ cellBackground: next })} />
        </Field>
      </Section>

      <Section title="Text">
        <Field label="Font">
          <input
            className={textInput}
            value={table.style.fontFamily}
            onChange={(e) => updateStyle({ fontFamily: e.target.value })}
          />
        </Field>
        <Field label="Font size">
          <input
            className={numberInput}
            type="number"
            min="1"
            value={table.style.fontSize}
            onChange={(e) => updateStyle({ fontSize: value(e.target.value, table.style.fontSize) })}
          />
        </Field>
        <Field label="Color">
          <Swatch color={table.style.textColor} onChange={(next) => updateStyle({ textColor: next })} />
        </Field>
        <Field label="Format">
          <Toggle
            active={Number(table.style.fontWeight) >= 700}
            label="B"
            title="Bold"
            style={{ fontWeight: 700 }}
            onClick={() =>
              updateStyle({ fontWeight: Number(table.style.fontWeight) >= 700 ? 400 : 700 })
            }
          />
          <Toggle
            active={table.style.fontStyle === "italic"}
            label="I"
            title="Italic"
            style={{ fontStyle: "italic" }}
            onClick={() =>
              updateStyle({ fontStyle: table.style.fontStyle === "italic" ? "normal" : "italic" })
            }
          />
          <Toggle
            active={table.style.textDecoration === "underline"}
            label="U"
            title="Underline"
            style={{ textDecoration: "underline" }}
            onClick={() =>
              updateStyle({
                textDecoration:
                  table.style.textDecoration === "underline" ? "none" : "underline",
              })
            }
          />
        </Field>
        <Field label="Align">
          <Segmented
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            active={table.style.textAlign}
            onChange={(next) => updateStyle({ textAlign: next })}
          />
        </Field>
        <Field label="Vertical">
          <Segmented
            options={[
              { value: "top", label: "Top" },
              { value: "middle", label: "Mid" },
              { value: "bottom", label: "Bottom" },
            ]}
            active={table.style.verticalAlign}
            onChange={(next) => updateStyle({ verticalAlign: next })}
          />
        </Field>
      </Section>
    </div>
  );
}
