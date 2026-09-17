"use client";

import React, { memo } from "react";
import type { TableBlock } from "../types/blocks";
import { blockFrame } from "../utils/blockStyles";

interface Props {
  block: TableBlock;
}

const TableRenderer = memo(function TableRenderer({ block }: Props) {
  if (block.hidden) return null;
  const { style } = block;

  return (
    <div data-block-id={block.id} style={blockFrame(block, { opacity: block.opacity })}>
      <table
        style={{
          width: "100%",
          height: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          background: style.background,
          borderRadius: style.borderRadius,
          overflow: "hidden",
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          textDecoration: style.textDecoration,
          color: style.textColor,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
        }}
      >
        <tbody>
          {block.cells.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, columnIndex) =>
                cell.hidden ? null : (
                  <td
                    key={`${rowIndex}:${columnIndex}`}
                    rowSpan={cell.rowSpan}
                    colSpan={cell.colSpan}
                    style={{
                      border: `${style.borderWidth}px solid ${style.borderColor}`,
                      background: style.cellBackground,
                      padding: style.padding,
                      boxSizing: "border-box",
                      textAlign: style.textAlign,
                      verticalAlign: style.verticalAlign,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      overflow: "hidden",
                    }}
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
