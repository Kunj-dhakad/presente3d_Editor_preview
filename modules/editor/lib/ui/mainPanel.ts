import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";

/**
 * Opens one of the asset panels, or closes it if it is already the open one.
 *
 * Lived inside `Navbar` until the narrow shell needed the same behaviour from a
 * bottom tab bar. Two copies of this would drift the moment one of the five
 * pieces of state it touches changes.
 */
export const toggleMainPanel = (panel: string) => {
  const editor = useEditorStore.getState();
  const ui = useEditorUIStore.getState();

  const alreadyOpen = editor.activeRightPanel === panel && ui.activePanelType === "main";

  if (alreadyOpen) {
    editor.setActiveRightPanel(null);
    ui.setActivePanelType(null);
    ui.setSiteBarCollapsed(true);
    ui.setSidebarWidth("closed");
    ui.setLastMainPanel(null);
    return;
  }

  ui.setLastMainPanel(panel);
  editor.setActiveRightPanel(panel);
  ui.setActivePanelType("main");
  ui.setSiteBarCollapsed(false);
  ui.setSidebarWidth("main");
};

/** Closes whatever panel is open, leaving the canvas clear. */
export const closeMainPanel = () => {
  const editor = useEditorStore.getState();
  const ui = useEditorUIStore.getState();
  editor.setActiveRightPanel(null);
  ui.setActivePanelType(null);
  ui.setSiteBarCollapsed(true);
  ui.setSidebarWidth("closed");
  ui.setLastMainPanel(null);
};
