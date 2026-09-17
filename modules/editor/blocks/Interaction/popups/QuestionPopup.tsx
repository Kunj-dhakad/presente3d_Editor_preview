"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { InteractionData } from "@editor/store/editorStore";
import InteractionPopupShell from "./InteractionPopupShell";
import { submitInteractionResponse, type SubmitState } from "./submitResponse";

interface QuestionPopupProps {
  data: InteractionData;
  onClose: () => void;
}

const QuestionPopup: React.FC<QuestionPopupProps> = ({ data, onClose }) => {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");

  // Delivered to the author's webhook when one is configured; otherwise this
  // resolves immediately and the popup just confirms locally, as before.
  const send = async () => {
    setState("sending");
    const result = await submitInteractionResponse(data.submitUrl, {
      kind: "question",
      title: data.questionTitle,
      answers: { [data.questionText || "question"]: answer },
    });
    setState(result);
    if (result !== "failed") setSubmitted(true);
  };

  if (submitted) {
    return (
      <InteractionPopupShell onClose={onClose} maxWidth={280}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 4px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--kd-success-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={26} color="var(--kd-success)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--kd-text)", textAlign: "center", margin: 0 }}>
            Your response has been submitted
          </p>
          <button
            type="button"
            onClick={() => { setSubmitted(false); setAnswer(""); }}
            style={{ background: "none", border: "none", color: "var(--kd-accent)", fontSize: 12, fontWeight: 500, cursor: "pointer", marginTop: 2 }}
          >
            Answer again
          </button>
        </div>
      </InteractionPopupShell>
    );
  }

  return (
    <InteractionPopupShell onClose={onClose} maxWidth={280}>
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--kd-text)", margin: "0 0 10px" }}>
        {data.questionText || "What would you like to ask?"}
      </p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={data.questionPlaceholder || "Type your answer here…"}
        rows={4}
        style={{
          width: "100%",
          resize: "none",
          borderRadius: 8,
          border: "1px solid var(--kd-border-subtle)",
          padding: 10,
          fontSize: 13,
          fontFamily: "inherit",
          color: "var(--kd-text)",
          boxSizing: "border-box",
        }}
      />
      <button
        type="button"
        disabled={!answer.trim() || state === "sending"}
        onClick={send}
        style={{
          width: "100%",
          marginTop: 12,
          padding: "10px 0",
          borderRadius: 8,
          border: "none",
          background: answer.trim() ? "var(--kd-accent)" : "var(--kd-accent-soft)",
          color: "var(--kd-text-inverse)",
          fontSize: 13,
          fontWeight: 600,
          cursor: answer.trim() ? "pointer" : "not-allowed",
        }}
      >
        {state === "sending" ? "Sending…" : "Submit"}
      </button>
      {state === "failed" && (
        <p style={{ marginTop: 8, fontSize: 11.5, color: "var(--kd-danger)" }}>
          Could not send your answer. Please try again.
        </p>
      )}
    </InteractionPopupShell>
  );
};

export default QuestionPopup;
