import useEditorStore from "@editor/store/editorStore";
import { validateCopilotResponse } from "./actions/validate";
import { buildCopilotContext } from "./context/buildContext";
import { executeAIActions } from "./executor/executeActions";
import type { AIAction, ChatTurn, ExecutionResult } from "./types";
import { apiFetch } from "@shared/apiFetch";

/**
 * READ -> UNDERSTAND -> PLAN -> VALIDATE -> APPLY.
 *
 * The one entry point the Ask AI panel calls. Everything the model returns is
 * validated here before `executeAIActions` is allowed to touch the document.
 */

const DEBUG = process.env.NODE_ENV !== "production";

export type CopilotTurnInput = {
    message: string;
    history: ChatTurn[];
    /** Element ids the previous command touched, for "make it bigger" follow-ups. */
    lastTouchedIds?: string[];
};

const currentContext = (lastTouchedIds: string[] | undefined) => {
    const { slides, activeSlide, selectedElementIds } = useEditorStore.getState();
    return buildCopilotContext({ slides, activeSlide, selectedElementIds, lastTouchedIds });
};

const requestPlan = async (input: CopilotTurnInput, context: ReturnType<typeof currentContext>) => {
    const res = await apiFetch("/api/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.message, context, history: input.history }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Copilot request failed (${res.status})`);
    }
    return data.plan as unknown;
};

export const runCopilotTurn = async (input: CopilotTurnInput): Promise<ExecutionResult> => {
    const context = currentContext(input.lastTouchedIds);

    let plan: unknown;
    try {
        plan = await requestPlan(input, context);
    } catch (error) {
        console.error("Copilot planning failed:", error);
        return {
            outcome: "error",
            message: "I couldn't reach the AI service just now. Please try again.",
            appliedActions: [],
            skipped: [],
            touchedElementIds: [],
        };
    }

    const validated = validateCopilotResponse(plan);
    if (DEBUG) console.debug("[ai-copilot] plan", validated);

    if (validated.clarification && !validated.actions.length) {
        return {
            outcome: "clarify",
            message: validated.clarification,
            appliedActions: [],
            skipped: validated.issues,
            touchedElementIds: [],
        };
    }

    if (!validated.actions.length) {
        // No executable actions: either a plain answer or everything was rejected.
        const rejection = validated.issues[0];
        return {
            outcome: rejection ? "rejected" : "applied",
            message: rejection
                ? `I understood the request, but I can't do that yet — ${rejection.reason}.`
                : validated.message || "I didn't change anything.",
            appliedActions: [],
            skipped: validated.issues,
            touchedElementIds: [],
        };
    }

    const result = await executeAIActions(validated.actions, context, {
        modelMessage: validated.message,
    });
    return { ...result, skipped: [...validated.issues, ...result.skipped] };
};

/** Runs actions the user just confirmed (delete page, regenerate page). */
export const runConfirmedActions = async (
    actions: AIAction[],
    lastTouchedIds?: string[],
): Promise<ExecutionResult> =>
    executeAIActions(actions, currentContext(lastTouchedIds), { confirmed: true });

/**
 * Backward-compatible one-shot generator used by the panel's "Generate Page"
 * button — same behaviour as before the copilot existed.
 */
export const generatePageFromPrompt = async (prompt: string): Promise<ExecutionResult> =>
    executeAIActions(
        [{ type: "GENERATE_SLIDE", prompt, mode: "replace_current" }],
        currentContext(undefined),
        { confirmed: true, modelMessage: "Generated a new page from your description." },
    );
