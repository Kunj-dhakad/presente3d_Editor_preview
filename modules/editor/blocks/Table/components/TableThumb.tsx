"use client";

import React from "react";
import {
  tableCellStyle,
  tableFrameStyle,
  type TableVisualStyle,
} from "@editor/blocks/Table/lib/tableStyle";

type Props = {
  style: TableVisualStyle;
  rows?: number;
  columns?: number;
  height?: number;
};

/**
 * The look of a preset drawn at thumbnail size. It runs through the same style
 * helpers as the canvas, so a card can never promise a look the table will not
 * actually have.
 */
export default function TableThumb({
  style,
  rows = 4,
  columns = 3,
  height = 68,
}: Props) {
  // Empty cells only — padding and text would just muddy a 68px preview.
  const preview: TableVisualStyle = { ...style, padding: 0, fontSize: 1 };
  return (
    <div style={{ height, width: "100%" }} aria-hidden>
      <table style={tableFrameStyle(preview)}>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row} style={{ height: `${100 / rows}%` }}>
              {Array.from({ length: columns }, (_, column) => (
                <td
                  key={column}
                  style={tableCellStyle(preview, {
                    row,
                    column,
                    rowCount: rows,
                    columnCount: columns,
                  })}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
