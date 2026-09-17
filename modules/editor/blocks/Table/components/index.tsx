"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import TableThumb from "@editor/blocks/Table/components/TableThumb";
import {
  styleFromPreset,
  tableLayouts,
  tablePresets,
  type TablePreset,
} from "@editor/blocks/Table/lib/tableThemes";

const MAX_ROWS = 6;
const MAX_COLUMNS = 6;

/** Word-style hover grid: drag the eye across it, click a style to insert. */
function SizePicker({
  rows,
  columns,
  onPick,
}: {
  rows: number;
  columns: number;
  onPick: (rows: number, columns: number) => void;
}) {
  const [hover, setHover] = useState<{ rows: number; columns: number } | null>(
    null,
  );
  const active = hover ?? { rows, columns };
  return (
    <div className="rounded-xl border kd-bd-subtle kd-bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide kd-fg-muted">
          Size
        </span>
        <span className="text-xs font-medium kd-fg tabular-nums">
          {active.rows} × {active.columns}
        </span>
      </div>
      <div
        className="grid w-max gap-1"
        style={{ gridTemplateColumns: `repeat(${MAX_COLUMNS}, 16px)` }}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: MAX_ROWS * MAX_COLUMNS }, (_, index) => {
          const row = Math.floor(index / MAX_COLUMNS) + 1;
          const column = (index % MAX_COLUMNS) + 1;
          const on = row <= active.rows && column <= active.columns;
          return (
            <button
              key={index}
              type="button"
              aria-label={`${row} by ${column}`}
              onMouseEnter={() => setHover({ rows: row, columns: column })}
              onFocus={() => setHover({ rows: row, columns: column })}
              onClick={() => {
                onPick(row, column);
                setHover(null);
              }}
              className={`h-4 w-4 rounded-[3px] border transition ${
                on
                  ? "kd-bd-accent kd-bg-accent-subtle"
                  : "kd-bd-subtle kd-bg-app kd-hv-bd-accent"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function TableData() {
  const addElement = useEditorStore((s) => s.addElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const back = useEditorUIStore((s) => s.setActiveElementsCategory);
  const [size, setSize] = useState({ rows: 3, columns: 3 });
  const canvas = slides[activeSlide];

  const insert = (preset: TablePreset) => {
    const { rows, columns } = size;
    const width = Math.min(520, Math.max(120, (canvas?.width ?? 432) - 32));
    // Rows get a readable minimum height rather than one squeezed share of a
    // fixed box, so a 6-row table does not arrive as six hairlines.
    const height = Math.min(
      Math.max(90, (canvas?.height ?? 240) - 32),
      Math.max(90, rows * 44),
    );
    addElement({
      type: "table",
      x: Math.max(16, ((canvas?.width ?? width) - width) / 2),
      y: Math.max(16, ((canvas?.height ?? height) - height) / 2),
      width,
      height,
      rotation: 0,
      rows,
      columns,
      styleId: preset.id,
      cells: Array.from({ length: rows }, () =>
        Array.from({ length: columns }, () => ({ text: "" })),
      ),
      style: styleFromPreset(preset),
    });
    // Fresh tables open their settings once, like a newly added interaction.
    // Re-selecting the table later never reopens them; only the top toolbar does.
    const inserted = useEditorStore
      .getState()
      .slides[activeSlide]?.elements.at(-1);
    if (inserted) useEditorStore.getState().setActiveElementId(inserted.id);
    const ui = useEditorUIStore.getState();
    if (ui.activePanelType === "main")
      ui.setLastMainPanel(useEditorStore.getState().activeRightPanel);
    useEditorStore.getState().setActiveRightPanel("TableSettings");
    ui.setActivePanelType("edit");
    ui.setSidebarWidth("edit");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 pt-3">
        <button
          type="button"
          onClick={() => back(null)}
          className="rounded-md p-1 kd-fg-muted transition kd-hv-bg-sunken"
          aria-label="Back to elements"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="kd-toolPanel-heding-text">Table Data</h2>
          <p className="text-[11px] kd-fg-muted">Elements / Table Library</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 pt-3 kd-custom-scrollbar">
        <SizePicker
          rows={size.rows}
          columns={size.columns}
          onPick={(rows, columns) => setSize({ rows, columns })}
        />

        {tableLayouts.map((layout) => (
          <section key={layout.id} className="mt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide kd-fg-muted">
              {layout.label}
            </h3>
            <p className="mb-2 text-[11px] kd-fg-subtle">{layout.caption}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {tablePresets
                .filter((preset) => preset.layout === layout.id)
                .map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={`${preset.label} — insert ${size.rows} × ${size.columns}`}
                    onClick={() => insert(preset)}
                    className="rounded-lg border kd-bd-subtle kd-bg-surface p-2 transition hover:-translate-y-0.5 kd-hv-bd-accent hover:shadow-md focus:outline-none focus:ring-2 kd-fc-ring"
                  >
                    {/* The picked size, not a clamped stand-in: the preview has
                        to show the table the click will actually insert. */}
                    <TableThumb
                      style={styleFromPreset(preset)}
                      rows={size.rows}
                      columns={size.columns}
                    />
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
