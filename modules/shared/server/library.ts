import elements from "@/data/library/element.json";
import backgrounds from "@/data/library/background.json";
import texts from "@/data/library/text.json";
import templates from "@/data/library/template.json";

/**
 * The editor's built-in catalogue. It is the same for every user and only
 * changes with a deploy, so it ships as JSON (scripts/export-library.cjs).
 */
type Item = Record<string, unknown>;
const catalogue: Record<string, Item[]> = {
  element: elements as Item[],
  background: backgrounds as Item[],
  text: texts as Item[],
  template: templates as Item[],
};

export function libraryItems(kind: string, search = "") {
  const items = catalogue[kind] ?? [];
  const term = search.slice(0, 100).trim().toLowerCase();
  if (!term) return items;
  return items.filter(item => String(item.title ?? item.name ?? "").toLowerCase().includes(term));
}
