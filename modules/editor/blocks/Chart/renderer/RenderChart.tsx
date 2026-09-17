// "use client";

// import React, { memo, useCallback, useState } from "react";
// import { useShallow } from "zustand/shallow";
// import useEditorStore, {
//   ChartData,
//   ElementData,
// } from "@editor/store/editorStore";
// import useEditorUIStore from "@editor/store/useEditorUIStore";
// import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";
// import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
// import ChartRenderer from "@editor/blocks/Chart/renderer/ChartRenderer";
// import FloatingToolBar from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/FloatingToolBar";

// type Props = {
//   id: string;
//   data: ElementData;
//   slideIndex: number;
//   clipBounds?: PageClipBounds;
// };

// function RenderChart({ id, data, slideIndex, clipBounds }: Props) {
//   const chart = data as ChartData;
//   const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
//   const { updateElement, setActiveElementId, setActiveSlide } = useEditorStore(
//     useShallow((s) => ({
//       updateElement: s.updateElement,
//       setActiveElementId: s.setActiveElementId,
//       setActiveSlide: s.setActiveSlide,
//     })),
//   );
//   const isSelected = useEditorStore(
//     useCallback((s) => s.selectedElementIds.includes(id), [id]),
//   );
//   const [target, setTarget] = useState<HTMLDivElement | null>(null);
//   const select = useCallback(() => {
//     setActiveSlide(slideIndex);
//     setActiveElementId(id);
//     useEditorStore.getState().setActiveRightPanel("ChartSettings");
//     const ui = useEditorUIStore.getState();
//     ui.setActivePanelType("edit");
//     ui.setSidebarWidth("edit");
//   }, [id, setActiveElementId, setActiveSlide, slideIndex]);
//   if (data.type !== "chart" || chart.hidden) return null;
//   return (
//     <>
//       <CanvasDragDrop
//         id={id}
//         rect={{
//           x: chart.x,
//           y: chart.y,
//           width: chart.width,
//           height: chart.height,
//           rotation: chart.rotation ?? 0,
//         }}
//         isSelected={isSelected}
//         imageExportMode={imageExportMode}
//         clipBounds={clipBounds}
//         onContainerChange={setTarget}
//         onSelect={select}
//         onChange={(next) => updateElement(id, next, { history: true })}
//       >
//         <ChartRenderer data={chart} />
//       </CanvasDragDrop>
//       {isSelected && !imageExportMode && target && (
//         <FloatingToolBar target={target} />
//       )}
//     </>
//   );
// }
// export default memo(RenderChart);
"use client";

import React, { memo, useCallback, useState } from "react";
import { useShallow } from "zustand/shallow";
import useEditorStore, {
  ChartData,
  ElementData,
} from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";
import { CanvasDragDrop } from "@editor/layout/EditorCanvas/RenderElement/CanvasDragDrop";
import { PageClipBounds } from "@editor/layout/EditorCanvas/RenderElement/pageClip";
import ChartRenderer from "@editor/blocks/Chart/renderer/ChartRenderer";
import ElementContextMenu from "@editor/layout/EditorCanvas/toolbar/EditTool/ComanEditTool/ElementContextMenu";
import { useElementContextMenu } from "@editor/layout/EditorCanvas/RenderElement/useElementContextMenu";

type Props = {
  id: string;
  data: ElementData;
  slideIndex: number;
  clipBounds?: PageClipBounds;
};

function RenderChart({ id, data, slideIndex, clipBounds }: Props) {
  const chart = data as ChartData;
  const imageExportMode = useEditorUIStore((s) => s.imageExportMode);
  const { updateElement, setActiveElementId, setActiveSlide } = useEditorStore(
    useShallow((s) => ({
      updateElement: s.updateElement,
      setActiveElementId: s.setActiveElementId,
      setActiveSlide: s.setActiveSlide,
    })),
  );
  const isSelected = useEditorStore(
    useCallback((s) => s.selectedElementIds.includes(id), [id]),
  );
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const { contextMenuPos, handleContextMenu, closeContextMenu } =
    useElementContextMenu(id, slideIndex);
  const select = useCallback(() => {
    setActiveSlide(slideIndex);
    setActiveElementId(id);
  }, [id, setActiveElementId, setActiveSlide, slideIndex]);
  if (data.type !== "chart" || chart.hidden) return null;
  return (
    <>
      <CanvasDragDrop
        id={id}
        rect={{
          x: chart.x,
          y: chart.y,
          width: chart.width,
          height: chart.height,
          rotation: chart.rotation ?? 0,
        }}
        isSelected={isSelected}
        imageExportMode={imageExportMode}
        clipBounds={clipBounds}
        onContainerChange={setTarget}
        onContextMenu={handleContextMenu}
        onSelect={select}
        onChange={(next) => updateElement(id, next, { history: true })}
      >
        <ChartRenderer data={chart} />
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
}
export default memo(RenderChart);