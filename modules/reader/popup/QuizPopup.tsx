"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { InteractionBlock } from "../types/interaction";
import PopupShell from "./PopupShell";
import { useReaderSubmit } from "../context/ReaderSubmit";

interface Props {
  block: InteractionBlock;
  onClose: () => void;
}

type AnswerMap = Record<string, string[]>;

export default function QuizPopup({ block, onClose }: Props) {
  const questions = block.quizQuestions;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [phase, setPhase] = useState<"quiz" | "submitted" | "results">("quiz");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const send = useReaderSubmit();

  const current = questions.length
    ? questions[Math.min(step, questions.length - 1)]
    : undefined;
  const selected = current ? (answers[current.id] ?? []) : [];

  const score = useMemo(
    () =>
      questions.reduce((total, question) => {
        const correct = question.options.filter((o) => o.correct).map((o) => o.id);
        const chosen = answers[question.id] ?? [];
        const matched =
          correct.length === chosen.length &&
          correct.every((id) => chosen.includes(id));
        return matched ? total + 1 : total;
      }, 0),
    [answers, questions],
  );

  const toggleOption = (optionId: string) => {
    if (!current) return;
    setAnswers((previous) => {
      const already = previous[current.id] ?? [];
      if (!current.multiple) return { ...previous, [current.id]: [optionId] };
      return {
        ...previous,
        [current.id]: already.includes(optionId)
          ? already.filter((id) => id !== optionId)
          : [...already, optionId],
      };
    });
  };

  const retake = () => {
    setAnswers({});
    setStep(0);
    setPhase("quiz");
  };

  /**
   * Sends every question with the reader's chosen answer(s) and the score to
   * the author's Leads (on a published book), then shows the result screen.
   */
  const handleSubmitQuiz = async () => {
    if (sending) return;
    const graded: Record<string, string> = {};
    questions.forEach((question, index) => {
      const chosenIds = answers[question.id] ?? [];
      const chosen = question.options.filter((o) => chosenIds.includes(o.id)).map((o) => o.text).join(", ");
      const correctIds = question.options.filter((o) => o.correct).map((o) => o.id);
      const isCorrect = correctIds.length === chosenIds.length && correctIds.every((id) => chosenIds.includes(id));
      graded[`${index + 1}. ${question.question || "Question"}`] = `${chosen || "(no answer)"} ${isCorrect ? "✓" : "✗"}`;
    });
    setSending(true); setError("");
    try {
      if (send) await send({ kind: "quiz", title: block.quizTitle || "Quiz", answers: graded, score: { correct: score, total: questions.length } });
      setPhase("submitted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your answers could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!questions.length) {
    return (
      <PopupShell onClose={onClose} label="Quiz">
        <p className="text-[13px] text-slate-500">
          This quiz has no questions yet.
        </p>
      </PopupShell>
    );
  }

  if (phase === "submitted") {
    return (
      <PopupShell onClose={onClose} label="Quiz">
        <div className="flex flex-col items-center gap-2.5 px-1 py-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={26} className="text-emerald-600" />
          </div>
          <p className="m-0 text-center text-sm font-semibold">
            Your response has been submitted
          </p>
          <button
            type="button"
            onClick={() => setPhase("results")}
            className="mt-1.5 w-full rounded-lg border-0 bg-(--kd-accent) py-2.5 text-[13px] font-semibold text-white"
          >
            View results
          </button>
          <button
            type="button"
            onClick={retake}
            className="border-0 bg-transparent text-xs font-medium text-(--kd-accent)"
          >
            Retake quiz
          </button>
        </div>
      </PopupShell>
    );
  }

  if (phase === "results") {
    return (
      <PopupShell onClose={onClose} label="Quiz results">
        <p className="m-0 mb-1 text-[13px] font-bold">
          {block.quizTitle || "Quiz results"}
        </p>
        <p className="m-0 mb-3 text-xs text-slate-500">
          You scored {score} out of {questions.length}
        </p>
        <div className="flex max-h-[280px] flex-col gap-2.5 overflow-y-auto">
          {questions.map((question, index) => {
            const chosen = answers[question.id] ?? [];
            return (
              <div key={question.id}>
                <p className="m-0 mb-1 text-xs font-semibold">
                  {index + 1}. {question.question}
                </p>
                {question.options.map((option) => {
                  const picked = chosen.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      className={`mb-1 rounded-md border px-2 py-1.5 text-xs ${
                        option.correct
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                          : picked
                            ? "border-red-200 bg-red-50 text-red-600"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {option.text}
                      {option.correct ? " ✓" : picked ? " ✗" : ""}
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
          className="mt-3 w-full rounded-lg border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-700"
        >
          Retake quiz
        </button>
      </PopupShell>
    );
  }

  if (!current) return null;

  return (
    <PopupShell onClose={onClose} label="Quiz">
      <p className="m-0 mb-2.5 text-xs font-medium text-slate-500">
        Question {step + 1} of {questions.length}:
      </p>
      <p className="m-0 mb-2.5 text-sm font-bold">{current.question}</p>
      <div className="flex flex-col gap-1.5">
        {current.options.map((option, index) => {
          const picked = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2.5 text-left text-[13px] ${
                picked ? "border-(--kd-accent) bg-(--kd-brand-50)" : "border-slate-200 bg-white"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center border-[1.5px] text-[10px] text-white ${
                  current.multiple ? "rounded" : "rounded-full"
                } ${picked ? "border-(--kd-accent) bg-(--kd-accent)" : "border-slate-400"}`}
              >
                {picked ? "✓" : ""}
              </span>
              {String.fromCharCode(65 + index)}. {option.text}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="m-0 mt-3 rounded-md bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{error}</p>}
      <button
        type="button"
        disabled={!selected.length || sending}
        onClick={() =>
          step < questions.length - 1
            ? setStep((value) => value + 1)
            : void handleSubmitQuiz()
        }
        className="mt-3.5 w-full rounded-lg border-0 bg-(--kd-accent) py-2.5 text-[13px] font-semibold text-white disabled:bg-(--kd-brand-300)"
      >
        {step < questions.length - 1 ? "Next" : sending ? "Sending…" : "Submit"}
      </button>
    </PopupShell>
  );
}