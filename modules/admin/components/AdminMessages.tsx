"use client";
import { useState } from "react";

type Message = {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: string;
  created_at: string;
};

export default function AdminMessages({ initial }: { initial: Message[] }) {
  const [messages, setMessages] = useState(initial);
  const [error, setError] = useState("");
  async function setStatus(id: string, status: string) {
    setError("");
    const res = await fetch(`/api/admin/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setError((await res.json()).error || "Could not update message.");
      return;
    }
    setMessages((list) =>
      list.map((m) => (m.id === id ? { ...m, status } : m)),
    );
  }
  if (!messages.length) return <p className="fs-muted">No messages yet.</p>;
  return (
    <>
      {error && (
        <p className="fs-alert" role="alert">
          {error}
        </p>
      )}
      <ul className="fs-messages">
        {messages.map((m) => (
          <li key={m.id} className={m.status === "closed" ? "closed" : ""}>
            <div className="fs-message-head">
              <strong>{m.name}</strong>{" "}
              <a
                href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your AI Book Creator message")}`}
              >
                {m.email}
              </a>
              <span className="fs-tag">{m.topic}</span>
              <small>{new Date(m.created_at).toLocaleString()}</small>
              <button
                className="fs-btn fs-outline fs-btn-sm"
                onClick={() =>
                  void setStatus(m.id, m.status === "open" ? "closed" : "open")
                }
              >
                {m.status === "open" ? "Mark done" : "Reopen"}
              </button>
            </div>
            <p>{m.message}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
