import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { SITE } from "@shared/site";
import { BRAND } from "@shared/brand";
import { db } from "./db";
import { fill, loadTemplate, type EmailTemplateId } from "./emailTemplates";

/**
 * Sending email. What each message says comes from the Administration panel
 * (email_templates); this file only turns that wording into a message and
 * records that it went out.
 */

const escape = (value: string) => value.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);

function transport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
}

export type EmailValues = { name?: string; email?: string; url?: string; [key: string]: string | undefined };

/** The finished message, ready to send or to preview in the panel. */
export async function renderEmail(id: EmailTemplateId, values: EmailValues) {
  const template = await loadTemplate(id);
  const vars: EmailValues = { site: SITE.name, name: values.name || "there", ...values };
  const subject = fill(template.subject, vars);
  const heading = fill(template.heading, vars);
  const body = fill(template.body, vars);
  const footer = template.footer ? fill(template.footer, vars) : "";
  const action = template.actionLabel && vars.url ? { label: fill(template.actionLabel, vars), url: vars.url } : null;
  const paragraphs = body.split(/\n{2,}/).map(part => `<p style="color:#555;line-height:1.6;margin:0 0 14px">${escape(part).replace(/\n/g, "<br>")}</p>`).join("");
  const html = `<div style="background:#f5f3fc;padding:32px 16px;font-family:Arial,sans-serif;color:#202432">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e6e0f3">
<p style="font-weight:700;color:${BRAND.accent};margin:0 0 24px">${escape(SITE.name)}</p>
<h1 style="font-size:22px;margin:0 0 12px">${escape(heading)}</h1>
${paragraphs}
${action ? `<p style="margin:28px 0"><a href="${escape(action.url)}" style="background:${BRAND.accent};color:#fff;padding:12px 20px;border-radius:9px;text-decoration:none;font-weight:600">${escape(action.label)}</a></p>
<p style="color:#888;font-size:12px;line-height:1.6">Button not working? Paste this link into your browser:<br><span style="word-break:break-all">${escape(action.url)}</span></p>` : ""}
${footer ? `<p style="color:#888;font-size:12px">${escape(footer)}</p>` : ""}
</div><p style="text-align:center;color:#999;font-size:11px">${escape(SITE.name)} · ${escape(SITE.supportEmail)}</p></div>`;
  const text = [body, action ? `${action.label}: ${action.url}` : "", footer].filter(Boolean).join("\n\n");
  return { subject, heading, body, html, text, enabled: template.enabled };
}

/** Sends one templated email and records it. Never throws for the caller's sake unless `required`. */
export async function sendEmail(to: string, id: EmailTemplateId, values: EmailValues = {}, options: { required?: boolean; adminId?: string } = {}) {
  const message = await renderEmail(id, { ...values, email: to });
  if (!message.enabled) return { sent: false, reason: "This email is switched off in Administration." };
  if (!mailConfigured()) {
    if (options.required) throw new Error("Configure SMTP_HOST and MAIL_FROM to send email.");
    return { sent: false, reason: "Email is not configured on this server." };
  }
  try {
    await transport().sendMail({ from: process.env.MAIL_FROM, to, subject: `${SITE.name} — ${message.subject}`, html: message.html, text: message.text });
    await log(id, to, message.subject, "sent", null, options.adminId);
    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await log(id, to, message.subject, "failed", reason, options.adminId);
    if (options.required) throw error;
    return { sent: false, reason };
  }
}

async function log(template: string, recipient: string, subject: string, status: string, error: string | null, adminId?: string) {
  try {
    await db.execute("INSERT INTO email_log (id, template, recipient, subject, status, error, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [randomUUID(), template, recipient.slice(0, 254), subject.slice(0, 200), status, error?.slice(0, 255) ?? null, adminId ?? null]);
  } catch { /* the email matters more than its record */ }
}

/** Account email that the flow depends on: a failure has to reach the caller. */
export async function sendAccountEmail(to: string, kind: "verify" | "reset", url: string, name?: string) {
  await sendEmail(to, kind, { url, name }, { required: true });
}
