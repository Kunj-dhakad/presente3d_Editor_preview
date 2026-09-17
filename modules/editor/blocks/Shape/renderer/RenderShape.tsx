import React, { useCallback, memo } from "react";
import { useShallow } from "zustand/shallow";
import useEditorStore, { ElementData, ShapeData, ShapeEffect } from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";
import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import ElementContextMenu from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";
import { useElementContextMenu } from "@editor/layout/EditorCanvas/RenderElement/useElementContextMenu";
import {
    buildShapeFilter,
    hasGradientFill,
    resolveShapePaint,
    stripPaintableFills,
    svgGradientVector,
} from "@editor/lib/canvas/shapeEffects";

/**
 * The effect is compared field by field because the memo below is an explicit
 * list rather than a shallow object compare. `effect` is a nested object, so
 * `===` would hold only when the store happened to reuse it — and a slider
 * drag would then render nothing at all.
 */
const sameEffect = (a: ShapeEffect | undefined, b: ShapeEffect | undefined) => {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
        a.type === b.type &&
        a.preset === b.preset &&
        a.direction === b.direction &&
        a.offset === b.offset &&
        a.blur === b.blur &&
        a.transparency === b.transparency &&
        a.intensity === b.intensity &&
        a.color === b.color
    );
};

const RenderShape: React.FC<{
    id: string;
    data: ElementData;
    slideIndex: number;
    clipBounds?: PageClipBounds;
}> = memo(({ id, data, slideIndex, clipBounds }) => {
    const { updateElement, setActiveElementId, setActiveSlide, toggleSelectedElementId } = useEditorStore(
        useShallow((s) => ({
            updateElement: s.updateElement,
            setActiveElementId: s.setActiveElementId,
            setActiveSlide: s.setActiveSlide,
            toggleSelectedElementId: s.toggleSelectedElementId,
        }))
    );

    const isSelected = useEditorStore(
        useCallback((s) => s.selectedElementIds.includes(id), [id])
    );

    const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
    const { contextMenuPos, handleContextMenu, closeContextMenu } =
        useElementContextMenu(id, slideIndex);

    const shapeData = data.type === "shape" ? (data as ShapeData) : null;

    if (!shapeData) return null;

    // Derived from stored JSON and nothing else. That is what lets the preview
    // reader — which mounts this very component — come out identical to the
    // editor with no second implementation to keep in step.
    //
    // Left unmemoized on purpose: the compiler handles that, and the comparator
    // at the bottom of this file already stops the component re-rendering unless
    // one of these very inputs changed.
    const { filter, bleed } = buildShapeFilter(
        shapeData.effect,
        shapeData.width,
        shapeData.height,
    );

    // A gradient has to be declared inside the SVG: `fill` takes a paint server
    // reference, not a CSS `linear-gradient()`. The defs are prepended to the
    // shape's own markup so both go in through the one innerHTML.
    //
    // The strip is what makes any of this take effect at all — see
    // stripPaintableFills. Without it the library's own `fill="currentColor"`
    // wins and neither the colour nor the gradient below is ever seen.
    const gradientId = `shape-grad-${id}`;
    const gradient = svgGradientVector(shapeData.gradientDirection);
    const useGradient = hasGradientFill(shapeData);
    const fillValue = resolveShapePaint(shapeData, gradientId);
    const shapeMarkup = stripPaintableFills(shapeData.shape ?? "");
    const markup = useGradient
        ? `<defs><linearGradient id="${gradientId}" ` +
          `x1="${gradient.x1}" y1="${gradient.y1}" x2="${gradient.x2}" y2="${gradient.y2}">` +
          `<stop offset="0%" stop-color="${shapeData.gradientFrom}"/>` +
          `<stop offset="100%" stop-color="${shapeData.gradientTo}"/>` +
          `</linearGradient></defs>${shapeMarkup}`
        : shapeMarkup;

    return (
        <>
            <CanvasDragDrop
                id={id}
                rect={{
                    x: shapeData.x,
                    y: shapeData.y,
                    width: shapeData.width,
                    height: shapeData.height,
                    rotation: shapeData.rotation ?? 0,
                }}
                isSelected={isSelected}
                imageExportMode={imageExportMode}
                clipBounds={clipBounds}
                effectBleed={bleed}
                onContextMenu={handleContextMenu}
                onSelect={(e) => {
                    setActiveSlide(slideIndex);
                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        toggleSelectedElementId(id);
                    } else {
                        setActiveElementId(id);
                    }
                }}
                onChange={(r) =>
                    updateElement(id, {
                        x: r.x,
                        y: r.y,
                        width: r.width,
                        height: r.height,
                        rotation: r.rotation,
                    }, { history: true })
                }
            >
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                        color: shapeData.color,
                        opacity: shapeData.opacity ?? 1,
                        // On the wrapper rather than the <svg>: the filter then
                        // works off the rendered subtree's alpha, so a star
                        // throws a star-shaped shadow instead of a boxy one.
                        filter,
                    }}
                >
                    <svg
                        width="100%"
                        height="100%"
                        style={{
                            transform: `scaleX(${shapeData.flipX ? -1 : 1}) scaleY(${shapeData.flipY ? -1 : 1})`,
                            border: shapeData.strokeWidth
                                ? `${shapeData.strokeWidth}px ${shapeData.strokeStyle ?? "none"} ${shapeData.strokeColor ?? "#000"}`
                                : undefined,
                        }}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        fill={fillValue}
                        dangerouslySetInnerHTML={{ __html: markup }}
                    />
                </div>
            </CanvasDragDrop>
            {isSelected && contextMenuPos && (
                <ElementContextMenu
                    position={contextMenuPos}
                    elementId={id}
                    onClose={closeContextMenu}
                />
            )}
        </>
    );
}, (p, n) => {
    const a = p.data as ShapeData, b = n.data as ShapeData;
    return (
        p.id === n.id &&
        p.slideIndex === n.slideIndex &&
        p.clipBounds?.width === n.clipBounds?.width &&
        p.clipBounds?.height === n.clipBounds?.height &&
        a.x === b.x && a.y === b.y &&
        a.width === b.width && a.height === b.height &&
        a.rotation === b.rotation &&
        a.color === b.color &&
        a.shape === b.shape &&
        a.opacity === b.opacity &&
        a.flipX === b.flipX && a.flipY === b.flipY &&
        a.borderRadius === b.borderRadius &&
        a.strokeWidth === b.strokeWidth &&
        a.strokeStyle === b.strokeStyle &&
        a.strokeColor === b.strokeColor &&
        a.gradientFrom === b.gradientFrom &&
        a.gradientTo === b.gradientTo &&
        a.gradientDirection === b.gradientDirection &&
        sameEffect(a.effect, b.effect)
    );
});

RenderShape.displayName = "RenderShape";
export default RenderShape;
