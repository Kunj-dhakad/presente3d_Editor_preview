/**
 * The crop presets, shared by the panel that lists them and the overlay that
 * applies them. They used to live only in the panel, which is why a ratio
 * picked before opening the cropper was shown as selected but never applied.
 */

export type CropRatio = {
  label: string;
  value: string;
  /** NaN leaves the crop box free to take whatever shape the user drags. */
  ratio: number;
  shape: "full" | "square" | "wide" | "tall";
};

export const CROP_RATIOS: CropRatio[] = [
  // "Full" selects the whole image; "Original" locks the image's own shape but
  // still lets you choose how much of it to keep. They read alike but do
  // different things, which is why both are here.
  { label: "Full", value: "full", ratio: NaN, shape: "full" },
  { label: "Original", value: "original", ratio: NaN, shape: "square" },
  { label: "1:1", value: "1:1", ratio: 1, shape: "square" },
  { label: "16:9", value: "16:9", ratio: 16 / 9, shape: "wide" },
  { label: "9:16", value: "9:16", ratio: 9 / 16, shape: "tall" },
  { label: "5:4", value: "5:4", ratio: 5 / 4, shape: "wide" },
  { label: "4:5", value: "4:5", ratio: 4 / 5, shape: "tall" },
  { label: "4:3", value: "4:3", ratio: 4 / 3, shape: "wide" },
  { label: "3:4", value: "3:4", ratio: 3 / 4, shape: "tall" },
  { label: "3:2", value: "3:2", ratio: 3 / 2, shape: "wide" },
  { label: "2:3", value: "2:3", ratio: 2 / 3, shape: "tall" },
];

export const DEFAULT_CROP_RATIO = "full";

/**
 * The aspect a preset asks for, or NaN for a free crop box. "Original" has no
 * fixed answer — it only means something once the image has been measured, so
 * the cropper's own reading is passed in.
 */
export const aspectFor = (value: string | undefined, naturalAspect: number) => {
  if (value === "original")
    return Number.isFinite(naturalAspect) && naturalAspect > 0
      ? naturalAspect
      : NaN;
  return CROP_RATIOS.find((preset) => preset.value === value)?.ratio ?? NaN;
};
