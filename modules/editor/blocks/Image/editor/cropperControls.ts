/**
 * Imperative handle into the mounted crop overlay.
 *
 * This lives in its own module so that panels which only need to *drive* the
 * cropper (ImageCropePanel) don't have to import ImageCropOverlay — importing
 * that pulls react-cropper + cropperjs (~600KB) into the initial bundle.
 * ImageCropOverlay assigns real implementations when it mounts, and puts the
 * idle ones back when it leaves so a closed cropper — and the full-size image
 * it holds — is not kept alive by this module.
 */

export type CroppedImage = {
  blob: Blob;
  /** Pixel size of the export, so the element can be reshaped to match it. */
  width: number;
  height: number;
};

type CropperControls = {
  /** Applies one of the presets in `cropRatios` to the live crop box. */
  applyPreset: (value: string) => void;
  /** Null when nothing is mounted, or when the export could not be read. */
  getCroppedBlob: () => Promise<CroppedImage | null>;
};

const idle: CropperControls = {
  applyPreset: () => {},
  getCroppedBlob: async () => null,
};

export const cropperControls: CropperControls = { ...idle };

export const resetCropperControls = () => {
  Object.assign(cropperControls, idle);
};
