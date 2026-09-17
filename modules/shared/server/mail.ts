import nodemailer from "nodemailer";
import { SITE } from "@shared/site";
import { BRAND } from "@shared/brand";

const templates = {
  verify: { subject: "Verify your email", heading: "Confirm your email address", body: "Thanks for signing up. Confirm your email to start creating books.", action: "Verify email" },
  reset: { subject: "Reset your password", heading: "Reset your password", body: "We received a request to reset your password. This link expires soon.", action: "Choose a new password" },
};

const escape = (value: string) => value.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

export async function sendAccountEmail(to: string, kind: keyof typeof templates, url: string, name?: string) {
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) throw new Error("Configure SMTP_HOST and MAIL_FROM for account email.");
  const t = templates[kind];
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  const greeting = name ? `Hi ${name},` : "Hi,";
  const html = `<div style="background:#f5f3fc;padding:32px 16px;font-family:Arial,sans-serif;color:#202432">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e6e0f3">
<p style="font-weight:700;color:${BRAND.accent};margin:0 0 24px">${SITE.name}</p>
<h1 style="font-size:22px;margin:0 0 12px">${t.heading}</h1>
<p style="color:#555;line-height:1.6">${escape(greeting)}<br>${t.body}</p>
<p style="margin:28px 0"><a href="${escape(url)}" style="background:${BRAND.accent};color:#fff;padding:12px 20px;border-radius:9px;text-decoration:none;font-weight:600">${t.action}</a></p>
<p style="color:#888;font-size:12px;line-height:1.6">Button not working? Paste this link into your browser:<br><span style="word-break:break-all">${escape(url)}</span></p>
<p style="color:#888;font-size:12px">If you did not request this, you can ignore this email.</p>
</div><p style="text-align:center;color:#999;font-size:11px">${SITE.name} · ${escape(SITE.supportEmail)}</p></div>`;
  await transport.sendMail({
    from: process.env.MAIL_FROM, to, subject: `${SITE.name} — ${t.subject}`, html,
    text: `${greeting}\n\n${t.body}\n\n${t.action}: ${url}\n\nIf you did not request this, you can ignore this email.`,
  });
}
