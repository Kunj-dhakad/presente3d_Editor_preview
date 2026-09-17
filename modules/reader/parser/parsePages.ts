import type { PreviewPage } from "../types/book";
import type { PreviewBlock } from "../types/blocks";
import { parseBlock } from "./parseBlocks";
import { fallbackId, isRecord, list, num, optStr, str } from "./primitives";
import { DEFAULT_PAGE_HEIGHT, DEFAULT_PAGE_WIDTH } from "../constants/reader";

/**
 * Blocks are painted in array order, but an explicit zIndex — when the author
 * set one — wins. A stable sort keeps authoring order as the tiebreak.
 */
const byPaintOrder = (blocks: PreviewBlock[]): PreviewBlock[] =>
  blocks
    .map((block, order) => ({ block, order }))
    .sort((a, b) => {
      const az = a.block.zIndex ?? 0;
      const bz = b.block.zIndex ?? 0;
      return az === bz ? a.order - b.order : az - bz;
    })
    .map(({ block }) => block);

export function parsePage(raw: unknown, index: number): PreviewPage {
  const record = isRecord(raw) ? raw : {};
  const blocks = list(record.elements)
    .map(parseBlock)
    .filter((block): block is PreviewBlock => block !== null);

  return {
    id: str(record.id) || fallbackId(`page${index}`),
    index,
    width: num(record.width, DEFAULT_PAGE_WIDTH),
    height: num(record.height, DEFAULT_PAGE_HEIGHT),
    background: optStr(record.background),
    blocks: byPaintOrder(blocks),
  };
}

export function parsePages(raw: unknown): PreviewPage[] {
  return list(raw).map(parsePage);
}
