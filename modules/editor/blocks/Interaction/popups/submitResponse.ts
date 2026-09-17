/**
 * Delivery for reader responses (quiz answers, questions, contact forms).
 *
 * The editor has no response inbox of its own, so the author points the
 * interaction at their own endpoint via "Response webhook URL" in the settings
 * panel. With no URL configured the popups behave exactly as before — they just
 * confirm locally — so nothing changes for existing documents.
 */

export type InteractionResponsePayload = {
    kind: "quiz" | "question" | "contact-form";
    title?: string;
    /** The answers, keyed by question/field. */
    answers: Record<string, unknown>;
    submittedAt: string;
    pageUrl?: string;
};

export type SubmitState = "idle" | "sending" | "sent" | "failed";

export const submitInteractionResponse = async (
    submitUrl: string | undefined,
    payload: Omit<InteractionResponsePayload, "submittedAt" | "pageUrl">,
): Promise<SubmitState> => {
    if (!submitUrl?.trim()) return "sent";

    try {
        const response = await fetch(submitUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...payload,
                submittedAt: new Date().toISOString(),
                pageUrl: typeof window === "undefined" ? undefined : window.location.href,
            } satisfies InteractionResponsePayload),
        });
        return response.ok ? "sent" : "failed";
    } catch (error) {
        console.error("Interaction response delivery failed:", error);
        return "failed";
    }
};
