/**
 * Dropping a picture that is already on the page into a frame.
 *
 * Panels hand images over through the HTML drag-and-drop channel, which the
 * frame itself listens to. An image *element* on the canvas is dragged with the
 * pointer instead — there is no drop event to listen for — so the test happens
 * where that gesture ends: if the picture was let go over a frame, the frame
 * takes it and the loose element goes away.
 */

import useEditorStore, { type FrameData, type ElementData } from "@editor/store/editorStore";

const DEG = Math.PI / 180;

type Box = { x: number; y: number; width: number; height: number; rotation?: number };

/** Whether a page-space point falls inside a box, honouring its rotation. */
const contains = (box: Box, px: number, py: number) => {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const angle = -(box.rotation ?? 0) * DEG;
  const dx = px - cx;
  const dy = py - cy;
  const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
  return (
    Math.abs(localX) <= box.width / 2 && Math.abs(localY) <= box.height / 2
  );
};

/**
 * Hands the dragged picture to the frame it was released over, if any.
 *
 * Returns true when a frame took it, so the caller knows not to also write the
 * element's new position back — it no longer exists.
 */
export const dropImageIntoFrame = ({
  elementId,
  src,
  rect,
}: {
  elementId: string;
  src: string;
  rect: Box;
}) => {
  if (!src) return false;
  const store = useEditorStore.getState();
  const slide = store.slides[store.activeSlide];
  if (!slide) return false;

  const centreX = rect.x + rect.width / 2;
  const centreY = rect.y + rect.height / 2;

  // Later elements are drawn on top, so the last match is the one the author
  // was aiming at.
  let target: string | null = null;
  for (const element of slide.elements) {
    if (element.id === elementId) continue;
    const data = element.data as ElementData;
    if (data.type !== "frame") continue;
    if (contains(data as FrameData, centreX, centreY)) target = element.id;
  }
  if (!target) return false;

  store.fillFrameWithImage(target, src, elementId);
  return true;
};
