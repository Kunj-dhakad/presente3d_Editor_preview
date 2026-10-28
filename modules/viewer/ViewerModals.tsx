"use client";
import { useEffect, useState, type ReactNode } from "react";
import type { PitchEngine } from "./engine";

/**
 * The PHP viewer's Bootstrap modals (welcome, lead form, feedback, thank you,
 * share), with the same markup; React opens them instead of bootstrap.js.
 */

const ARROW = (
  <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.4195 7.54717C15.859 7.10772 15.859 6.39404 15.4195 5.95459L9.79453 0.32959C9.35508 -0.109863 8.64141 -0.109863 8.20195 0.32959C7.7625 0.769043 7.7625 1.48271 8.20195 1.92217L11.9109 5.62764H1.125C0.502734 5.62764 0 6.13037 0 6.75264C0 7.3749 0.502734 7.87764 1.125 7.87764H11.9074L8.20547 11.5831C7.76602 12.0226 7.76602 12.7362 8.20547 13.1757C8.64492 13.6151 9.35859 13.6151 9.79805 13.1757L15.423 7.55068L15.4195 7.54717Z" fill="white" />
  </svg>
);

const SOCIAL: [string, string, string][] = [
  ["facebook", "fb.png", "Facebook"],
  ["twitter", "x.png", "Twitter (X)"],
  ["whatsapp", "wtsup.png", "WhatsApp"],
  ["linkedin", "in.png", "LinkedIn"],
  ["snapchat", "snapchat.png", "Snapchat"],
  ["telegram", "tg.png", "Telegram"],
  ["instagram", "instagram.png", "Instagram"],
  ["facebook_messenger", "Messenger.png", "Messenger"],
  ["reddit", "rdt.png", "Reddit"],
  ["tiktok", "tik-tok.png", "TikTok"],
];

const REACTIONS: Record<string, string> = { "1": "emoji", "2": "star", "3": "meter" };

function Modal({ id, className = "", onOutside, children }: { id: string; className?: string; onOutside?: () => void; children: ReactNode }) {
  return (
    <div
      className={`modal fade show ${className}`} id={id} tabIndex={-1} role="dialog" aria-modal="true" style={{ display: "block" }}
      onClick={e => { if (e.target === e.currentTarget) onOutside?.(); }}
    >
      <div className="modal-dialog" role="document">{children}</div>
    </div>
  );
}

export default function ViewerModals({ engine }: { engine: PitchEngine }) {
  const s = engine.s;
  const env = engine.env;
  const open = engine.modals;

  // Esc closes the thank-you message, as in the PHP viewer.
  useEffect(() => {
    if (!open.has("thankYou")) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") engine.closeThankYou(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [engine, open]);

  return (
    <>
      {open.size > 0 && <div className="modal-backdrop fade show" />}
      {open.has("lead") && s.lead_form && <LeadModal engine={engine} />}
      {open.has("feedback") && s.feedback_form && <FeedbackModal engine={engine} />}
      {open.has("thankYou") && s.thank_you_msg && (
        <Modal id="thankYouModal" onOutside={() => engine.closeThankYou()}>
          <div className="modal-content modal-thankyou">
            {/* eslint-disable-next-line @next/next/no-img-element -- artwork from the PHP app */}
            <img className="thankyou-bg" src={`${env.assets_url}thankyou-bg.png`} alt="thankyou-bg" />
            <div className="modal-header mb-0"><h4 style={{ fontSize: 30 }}>Thank You!</h4></div>
            <div className="modal-body"><p>We truly appreciate your time.</p></div>
            <div style={{ textAlign: "center" }}>
              <button type="button" className="btn btn-primary close-modal" onClick={() => engine.closeThankYou()}>Close</button>
            </div>
          </div>
        </Modal>
      )}
      {open.has("share") && <ShareModal engine={engine} />}
      {open.has("start") && (
        <Modal id="startingModal" className="starting-modal" onOutside={() => engine.begin()}>
          <div className={`modal-content modal-starting${engine.hasAvatar ? "" : " style-2"}`}>
            {engine.hasAvatar && (
              <div className="starting-bg">
                {/* eslint-disable-next-line @next/next/no-img-element -- avatar greeting image from the PHP app */}
                <img src={s.avt_greeting_video || `${env.assets_url}agent_dlf.png`} alt="thankyou-bg" />
              </div>
            )}
            <div className={`modal-body${engine.hasAvatar ? "" : " style-2"}`}>
              <div>
                <h4 className="body-title"><span id="presentation-title" title={s.presentation_name}>{s.presentation_name}</span></h4>
                <p className="body-content">
                  {s.welcome_status && s.welcome_text ? s.welcome_text : "Automate repetitive tasks, generate content, and stay productive. Everything you need to create and manage efficiently, all in one place."}
                </p>
              </div>
              <button type="button" className="btn-continue btn btn-primary start-presentation" onClick={() => engine.begin()}>Continue Now {ARROW}</button>
            </div>
          </div>
        </Modal>
      )}
      {engine.toast && (
        <div role="status" style={{ position: "fixed", top: 12, right: 12, zIndex: 2000, padding: "12px 18px", borderRadius: 4, color: "#fff", background: engine.toast.ok ? "#51a351" : "#bd362f", boxShadow: "0 0 12px #999", fontSize: 14 }}>
          {engine.toast.text}
        </div>
      )}
    </>
  );
}

function LeadModal({ engine }: { engine: PitchEngine }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({ name: "", email: "" });
  const [sending, setSending] = useState(false);

  async function submit() {
    const next = {
      name: name.trim() ? "" : "Name is required",
      email: email.trim() && /\S+@\S+\.\S+/.test(email.trim()) ? "" : "Valid email required",
    };
    setErrors(next);
    if (next.name || next.email) return;
    setSending(true);
    try { await engine.submitLead(name.trim(), email.trim()); }
    catch { engine.showToast("Could not send your details. Please try again.", false); }
    finally { setSending(false); }
  }

  return (
    <Modal id="leadFormModal" className="lead-form-modal">
      <div className="modal-content">
        <div className="modal-body">
          <div className="close-modal">
            <h4 className="modal-title" style={{ marginTop: 0 }}>Get Started</h4>
            <p>Share your details to get started.</p>
          </div>
          <form id="ppt-lead-form" className="leadForm" onSubmit={e => { e.preventDefault(); void submit(); }}>
            <div style={{ marginBottom: 20 }}>
              <div className="form-group">
                <label htmlFor="name_ppt">Name</label>
                <input type="text" id="name_ppt" name="name" className="form-control style-2" placeholder="Enter Your Name Here" value={name} onChange={e => setName(e.target.value)} />
                <span id="name_error_ppt" style={{ color: "red" }}>{errors.name}</span>
              </div>
              <div className="form-group">
                <label htmlFor="email_ppt">Email Address</label>
                <input type="email" id="email_ppt" name="email" className="form-control style-2" placeholder="Enter Your Email Here" value={email} onChange={e => setEmail(e.target.value)} />
                <span id="email_error_ppt" style={{ color: "red" }}>{errors.email}</span>
              </div>
            </div>
            <div className="lead-form-btn">
              <input type="submit" className="btn btn-primary btn-submit leadFormSubmit" value={sending ? "Sending…" : "Submit"} disabled={sending} />
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}

function FeedbackModal({ engine }: { engine: PitchEngine }) {
  const s = engine.s;
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const kind = REACTIONS[String(s.feedback_form_type)] ?? "emoji";

  return (
    <Modal id="feedbackFormModal" className="feedbackFormModal">
      <div className="modal-content modal-feedback">
        <div className="modal-header">
          <div className="header-content">
            <h2>Feedback</h2>
            <p>Rate your experience and share your thoughts with us.</p>
          </div>
          <button type="button" className="close close-modal" id="feedbackFormModalClose" aria-label="Close" onClick={() => engine.closeFeedback()}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-body">
          <form className="feedBackForm" id="ppt-feedback-form" onSubmit={e => { e.preventDefault(); void engine.submitFeedback(rating, message); }}>
            <ul className="reaction-box">
              {[1, 2, 3, 4, 5].map(value => (
                <li key={value} value={value} className={rating === value ? "active" : undefined} onClick={() => setRating(value)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- reaction artwork on the CDN */}
                  <img src={`${engine.env.bucket_url}assets/reactionImages/${kind}-${value}.png`} alt={`${value}`} />
                </li>
              ))}
            </ul>
            <div id="feedbackmodalForm" className="feedback-modal">
              <div className="form-group">
                <h3 className="modal-title-2" id="feedbackmodalLabel">How was your experience?</h3>
                <textarea id="feedbackMessage" className="form-control" style={{ height: "120px" }} placeholder="Write a Comment..." value={message} onChange={e => setMessage(e.target.value)} />
              </div>
              <div style={{ textAlign: "end" }}>
                <input type="submit" id="feedBackSubmit" className="btn btn-primary btn-submit px-5 feedback-bot feedback-sub-pop" value="Submit" style={{ display: "inline-block", width: "auto", padding: "10px 40px" }} />
              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}

function ShareModal({ engine }: { engine: PitchEngine }) {
  const url = engine.s.preview_url;
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      engine.showToast("URL copied to clipboard!");
    } catch {
      engine.showToast("Failed to copy URL", false);
    }
  }
  return (
    <Modal id="shareModal" className="shareModel" onOutside={() => engine.close("share")}>
      <div className="modal-content modal-content-style-2">
        <div className="modal-header" style={{ justifyContent: "space-between" }}>
          <h4 className="modal-title" style={{ marginTop: 0 }}>Share</h4>
          <button type="button" className="close close-modal" aria-label="Close" onClick={() => engine.close("share")}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="social-list d-flex align-items-center flex-wrap gap-3" style={{ textAlign: "center", justifyContent: "center", margin: "20px 0px" }}>
            {SOCIAL.map(([service, icon, label]) => (
              <div key={label}>
                <a className="preview-url social-icons" href={`https://www.addtoany.com/add_to/${service}?linkurl=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
                  <div className="icon">
                    {/* eslint-disable-next-line @next/next/no-img-element -- icon from the PHP app */}
                    <img src={`${engine.env.assets_url}social-icon/${icon}`} alt="" />
                  </div>
                  <div className="name">{label}</div>
                </a>
              </div>
            ))}
          </div>
          <div className="share-link">
            <h4 className="modal-title">Share</h4>
            <div className="input-group">
              <input className="form-control bg-white" value={url} readOnly placeholder="https://present.agent/p/dem13Ks" name="linkUrl" id="linkUrl" autoComplete="off" />
              <button className="btn btn-primary" id="copy_preview_url" onClick={() => void copy()}>{copied ? "Copied!" : "Copy URL"}</button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
