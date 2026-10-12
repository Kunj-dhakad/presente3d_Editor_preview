"use client";

import React, { memo } from "react";
import type { TableBlock } from "../types/blocks";
import { blockFrame } from "../utils/blockStyles";
import { tableCellStyle, tableFrameStyle } from "@editor/blocks/Table/lib/tableStyle";

interface Props {
  block: TableBlock;
}

/** Drawn with the editor's own table styles, so heading rows, banding and grid lines match. */
const TableRenderer = memo(function TableRenderer({ block }: Props) {
  if (block.hidden) return null;
  const { style } = block;
  const rowCount = block.cells.length;
  const columnCount = block.cells[0]?.length ?? 0;

  return (
    <div data-block-id={block.id} style={blockFrame(block, { opacity: block.opacity })}>
      <table style={tableFrameStyle(style)}>
        <tbody>
          {block.cells.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, columnIndex) =>
                cell.hidden ? null : (
                  <td
                    key={`${rowIndex}:${columnIndex}`}
                    rowSpan={cell.rowSpan}
                    colSpan={cell.colSpan}
                    style={tableCellStyle(style, { row: rowIndex, column: columnIndex, rowCount, columnCount, colSpan: cell.colSpan })}
                  >
                    {cell.text}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default TableRenderer;
