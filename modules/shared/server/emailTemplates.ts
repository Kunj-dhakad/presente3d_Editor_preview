import type { RowDataPacket } from "mysql2";
import { db } from "./db";

/**
 * Every email the site sends. The wording lives here as a sensible default and
 * in `email_templates` once an administrator edits it, so the panel owns what
 * customers read without a deploy.
 *
 * Placeholders are written as {{name}} and filled from the values the sender
 * passes; an unknown placeholder is simply left out.
 */

export type EmailTemplateId = "verify" | "reset" | "welcome" | "order-created" | "plan-active" | "contact-received";

export type EmailTemplate = {
  id: EmailTemplateId;
  /** What the panel shows about it. */
  name: string; description: string; when: string; variables: string[];
  subject: string; heading: string; body: string; actionLabel: string | null; footer: string | null;
  enabled: boolean;
  /** False until an administrator has saved their own wording. */
  edited?: boolean;
  updated_at?: string | null;
};

type Defaults = Omit<EmailTemplate, "edited" | "updated_at">;

export const EMAIL_TEMPLATES: Record<EmailTemplateId, Defaults> = {
  verify: {
    id: "verify", name: "Verify email address", description: "Confirms a new account's email address.",
    when: "Sent right after someone signs up.", variables: ["name", "email", "url", "site"],
    subject: "Verify your email", heading: "Confirm your email address",
    body: "Hi {{name}},\n\nThanks for signing up. Confirm your email address to start creating books.",
    actionLabel: "Verify email", footer: "If you did not create an account, you can ignore this email.", enabled: true,
  },
  reset: {
    id: "reset", name: "Password reset", description: "Link to choose a new password.",
    when: "Sent when someone asks to reset their password.", variables: ["name", "email", "url", "site"],
    subject: "Reset your password", heading: "Reset your password",
    body: "Hi {{name}},\n\nWe received a request to reset your password. This link expires soon.",
    actionLabel: "Choose a new password", footer: "If you did not request this, you can ignore this email.", enabled: true,
  },
  welcome: {
    id: "welcome", name: "Welcome", description: "A short hello with a link into the app.",
    when: "Sent once an account is ready to use.", variables: ["name", "email", "url", "site"],
    subject: "Welcome to {{site}}", heading: "Welcome aboard, {{name}}",
    body: "Your account is ready. Create your first book with AI in a couple of minutes, then publish it with a link anyone can read.",
    actionLabel: "Open my workspace", footer: "Need a hand? Just reply to this email.", enabled: true,
  },
  "order-created": {
    id: "order-created", name: "Order recorded", description: "Confirms an order and how to pay it.",
    when: "Sent when an administrator records an order for a customer.", variables: ["name", "email", "plan", "amount", "number", "note", "site"],
    subject: "Your {{plan}} order {{number}}", heading: "Order {{number}} recorded",
    body: "Hi {{name}},\n\nWe have recorded your order for the {{plan}} plan — {{amount}}.\n\n{{note}}\n\nYour plan is activated as soon as the payment is confirmed.",
    actionLabel: "View my plan", footer: "Questions about this order? Reply to this email.", enabled: true,
  },
  "plan-active": {
    id: "plan-active", name: "Plan activated", description: "Tells the customer their new plan is live.",
    when: "Sent when an order is marked paid.", variables: ["name", "email", "plan", "number", "site"],
    subject: "Your {{plan}} plan is active", heading: "{{plan}} is live on your account",
    body: "Hi {{name}},\n\nPayment received — your {{plan}} plan is now active. Your new limits apply right away.",
    actionLabel: "Start creating", footer: "Thank you for supporting {{site}}.", enabled: true,
  },
  "contact-received": {
    id: "contact-received", name: "Message received", description: "Auto-reply to the contact form.",
    when: "Sent when someone writes through the contact form.", variables: ["name", "email", "topic", "site"],
    subject: "We received your message", heading: "Thanks for writing in",
    body: "Hi {{name}},\n\nWe have your message about {{topic}} and will reply by email shortly.",
    actionLabel: null, footer: "This is an automatic confirmation.", enabled: true,
  },
};

export const TEMPLATE_IDS = Object.keys(EMAIL_TEMPLATES) as EmailTemplateId[];
export const isTemplateId = (value: unknown): value is EmailTemplateId => TEMPLATE_IDS.includes(value as EmailTemplateId);

/** The saved wording for every template, falling back to the defaults. */
export async function loadTemplates(): Promise<EmailTemplate[]> {
  // An email still goes out with its original wording if the database is
  // unreachable — losing a password reset over a query is not worth it.
  let rows: RowDataPacket[] = [];
  try { [rows] = await db.query<RowDataPacket[]>("SELECT * FROM email_templates"); }
  catch (error) { console.warn("Email templates could not be read:", error instanceof Error ? error.message : error); }
  const saved = new Map(rows.map(row => [String(row.id), row]));
  return TEMPLATE_IDS.map(id => {
    const base = EMAIL_TEMPLATES[id];
    const row = saved.get(id);
    if (!row) return { ...base, edited: false, updated_at: null };
    return {
      ...base,
      subject: String(row.subject || base.subject), heading: String(row.heading || base.heading), body: String(row.body || base.body),
      actionLabel: row.action_label === null ? base.actionLabel : String(row.action_label),
      footer: row.footer === null ? base.footer : String(row.footer),
      enabled: Boolean(row.enabled), edited: true, updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  });
}

export async function loadTemplate(id: EmailTemplateId) {
  return (await loadTemplates()).find(template => template.id === id)!;
}

export async function saveTemplate(id: EmailTemplateId, input: Record<string, unknown>, adminId: string) {
  const base = EMAIL_TEMPLATES[id];
  const text = (value: unknown, fallback: string, max: number) => (typeof value === "string" && value.trim() ? value.trim() : fallback).slice(0, max);
  const subject = text(input.subject, base.subject, 200);
  const heading = text(input.heading, base.heading, 200);
  const body = text(input.body, base.body, 4000);
  const action = input.actionLabel === null || input.actionLabel === "" ? null : text(input.actionLabel, base.actionLabel ?? "", 80) || null;
  const footer = input.footer === null || input.footer === "" ? null : text(input.footer, base.footer ?? "", 300) || null;
  const enabled = input.enabled === undefined ? true : Boolean(input.enabled);
  await db.execute(
    `INSERT INTO email_templates (id, subject, heading, body, action_label, footer, enabled, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE subject=VALUES(subject), heading=VALUES(heading), body=VALUES(body), action_label=VALUES(action_label),
       footer=VALUES(footer), enabled=VALUES(enabled), updated_by=VALUES(updated_by), updated_at=UTC_TIMESTAMP(3)`,
    [id, subject, heading, body, action, footer, enabled ? 1 : 0, adminId]);
}

/** Puts a template back to the wording shipped with the app. */
export async function resetTemplate(id: EmailTemplateId) {
  await db.execute("DELETE FROM email_templates WHERE id=?", [id]);
}

/** Fills {{placeholders}}; anything without a value disappears, with its blank line. */
export function fill(text: string, values: Record<string, string | undefined>) {
  return text
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => values[key] ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
