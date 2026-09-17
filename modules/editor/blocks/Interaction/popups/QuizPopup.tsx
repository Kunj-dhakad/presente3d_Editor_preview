"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { InteractionData, QuizQuestionItem } from "@editor/store/editorStore";
import InteractionPopupShell from "./InteractionPopupShell";
import { submitInteractionResponse } from "./submitResponse";

interface QuizPopupProps {
  data: InteractionData;
  onClose: () => void;
}

type AnswerMap = Record<string, string[]>; // questionId -> selected option ids

const QuizPopup: React.FC<QuizPopupProps> = ({ data, onClose }) => {
  const questions: QuizQuestionItem[] = useMemo(
    () => (data.quizQuestions?.length ? data.quizQuestions : []),
    [data.quizQuestions]
  );

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [phase, setPhase] = useState<"quiz" | "submitted" | "results">("quiz");

  // All hooks must run unconditionally, in the same order, on every render —
  // so `current`/`selected`/`score` are computed here (with safe fallbacks
  // for an empty question list) BEFORE any early `return`.
  const current = questions.length
    ? questions[Math.min(step, questions.length - 1)]
    : undefined;
  const selected = current ? (answers[current.id] ?? []) : [];

  const score = useMemo(() => {
    let correctCount = 0;
    questions.forEach((q) => {
      const correctIds = q.options.filter((o) => o.correct).map((o) => o.id);
      const chosen = answers[q.id] ?? [];
      const isCorrect =
        correctIds.length === chosen.length &&
        correctIds.every((id) => chosen.includes(id));
      if (isCorrect) correctCount += 1;
    });
    return correctCount;
  }, [answers, questions]);

  const toggleOption = (optionId: string) => {
    if (!current) return;
    setAnswers((prev) => {
      const already = prev[current.id] ?? [];
      if (current.multiple) {
        const next = already.includes(optionId)
          ? already.filter((id) => id !== optionId)
          : [...already, optionId];
        return { ...prev, [current.id]: next };
      }
      return { ...prev, [current.id]: [optionId] };
    });
  };

  const goNext = () => {
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setPhase("submitted");
    // Fire-and-forget: the reader already sees their result, and a webhook
    // failure must not block it. Only sends when the author configured a URL.
    void submitInteractionResponse(data.submitUrl, {
      kind: "quiz",
      title: data.quizTitle,
      answers: {
        score,
        total: questions.length,
        responses: questions.map((question) => ({
          question: question.question,
          chosen: (answers[question.id] ?? []).map(
            (optionId) =>
              question.options.find((option) => option.id === optionId)?.text ?? optionId,
          ),
        })),
      },
    });
  };

  const retake = () => {
    setAnswers({});
    setStep(0);
    setPhase("quiz");
  };

  if (!questions.length) {
    return (
      <InteractionPopupShell onClose={onClose}>
        <p style={{ fontSize: 13, color: "var(--kd-text-muted)" }}>
          Add questions to this quiz from the sidebar on the right.
        </p>
      </InteractionPopupShell>
    );
  }

  if (phase === "submitted") {
    return (
      <InteractionPopupShell onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 4px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--kd-success-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={26} color="var(--kd-success)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--kd-text)", textAlign: "center", margin: 0 }}>
            Your response has been submitted
          </p>
          <button
            type="button"
            onClick={() => setPhase("results")}
            style={{ width: "100%", marginTop: 6, padding: "9px 0", borderRadius: 8, border: "none", background: "var(--kd-accent)", color: "var(--kd-text-inverse)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            View results
          </button>
          <button
            type="button"
            onClick={retake}
            style={{ background: "none", border: "none", color: "var(--kd-accent)", fontSize: 12, fontWeight: 500, cursor: "pointer", marginTop: 2 }}
          >
            Retake quiz
          </button>
        </div>
      </InteractionPopupShell>
    );
  }

  if (phase === "results") {
    return (
      <InteractionPopupShell onClose={onClose}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--kd-text)", margin: "0 0 4px" }}>
          {data.quizTitle || "Quiz results"}
        </p>
        <p style={{ fontSize: 12, color: "var(--kd-text-muted)", margin: "0 0 12px" }}>
          You scored {score} out of {questions.length}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }}>
          {questions.map((q, i) => {
            const chosen = answers[q.id] ?? [];
            return (
              <div key={q.id}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--kd-text)", margin: "0 0 4px" }}>
                  {i + 1}. {q.question}
                </p>
                {q.options.map((opt) => {
                  const isChosen = chosen.includes(opt.id);
                  const style: React.CSSProperties = {
                    fontSize: 12,
                    padding: "5px 8px",
                    borderRadius: 6,
                    marginBottom: 3,
                    background: opt.correct ? "var(--kd-success-soft)" : isChosen ? "var(--kd-danger-soft)" : "var(--kd-bg-app)",
                    color: opt.correct ? "var(--kd-success)" : isChosen ? "var(--kd-danger)" : "var(--kd-text-muted)",
                    border: "1px solid",
                    borderColor: opt.correct ? "var(--kd-success)" : isChosen ? "var(--kd-danger)" : "var(--kd-border-subtle)",
                  };
                  return (
                    <div key={opt.id} style={style}>
                      {opt.text}
                      {opt.correct ? " ✓" : isChosen ? " ✗" : ""}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={retake}
          style={{ width: "100%", marginTop: 12, padding: "9px 0", borderRadius: 8, border: "1px solid var(--kd-border-subtle)", background: "var(--kd-bg-surface)", color: "var(--kd-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Retake quiz
        </button>
      </InteractionPopupShell>
    );
  }

  if (!current) return null;

  return (
    <InteractionPopupShell onClose={onClose}>
      <p style={{ fontSize: 12, color: "var(--kd-text-muted)", margin: "0 0 10px", fontWeight: 500 }}>
        Question {step + 1} of {questions.length}:
      </p>
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--kd-text)", margin: "0 0 10px" }}>
        {current.question}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {current.options.map((opt, i) => {
          const isSelected = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleOption(opt.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                textAlign: "left",
                padding: "9px 10px",
                borderRadius: 8,
                border: `1px solid ${isSelected ? "var(--kd-accent)" : "var(--kd-border-subtle)"}`,
                background: isSelected ? "var(--kd-accent-subtle)" : "var(--kd-bg-surface)",
                cursor: "pointer",
                fontSize: 13,
                color: "var(--kd-text)",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: current.multiple ? 4 : "50%",
                  border: `1.5px solid ${isSelected ? "var(--kd-accent)" : "var(--kd-border-subtle)"}`,
                  background: isSelected ? "var(--kd-accent)" : "transparent",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--kd-text-inverse)",
                  fontSize: 10,
                }}
              >
                {isSelected ? "✓" : ""}
              </span>
              {String.fromCharCode(65 + i)}. {opt.text}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!selected.length}
        onClick={goNext}
        style={{
          width: "100%",
          marginTop: 14,
          padding: "10px 0",
          borderRadius: 8,
          border: "none",
          background: selected.length ? "var(--kd-accent)" : "var(--kd-accent-soft)",
          color: "var(--kd-text-inverse)",
          fontSize: 13,
          fontWeight: 600,
          cursor: selected.length ? "pointer" : "not-allowed",
        }}
      >
        {step < questions.length - 1 ? "Next" : "Submit"}
      </button>
    </InteractionPopupShell>
  );
};

export default QuizPopup;
