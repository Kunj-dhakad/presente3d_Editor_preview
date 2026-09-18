"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { ContactField, InteractionBlock } from "../types/interaction";
import PopupShell from "./PopupShell";
import { rememberReader, useReaderSubmit } from "../context/ReaderSubmit";

interface Props {
  block: InteractionBlock;
  onClose: () => void;
}

const DEFAULT_FIELDS: ContactField[] = [
  {
    id: "name",
    label: "Full name",
    kind: "text",
    placeholder: "Full name",
    required: true,
  },
];

export default function ContactFormPopup({ block, onClose }: Props) {
  const fields = block.contactFields.length ? block.contactFields : DEFAULT_FIELDS;

  const [values, setValues] = useState<Record<string, string>>({});
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const send = useReaderSubmit();

  const missingRequired = fields.some(
    (field) => field.required && !values[field.id]?.trim(),
  );
  const canSubmit = !missingRequired && agreePrivacy;

  const setValue = (id: string, value: string) =>
    setValues((previous) => ({ ...previous, [id]: value }));

  /**
   * Sends the form to the author's Leads (on a published book), labelled with
   * each field's own label, and remembers the reader's name / email so later
   * answers show who sent them.
   */
  const handleSubmit = async () => {
    if (!canSubmit || sending) return;
    const answers: Record<string, string> = {};
    const profile: { name?: string; email?: string; phone?: string } = {};
    fields.forEach((field, index) => {
      const value = (values[field.id] ?? "").trim();
      const label = (field.label || `Field ${index + 1}`).trim();
      answers[answers[label] !== undefined ? `${label} (${index + 1})` : label] = value;
      if (!value) return;
      if (field.kind === "email") profile.email ||= value;
      else if (field.kind === "tel") profile.phone ||= value;
      else if (/name/i.test(label)) profile.name ||= value;
    });
    if (block.showMarketingOptIn) answers["Marketing emails"] = agreeMarketing ? "Yes" : "No";
    setSending(true); setError("");
    try {
      rememberReader(profile);
      if (send) await send({ kind: "contact-form", title: block.contactFormTitle || "Contact form", answers });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your form could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <PopupShell onClose={onClose} maxWidth={320} label="Contact form">
        <div className="flex flex-col items-center gap-2.5 px-1 py-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={26} className="text-emerald-600" />
          </div>
          <p className="m-0 text-center text-sm font-semibold">
            Thanks! Your form has been submitted
          </p>
        </div>
      </PopupShell>
    );
  }

  return (
    <PopupShell onClose={onClose} maxWidth={320} label="Contact form">
      <p className="m-0 mb-1.5 text-sm font-bold">
        {block.contactFormTitle || "Tell us about this form"}
      </p>
      {block.contactFormDescription && (
        <p className="m-0 mb-3 text-[11.5px] leading-relaxed text-slate-500">
          {block.contactFormDescription}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="mb-1 block text-[11.5px] font-semibold text-slate-700">
              {field.label}
              {field.required && <span className="text-red-600"> *</span>}
            </label>
            {field.kind === "textarea" ? (
              <textarea
                value={values[field.id] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => setValue(field.id, event.target.value)}
                rows={3}
                className="box-border w-full resize-none rounded-md border border-slate-200 px-2.5 py-2 font-sans text-[12.5px]"
              />
            ) : (
              <input
                type={field.kind}
                value={values[field.id] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => setValue(field.id, event.target.value)}
                className="box-border w-full rounded-md border border-slate-200 px-2.5 py-2 font-sans text-[12.5px]"
              />
            )}
          </div>
        ))}

        <label className="flex cursor-pointer items-start gap-2 text-[11.5px] text-slate-700">
          <input
            type="checkbox"
            checked={agreePrivacy}
            onChange={(event) => setAgreePrivacy(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            {block.privacyPolicyText ||
              "I agree to the following company's Privacy Policy:"}{" "}
            {block.privacyPolicyLink && (
              <a
                href={block.privacyPolicyLink}
                target="_blank"
                rel="noreferrer"
                className="text-(--kd-accent)"
              >
                Privacy Policy
              </a>
            )}
          </span>
        </label>

        {block.showMarketingOptIn && (
          <label className="flex cursor-pointer items-start gap-2 text-[11.5px] text-slate-700">
            <input
              type="checkbox"
              checked={agreeMarketing}
              onChange={(event) => setAgreeMarketing(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              {block.marketingOptInText || "I agree to receive marketing materials"}
            </span>
          </label>
        )}
      </div>

      {error && <p role="alert" className="m-0 mt-3 rounded-md bg-rose-50 px-2.5 py-2 text-[11.5px] text-rose-700">{error}</p>}
      <button
        type="button"
        disabled={!canSubmit || sending}
        onClick={() => void handleSubmit()}
        className="mt-3.5 w-full rounded-lg border-0 bg-(--kd-accent) py-2.5 text-[13px] font-semibold text-white disabled:bg-(--kd-brand-300)"
      >
        {sending ? "Sending…" : "Submit"}
      </button>
    </PopupShell>
  );
}