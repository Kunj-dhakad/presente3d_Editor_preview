/**
 * Theme vars ko `:root` par inline set karta hai — yani ye
 * styles/globals.css ke `:root` tokens ko override karte hain.
 *
 * Do layer hain:
 *   - "mode"    : user ka light / dark toggle
 *   - "project" : host se aaye projectID ka brand theme
 *                 (mode ke upar jeetta hai)
 *
 * Inline style me ek property ki ek hi value hoti hai, isliye
 * "pehle mode phir project" likh dene se kaam nahi chalta — jo
 * baad me chale wahi jeet jaata hai. Isliye dono layer yahan
 * memory me rakhe jaate hain aur har baar MERGED result likha
 * jaata hai. Jo key ab kisi layer me nahi hai use hata diya jaata
 * hai, taaki light par switch karte hi dark ke vars sach me chale
 * jayein aur `:root` ki default light value wapas lag jaye.
 */
export type ThemeLayer = "mode" | "project";

const layers: Record<ThemeLayer, Record<string, string>> = {
  mode: {},
  project: {},
};

let written: string[] = [];

export function applyTheme(
  themeVars: Record<string, string>,
  layer: ThemeLayer = "project",
) {
  layers[layer] = themeVars ?? {};
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  // project brand override user ke light/dark se zyada specific hai.
  const merged = { ...layers.mode, ...layers.project };

  for (const key of written) {
    if (!(key in merged)) root.style.removeProperty(key);
  }
  for (const [key, value] of Object.entries(merged)) {
    root.style.setProperty(key, value);
  }
  written = Object.keys(merged);
}

/** Abhi kaunsa mode/project theme laga hua hai — debugging ke liye. */
export function activeThemeVars(): Record<string, string> {
  return { ...layers.mode, ...layers.project };
}
