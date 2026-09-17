/**
 * The vocabulary the asset panels and the canvas share when something is
 * dragged onto a page.
 *
 * Both sides used to spell these MIME types out by hand, and they drifted: the
 * button panel wrote `application/button-style` while the canvas read
 * `application/button-preset`, the video panels wrote `application/video-src`
 * which nothing read at all, and the template panel wrote
 * `application/shape-svg` against the canvas's `application/shape`. Each of
 * those made a drag land on the page and do nothing at all — no element, no
 * error. Naming them once, and handing both sides a function instead of a
 * string, is what stops that from happening again.
 */

/** Every payload slot a drag can carry. */
export const DRAG_MIME = {
  /** What is being dragged — a preset key, or a media/element kind. */
  element: "application/element",
  imageSrc: "application/image-src",
  videoSrc: "application/video-src",
  /** URL of the SVG a shape template renders. */
  shapeSvg: "application/shape-svg",
  /** Which entry of the button gallery — kept for provenance on the element. */
  buttonStyle: "application/button-style",
  /** The gallery entry's own style object, serialized. */
  buttonData: "application/button-data",
  /** URL of the text template's JSON document. */
  textTemplateUrl: "application/text-template-url",
  /** Optional preview text carried by a text preset. */
  sample: "application/sample",
} as const;

/** `element` values that are a kind rather than a preset key. */
export const DRAG_KIND = {
  image: "image",
  video: "video",
  shape: "shape",
  button: "button",
  textTemplate: "text-template",
} as const;

type Transfer = DataTransfer;

/* ==================== WRITERS ==================== */

export const setImageDrag = (dt: Transfer, src: string) => {
  dt.setData(DRAG_MIME.element, DRAG_KIND.image);
  dt.setData(DRAG_MIME.imageSrc, src);
};

export const setVideoDrag = (dt: Transfer, src: string) => {
  dt.setData(DRAG_MIME.element, DRAG_KIND.video);
  dt.setData(DRAG_MIME.videoSrc, src);
};

export const setShapeDrag = (dt: Transfer, svgUrl: string) => {
  dt.setData(DRAG_MIME.element, DRAG_KIND.shape);
  dt.setData(DRAG_MIME.shapeSvg, svgUrl);
};

export const setButtonDrag = (
  dt: Transfer,
  styleId: string,
  data: Record<string, unknown>,
) => {
  dt.setData(DRAG_MIME.element, DRAG_KIND.button);
  dt.setData(DRAG_MIME.buttonStyle, styleId);
  dt.setData(DRAG_MIME.buttonData, JSON.stringify(data));
};

/** A default text style — `presetKey` is looked up in TEXT_PRESETS on drop. */
export const setTextDrag = (dt: Transfer, presetKey: string, sample?: string) => {
  dt.setData(DRAG_MIME.element, presetKey);
  if (sample) dt.setData(DRAG_MIME.sample, sample);
};

export const setTextTemplateDrag = (dt: Transfer, jsonUrl: string) => {
  dt.setData(DRAG_MIME.element, DRAG_KIND.textTemplate);
  dt.setData(DRAG_MIME.textTemplateUrl, jsonUrl);
};

/* ==================== READER ==================== */

export type DragPayload = {
  element: string;
  imageSrc: string;
  videoSrc: string;
  shapeSvg: string;
  buttonStyle: string;
  /** Parsed from `buttonData`; null when absent or malformed. */
  buttonData: Record<string, unknown> | null;
  textTemplateUrl: string;
};

export const readDragPayload = (dt: Transfer): DragPayload => {
  const rawButtonData = dt.getData(DRAG_MIME.buttonData);

  let buttonData: Record<string, unknown> | null = null;
  if (rawButtonData) {
    try {
      const parsed = JSON.parse(rawButtonData);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        buttonData = parsed as Record<string, unknown>;
      }
    } catch {
      // A drag from outside the editor can put anything in here; a button with
      // its gallery styling missing is still better than a swallowed drop.
    }
  }

  return {
    element: dt.getData(DRAG_MIME.element),
    imageSrc: dt.getData(DRAG_MIME.imageSrc),
    videoSrc: dt.getData(DRAG_MIME.videoSrc),
    shapeSvg: dt.getData(DRAG_MIME.shapeSvg),
    buttonStyle: dt.getData(DRAG_MIME.buttonStyle),
    buttonData,
    textTemplateUrl: dt.getData(DRAG_MIME.textTemplateUrl),
  };
};
