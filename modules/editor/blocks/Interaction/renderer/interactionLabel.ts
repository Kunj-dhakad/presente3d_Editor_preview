/**
 * Label rules for interaction elements, in a React-free module so the canvas,
 * the reader, the page thumbnails and the PPT/PDF export routes all agree on
 * what an interaction says.
 */

/** Used when the author left the button text empty. */
export const ENGAGEMENT_FALLBACK_LABEL: Record<string, string> = {
    quiz: "TAKE QUIZ",
    question: "ANSWER QUESTION",
    "contact-form": "Contact form",
    spotlight: "VIEW SPOTLIGHT",
    "video-button": "WATCH VIDEO",
    "audio-button": "PLAY AUDIO",
};

export type InteractionLabelSource = {
    interactionKind: string;
    text?: string;
    productName?: string;
    productPrice?: string;
};

/** The words an interaction shows, or "" when it is icon-only. */
export const interactionLabel = (data: InteractionLabelSource): string =>
    (data.text ?? "").trim() || ENGAGEMENT_FALLBACK_LABEL[data.interactionKind] || "";

/** Label plus product details, for flat outputs (exports, thumbnails). */
export const interactionFlatLabel = (data: InteractionLabelSource): string => {
    const label = interactionLabel(data);
    const name = (data.productName ?? "").trim();
    const price = (data.productPrice ?? "").trim();

    if (data.interactionKind === "price-tag") return price || label;
    if (data.interactionKind === "product-card" || data.interactionKind === "product-button") {
        return [label || name, price].filter(Boolean).join("  ");
    }
    return label;
};
