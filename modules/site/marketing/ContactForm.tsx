"use client";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

const topics = [
  ["general", "General question"],
  ["upgrade", "Upgrade my plan"],
  ["billing", "Billing"],
  ["support", "Technical support"],
  ["privacy", "Privacy or data request"],
  ["partnership", "Partnership / teams"],
];

export default function ContactForm({
  topic,
  plan,
}: {
  topic?: string;
  plan?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const initialTopic = topics.some(([id]) => id === topic) ? topic : "general";
  const initialMessage =
    topic === "upgrade" && plan
      ? `Hi, I would like to upgrade my account to the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`
      : "";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Could not send your message.");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className="fs-form-panel">
        <h2>Message sent</h2>
        <p className="fs-success" role="status">
          Thanks for reaching out. We will reply to your email soon.
        </p>
      </div>
    );
  return (
    <form className="fs-form-panel" onSubmit={submit} method="post" action="#">
      <label>
        Your name
        <input name="name" required maxLength={100} autoComplete="name" />
      </label>
      <label>
        Email address
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
        />
      </label>
      <label>
        Topic
        <select name="topic" defaultValue={initialTopic}>
          {topics.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Message
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          defaultValue={initialMessage}
          placeholder="Tell us how we can help"
        />
      </label>
      {error && (
        <p className="fs-alert" role="alert">
          {error}
        </p>
      )}
      <button className="fs-btn fs-primary" disabled={busy}>
        {busy && <LoaderCircle className="fs-spin" size={18} />}Send message{" "}
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
