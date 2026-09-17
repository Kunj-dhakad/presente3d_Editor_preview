import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";

/**
 * Leaves an element's edit panel and puts the main sidebar back where the
 * author left it.
 *
 * The panel header's close button is not the only thing that needs this — a
 * panel that has finished its job (the cropper, once a crop is saved) should
 * see itself out the same way, and by the same steps.
 */
export const closeEditPanel = () => {
  const ui = useEditorUIStore.getState();
  // Crop mode is owned by a panel; leaving the panel must not leave the canvas
  // in it.
  ui.setCropElementId(null);
  useEditorStore.getState().setActiveRightPanel(ui.lastMainPanel || "text");
  ui.setActivePanelType("main");
  ui.setSidebarWidth("main");
};
