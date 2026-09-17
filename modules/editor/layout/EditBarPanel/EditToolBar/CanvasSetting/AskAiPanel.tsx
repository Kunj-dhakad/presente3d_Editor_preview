"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEditorStore from "@editor/store/editorStore";
import {
    KdAiGenerateMagicIcon,
    KdAskAiEmptyIcon,
    KdLoadingIcon,
    KdSearchIcon,
} from "@editor/lib/icon/icons";
import useAiChatStore from "@editor/lib/ai/chatStore";
import { generatePageFromPrompt, runConfirmedActions, runCopilotTurn } from "@editor/lib/ai/copilot";
import { buildCopilotContext } from "@editor/lib/ai/context/buildContext";
import type { ExecutionResult } from "@editor/lib/ai/types";

/** Quick starts; the full prompt lands in the box so it stays editable. */
const SUGGESTIONS: { label: string; prompt: string }[] = [
    { label: "Change background", prompt: "Change the background to dark navy" },
    { label: "Change font", prompt: "Change all fonts to Poppins" },
    { label: "Bigger heading", prompt: "Make the heading bigger and bold" },
    { label: "Replace image", prompt: "Replace the image with a modern office photo" },
    { label: "Fix layout", prompt: "Fix the alignment and spacing" },
    { label: "New page", prompt: "Create a professional page about " },
];

/** Phrasings that mean "build me a page" — used only if the planner is down. */
const GENERATION_HINT = /\b(create|generate|design|make|build|write)\b.*\b(page|slide|presentation)\b/i;

export default function AskAiPanel() {
    const [prompt, setPrompt] = useState("");
    const [busy, setBusy] = useState(false);

    const messages = useAiChatStore((s) => s.messages);
    const addMessage = useAiChatStore((s) => s.addMessage);
    const lastTouchedIds = useAiChatStore((s) => s.lastTouchedIds);
    const setLastTouchedIds = useAiChatStore((s) => s.setLastTouchedIds);
    const pendingConfirmation = useAiChatStore((s) => s.pendingConfirmation);
    const setPendingConfirmation = useAiChatStore((s) => s.setPendingConfirmation);
    const resetChat = useAiChatStore((s) => s.reset);

    const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
    const slides = useEditorStore((s) => s.slides);
    const activeSlide = useEditorStore((s) => s.activeSlide);

    const threadRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // What the AI will treat as "this", so the target is never a surprise.
    const selectionLabel = useMemo(() => {
        if (!selectedElementIds.length) return null;
        const context = buildCopilotContext({ slides, activeSlide, selectedElementIds });
        const roles = context.selection.elements.map((element) => element.role.replace("_", " "));
        if (!roles.length) return null;
        return roles.length === 1 ? roles[0] : `${roles.length} elements`;
    }, [slides, activeSlide, selectedElementIds]);

    useEffect(() => {
        const thread = threadRef.current;
        if (thread) thread.scrollTop = thread.scrollHeight;
    }, [messages.length, busy, pendingConfirmation]);

    const report = useCallback(
        (result: ExecutionResult) => {
            addMessage({
                role: "assistant",
                content: result.message,
                kind:
                    result.outcome === "applied" ? "applied"
                        : result.outcome === "clarify" ? "clarify"
                            : "error",
            });
            if (result.touchedElementIds.length) setLastTouchedIds(result.touchedElementIds);
            setPendingConfirmation(result.confirmation ?? null);
            if (result.skipped.length && process.env.NODE_ENV !== "production") {
                console.debug("[ai-copilot] skipped actions", result.skipped);
            }
        },
        [addMessage, setLastTouchedIds, setPendingConfirmation],
    );

    /**
     * One entry point for everything: the planner decides whether the message is
     * an edit or a request for a brand-new page. Generation only falls back to
     * the direct generator if the planner itself is unreachable.
     */
    const send = useCallback(async () => {
        const message = prompt.trim();
        if (!message || busy) return;

        setBusy(true);
        setPrompt("");
        setPendingConfirmation(null);
        addMessage({ role: "user", content: message });

        try {
            const history = useAiChatStore.getState().history();
            const result = await runCopilotTurn({ message, history, lastTouchedIds });
            if (result.outcome === "error" && GENERATION_HINT.test(message)) {
                report(await generatePageFromPrompt(message));
                return;
            }
            report(result);
        } catch (error) {
            console.error("Ask AI failed:", error);
            addMessage({
                role: "assistant",
                content: "Something went wrong. Nothing was changed.",
                kind: "error",
            });
        } finally {
            setBusy(false);
        }
    }, [prompt, busy, addMessage, report, lastTouchedIds, setPendingConfirmation]);

    const confirm = useCallback(async () => {
        const confirmation = pendingConfirmation;
        if (!confirmation || busy) return;
        setBusy(true);
        setPendingConfirmation(null);
        try {
            report(await runConfirmedActions(confirmation.actions, lastTouchedIds));
        } catch (error) {
            console.error("Confirmed AI action failed:", error);
            addMessage({ role: "assistant", content: "That change couldn't be applied.", kind: "error" });
        } finally {
            setBusy(false);
        }
    }, [pendingConfirmation, busy, report, lastTouchedIds, addMessage, setPendingConfirmation]);

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void send();
        }
    };

    const applySuggestion = (suggestion: string) => {
        setPrompt(suggestion);
        inputRef.current?.focus();
    };

    const hasThread = messages.length > 0;

    return (
        // h-full + overflow-hidden: only the thread scrolls, so the panel never
        // adds a second scrollbar inside the tool panel's own scroll area.
        <div className="w-full h-full flex flex-col overflow-hidden">
            <div
                ref={threadRef}
                className="flex-1 min-h-0 overflow-y-auto kd-custom-scrollbar px-3"
                aria-live="polite"
            >
                {!hasThread ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 px-2 text-center">
                        <div className="kd-ask-ai-icon-circle">
                            <KdAskAiEmptyIcon />
                        </div>
                        {/* Same gradient hero styling the panel shipped with. */}
                        <p className="kd-ask-ai-hero-text">
                            Create a page, or <br /> edit this one
                        </p>
                        <p className="kd-ask-ai-hero-hint">
                            e.g. “make the heading blue”
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5 py-2">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`rounded-lg px-2 py-1.5 text-[11px] leading-snug ${message.role === "user" ? "self-end" : "self-start"
                                    }`}
                                style={
                                    message.role === "user"
                                        ? { background: "var(--kd-accent)", color: "var(--kd-text-inverse)", maxWidth: "90%" }
                                        : {
                                            background: "var(--kd-accent-soft)",
                                            border: `1px solid ${message.kind === "error" ? "var(--kd-danger)" : "var(--kd-border)"}`,
                                            color: "var(--kd-text)",
                                            maxWidth: "94%",
                                        }
                                }
                            >
                                {message.content}
                            </div>
                        ))}

                        {busy && (
                            <div
                                className="self-start flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px]"
                                style={{
                                    background: "var(--kd-accent-soft)",
                                    border: "1px solid var(--kd-border)",
                                    color: "var(--kd-text-muted)",
                                }}
                            >
                                <span className="animate-spin"><KdLoadingIcon /></span>
                                Working…
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ===== Composer ===== */}
            <div className="shrink-0 px-3 pb-2.5 pt-1.5 flex flex-col gap-1.5">
                {pendingConfirmation && (
                    <div
                        className="rounded-lg p-2 text-[11px]"
                        style={{
                            background: "var(--kd-accent-soft)",
                            border: "1px solid var(--kd-danger)",
                            color: "var(--kd-text)",
                        }}
                    >
                        <p className="mb-1.5">{pendingConfirmation.question}</p>
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => setPendingConfirmation(null)}
                                className="flex-1 rounded-md py-1 text-[11px] font-medium cursor-pointer"
                                style={{ border: "1px solid var(--kd-border)", color: "var(--kd-text)" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirm}
                                className="flex-1 rounded-md py-1 text-[11px] font-semibold cursor-pointer"
                                style={{ background: "var(--kd-danger)", color: "var(--kd-text-inverse)" }}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {(selectionLabel || hasThread) && (
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] truncate" style={{ color: "var(--kd-text-muted)" }}>
                            {selectionLabel && (
                                <>
                                    Editing:{" "}
                                    <span style={{ color: "var(--kd-accent)" }}>{selectionLabel}</span>
                                </>
                            )}
                        </span>
                        {hasThread && (
                            <button
                                type="button"
                                onClick={resetChat}
                                disabled={busy}
                                className="text-[10px] cursor-pointer disabled:opacity-40 shrink-0"
                                style={{ color: "var(--kd-text-muted)" }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {!hasThread && (
                    <div className="flex flex-wrap gap-2 mb-1">
                        {SUGGESTIONS.map((suggestion) => (
                            <button
                                key={suggestion.label}
                                type="button"
                                onClick={() => applySuggestion(suggestion.prompt)}
                                title={suggestion.prompt}
                                className="kd-ask-ai-pill"
                            >
                                <KdSearchIcon />
                                <span>{suggestion.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Edit this page, or describe a new one…"
                    aria-label="Ask AI"
                    className={`kd-ai-video-textarea custom-scrollbar w-full text-[12px] ${hasThread ? "h-24" : "h-[120px]"
                        }`}
                />

                <button
                    type="button"
                    onClick={send}
                    disabled={busy || !prompt.trim()}
                    className="kd-ai-video-generate-btn mb-1 flex items-center justify-center gap-1 w-full py-2 rounded-md text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed hover:opacity-90"
                >
                    {busy ? (
                        <>
                            Working… <span className="animate-spin"><KdLoadingIcon /></span>
                        </>
                    ) : (
                        <>
                            <KdAiGenerateMagicIcon />
                            Ask AI
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
