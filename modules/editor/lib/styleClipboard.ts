/**
 * StyleClipboard Manager
 * 
 * Handles copying and applying visual styles between elements.
 * Excludes structural properties like position, size, ID, etc.
 */

import type { ElementData } from "@editor/store/editorStore";
import useEditorStore from "@editor/store/editorStore";
import useEditorUIStore from "@editor/store/useEditorUIStore";

// Properties that should NOT be copied (structural/content properties)
const EXCLUDED_PROPERTIES = new Set([
  "id",
  "uuid",
  "type",
  "x",
  "y",
  "width",
  "height",
  "zIndex",
  "isDragging",
  // Content
  "text",
  "html",
  "src",
  "thumbnail",
  "alt",
  "link",
  "imageSrc",
  // Lock/Visibility
  "locked",
  "visible",
  // Layer Order
  "order",
  // Element hierarchy
  "parentId",
  "parentID",
  "groupId",
  "children",
  "childIds",
]);

export type CopiedStyle = {
  sourceType: string;
  properties: Record<string, unknown>;
};

class StyleClipboard {
  private copiedStyle: CopiedStyle | null = null;

  /**
   * Extract style properties from an element
   */
  copyFromElement(element: ElementData): CopiedStyle {
    const elementType = element.type;
    const properties: Record<string, unknown> = {};

    // Iterate through element properties
    Object.entries(element).forEach(([key, value]) => {
      if (
        !EXCLUDED_PROPERTIES.has(key) &&
        value !== undefined &&
        value !== null
      ) {
        properties[key] = structuredClone(value);
      }
    });

    this.copiedStyle = {
      sourceType: elementType,
      properties,
    };

    return this.copiedStyle;
  }

  /**
   * Get the current copied style
   */
  getStyle(): CopiedStyle | null {
    return this.copiedStyle;
  }

  /**
   * Get just the properties from the clipboard
   */
  getClipboardContent(): Record<string, unknown> | null {
    return this.copiedStyle?.properties ?? null;
  }

  /**
   * Check if we have a copied style
   */
  hasCopiedStyle(): boolean {
    return this.copiedStyle !== null;
  }

  /**
   * Clear the copied style
   */
  clear(): void {
    this.copiedStyle = null;
  }

  /**
   * Get compatible properties for target element type
   * Only applies properties that are valid for the target type
   */
  getCompatibleProperties(_targetType: string): Record<string, unknown> {
    if (!this.copiedStyle) return {};
    return structuredClone(this.copiedStyle.properties);
  }

  /**
   * Check if styles can be applied to target element
   */
  canApplyTo(targetType: string): boolean {
    return Boolean(targetType && this.copiedStyle);
  }

  /**
   * Get source type of copied style
   */
  getSourceType(): string | null {
    return this.copiedStyle?.sourceType || null;
  }
};

// Singleton instance
export const styleClipboard = new StyleClipboard();

/** Apply the active style paint operation through the shared stores. */
export const applyCopiedStyleToElementsIfActive = (elementIds: string[]): boolean => {
  const ui = useEditorUIStore.getState();
  if (!ui.isCopyStyleMode) return false;

  const copiedStyle = styleClipboard.getClipboardContent();
  if (copiedStyle && elementIds.length) {
    useEditorStore.getState().applyCopiedStyle(elementIds, copiedStyle);
  }
  ui.setIsCopyStyleMode(false);
  ui.setCopiedStyleSourceType(null);
  ui.setStylePasteSourceSlide(null);
  return true;
};

export const applyCopiedStyleIfActive = (elementId: string): boolean =>
  applyCopiedStyleToElementsIfActive([elementId]);
