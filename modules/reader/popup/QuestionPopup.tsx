"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { InteractionBlock } from "../types/interaction";
import PopupShell from "./PopupShell";
import { useReaderSubmit } from "../context/ReaderSubmit";

interface Props {
  block: InteractionBlock;
  onClose: () => void;
}

export default function QuestionPopup({ block, onClose }: Props) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const send = useReaderSubmit();

  /** Sends the reader's answer to the author's Leads (on a published book). */
  const handleSubmit = async () => {
    const trimmed = answer.trim();
    if (!trimmed || sending) return;
    const question = block.questionText || block.questionTitle || "What would you like to ask?";
    setSending(true); setError("");
    try {
      if (send) await send({ kind: "question", title: block.questionTitle || "Question", answers: { Question: question, Answer: trimmed } });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your answer could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <PopupShell onClose={onClose} maxWidth={300} label="Question">
        <div className="flex flex-col items-center gap-2.5 px-1 py-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={26} className="text-emerald-600" />
          </div>
          <p className="m-0 text-center text-sm font-semibold">
            Your response has been submitted
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setAnswer("");
            }}
            className="border-0 bg-transparent text-xs font-medium text-(--kd-accent)"
          >
            Answer again
          </button>
        </div>
      </PopupShell>
    );
  }

  return (
    <PopupShell onClose={onClose} maxWidth={300} label="Question">
      <p className="m-0 mb-2.5 text-sm font-bold">
        {block.questionText || block.questionTitle || "What would you like to ask?"}
      </p>
      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder={block.questionPlaceholder || "Type your answer here…"}
        rows={4}
        className="box-border w-full resize-none rounded-lg border border-slate-200 p-2.5 font-sans text-[13px] text-slate-900"
      />
      {error && <p role="alert" className="m-0 mt-2.5 rounded-md bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{error}</p>}
      <button
        type="button"
        disabled={!answer.trim() || sending}
        onClick={() => void handleSubmit()}
        className="mt-3 w-full rounded-lg border-0 bg-(--kd-accent) py-2.5 text-[13px] font-semibold text-white disabled:bg-(--kd-brand-300)"
      >
        {sending ? "Sending…" : "Submit"}
      </button>
    </PopupShell>
  );
}