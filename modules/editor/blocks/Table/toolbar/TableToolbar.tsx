"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ChevronDown,
  Columns3,
  // Heading,
  Rows3,
  Settings2,
  // TableCellsMerge,
  // TableCellsSplit,
  Trash2,
} from "lucide-react";
import useEditorStore, { TableData } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { useTableActions } from "@editor/blocks/Table/lib/useTableActions";
import { KdTextEditMinus, KdTextEditPlus } from "@editor/lib/icon/icons";

const iconBtn = "kd-tool-btn kd-icon-btn-main p-1.5 rounded-md";
const stepper = "kd-canvasheader-fontsize-button p-0.5 flex items-center justify-between rounded-md text-sm";
const stepperBtn = "cursor-pointer px-2 h-full flex items-center";
const stepperValue = "kd-text-fontsize-value w-12 shrink-0 min-w-0 overflow-hidden tabular-nums flex items-center justify-center gap-1";
const menuItem =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs kd-fg transition kd-hv-bg-accent-subtle kd-hv-fg-accent disabled:cursor-not-allowed kd-dis-fg disabled:hover:bg-transparent";

export default function TableToolbar() {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<"insert" | "delete" | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const updateElement = useEditorStore((s) => s.updateElement);
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const element = slides[activeSlide]?.elements.find((item) => item.id === activeElementId);
  const data = element?.data;
  const table = data?.type === "table" ? (data as TableData) : null;
  const actions = useTableActions(element?.id ?? "", (table ?? { cells: [] }) as TableData);

  useEffect(() => {
    if (!openMenu) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenu]);

  if (!element || !table) return null;
  const id = element.id;

  const openPanel = (panel: string) => {
    const ui = useEditorUIStore.getState();
    if (ui.activePanelType === "main")
      ui.setLastMainPanel(useEditorStore.getState().activeRightPanel);
    useEditorStore.getState().setActiveRightPanel(panel);
    ui.setActivePanelType("edit");
    if (ui.sidebarWidth === "closed") ui.setSidebarWidth("edit");
  };

  const swatch = (
    key: string,
    label: string,
    value: string,
    onChange: (next: string) => void,
  ) => (
    <label
      className={`kd-tooltip-parent ${iconBtn} cursor-pointer kd-canvasheader-button-all relative`}
      onMouseEnter={() => setShowTooltip(key)}
      onMouseLeave={() => setShowTooltip(null)}
    >
      <span
        className="block h-4 w-4 rounded-sm border kd-bd-strong"
        style={{ background: value }}
      />
      <input
        aria-label={label}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      {showTooltip === key && <span className="kd-tooltip-bottom">{label}</span>}
    </label>
  );

  // const toolButton = (
  //   key: string,
  //   label: string,
  //   icon: React.ReactNode,
  //   onClick: () => void,
  //   disabled = false,
  //   active = false,
  // ) => (
  //   <button
  //     type="button"
  //     disabled={disabled}
  //     className={`kd-tooltip-parent ${iconBtn} kd-canvasheader-button-all ${
  //       disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
  //     } ${active ? "kd-fg-accent" : ""}`}
  //     onMouseEnter={() => setShowTooltip(key)}
  //     onMouseLeave={() => setShowTooltip(null)}

  //     onClick={() => {
  //       onClick();
  //       setShowTooltip(null);
  //     }}
  //   >
  //     {icon}
  //     {showTooltip === key && <span className="kd-tooltip-bottom">{label}</span>}
  //   </button>
  // );


  const scope = actions.target
    ? `Working from ${actions.target}`
    : "No cell picked — acts at the end of the table";

  const menu = (
    key: "insert" | "delete",
    label: string,
    items: { label: string; icon: React.ReactNode; disabled?: boolean; run: () => void }[],
  ) => (
    <div className="relative">
      <button
        type="button"
        className={`kd-canvasheader-nullText-button flex items-center gap-1 rounded-md px-3 py-1 text-sm transition-all duration-200 ${
          openMenu === key ? "kd-fg-accent" : ""
        }`}
        onClick={() => setOpenMenu(openMenu === key ? null : key)}
      >
        {label}
        <ChevronDown size={13} />
      </button>
      {openMenu === key && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border kd-bd-subtle kd-bg-surface p-1 shadow-lg">
          <p className="px-2 pb-1 pt-0.5 text-[10px] leading-snug kd-fg-subtle">
            {scope}
          </p>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              className={menuItem}
              onClick={() => {
                item.run();
                setOpenMenu(null);
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const headerOn = Boolean(table.style.headerRow);
  const restyle = (patch: Partial<TableData["style"]>) =>
    updateElement(id, { style: { ...table.style, ...patch } }, { history: true });

  return (
    <div
      ref={menuRef}
      data-element="true"
      data-copy-style-toolbar="true"
      className="kd-canvasheader-container h-10 mt-4 flex items-center justify-between px-1 py-1 rounded-lg"
    >
      <div className="flex items-center gap-1">
        <div className={stepper}>
          <span
            className={`${stepperBtn} ${actions.canDeleteRow ? "" : "opacity-40 cursor-not-allowed"}`}
            onClick={actions.deleteLastRow}
            title="Remove the last row"
          >
            <KdTextEditMinus />
          </span>
          <span className={stepperValue} title="Rows">
            <Rows3 size={13} />
            {actions.rowCount}
          </span>
          <span
            className={stepperBtn}
            onClick={actions.addRowAtEnd}
            title="Add a row at the end"
          >
            <KdTextEditPlus />
          </span>
        </div>

        {/* Columns */}
        <div className={stepper}>
          <span
            className={`${stepperBtn} ${actions.canDeleteColumn ? "" : "opacity-40 cursor-not-allowed"}`}
            onClick={actions.deleteLastColumn}
            title="Remove the last column"
          >
            <KdTextEditMinus />
          </span>
          <span className={stepperValue} title="Columns">
            <Columns3 size={13} />
            {actions.columnCount}
          </span>
          <span
            className={stepperBtn}
            onClick={actions.addColumnAtEnd}
            title="Add a column at the end"
          >
            <KdTextEditPlus />
          </span>
        </div>

        {menu("insert", "Insert", [
          { label: "Row above", icon: <ArrowUpToLine size={13} />, run: actions.addRowAbove },
          { label: "Row below", icon: <ArrowDownToLine size={13} />, run: actions.addRowBelow },
          { label: "Column left", icon: <ArrowLeftToLine size={13} />, run: actions.addColumnLeft },
          { label: "Column right", icon: <ArrowRightToLine size={13} />, run: actions.addColumnRight },
        ])}

        {menu("delete", "Delete", [
          {
            label: actions.hasSelection ? "Selected row(s)" : "Last row",
            icon: <Trash2 size={13} />,
            disabled: !actions.canDeleteRow,
            run: actions.hasSelection ? actions.deleteSelectedRows : actions.deleteLastRow,
          },
          {
            label: actions.hasSelection ? "Selected column(s)" : "Last column",
            icon: <Trash2 size={13} />,
            disabled: !actions.canDeleteColumn,
            run: actions.hasSelection
              ? actions.deleteSelectedColumns
              : actions.deleteLastColumn,
          },
        ])}

        {/* {toolButton(
          "merge",
          actions.mergePlan ? actions.mergePlan.label : "Click a cell in the table first",
          <TableCellsMerge size={15} />,
          actions.merge,
          !actions.canMerge,
        )} */}
        {/* {toolButton(
          "split",
          actions.canSplit ? "Split the merged cells" : "Select a merged cell to split it",
          <TableCellsSplit size={15} />,
          actions.split,
          !actions.canSplit,
        )} */}
        {/* {toolButton(
          "header",
          headerOn ? "Turn the header row off" : "Paint the first row as a header",
          <Heading size={15} />,
          () => restyle({ headerRow: !headerOn }),
          false,
          headerOn,
        )} */}

{/*       
        {swatch("border", "Line color", table.style.borderColor, (next) =>
          restyle({
            borderColor: next,
            borderWidth: Math.max(1, table.style.borderWidth),
            borderStyle:
              (table.style.borderStyle ?? "all") === "none"
                ? "all"
                : table.style.borderStyle,
          }),
        )} */}
        
        {swatch("fill", "Cell fill", table.style.cellBackground, (next) =>
          restyle({ cellBackground: next, bandedRows: false }),
        )}
        {headerOn &&
          swatch(
            "headerFill",
            "Header fill",
            table.style.headerBackground ?? table.style.cellBackground,
            (next) => restyle({ headerBackground: next }),
          )}

        {/* Position */}
        <button
          type="button"
          className="kd-tooltip-parent kd-canvasheader-nullText-button px-3 py-1 rounded-md text-sm cursor-pointer transition-all duration-200"
          onMouseEnter={() => setShowTooltip("position")}
          onMouseLeave={() => setShowTooltip(null)}
          onMouseDown={(event) => {
            event.preventDefault();
            openPanel("ItemPositionPanel");
          }}
        >
          Position
          {showTooltip === "position" && <span className="kd-tooltip-bottom">Position</span>}
        </button>

        {/* Settings only ever open from here — selecting a table no longer reopens them. */}
        <button
          type="button"
          className="kd-tooltip-parent kd-canvasheader-nullText-button flex items-center gap-1 px-3 py-1 rounded-md text-sm cursor-pointer transition-all duration-200"
          onMouseEnter={() => setShowTooltip("settings")}
          onMouseLeave={() => setShowTooltip(null)}
          onMouseDown={(event) => {
            event.preventDefault();
            openPanel("TableSettings");
          }}
        >
          <Settings2 size={14} />
          Table settings
          {showTooltip === "settings" && (
            <span className="kd-tooltip-bottom">Table Settings</span>
          )}
        </button>
      </div>
    </div>
  );
}
