import { create } from "zustand";
import type { AIAction, ChatTurn } from "./types";



const MAX_MESSAGES = 30;
const MAX_HISTORY_TURNS = 6;

export type ChatMessageKind = "applied" | "clarify" | "error" | "info";

export type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    kind?: ChatMessageKind;
};

type PendingConfirmation = { question: string; actions: AIAction[] } | null;

type AiChatState = {
    messages: ChatMessage[];
    lastTouchedIds: string[];
    pendingConfirmation: PendingConfirmation;
    addMessage: (message: Omit<ChatMessage, "id">) => void;
    setLastTouchedIds: (ids: string[]) => void;
    setPendingConfirmation: (confirmation: PendingConfirmation) => void;
    reset: () => void;
    history: () => ChatTurn[];
};

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const useAiChatStore = create<AiChatState>((set, get) => ({
    messages: [],
    lastTouchedIds: [],
    pendingConfirmation: null,

    addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, { ...message, id: newId() }].slice(-MAX_MESSAGES),
        })),
    setLastTouchedIds: (ids) => set({ lastTouchedIds: ids }),
    setPendingConfirmation: (confirmation) => set({ pendingConfirmation: confirmation }),
    reset: () => set({ messages: [], lastTouchedIds: [], pendingConfirmation: null }),

    history: () =>
        get()
            .messages.slice(-MAX_HISTORY_TURNS)
            .map((message) => ({ role: message.role, content: message.content })),
}));

export default useAiChatStore;
