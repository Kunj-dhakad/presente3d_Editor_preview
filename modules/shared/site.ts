// Public site identity. Change these values before launch — every marketing,
// legal and email page reads from here.
export const SITE = {
  name: "AI Book Creator",
  tagline: "Write, design and publish beautiful books.",
  description: "AI Book Creator is an AI-powered book editor. Write, design, export and share professional books, guides and workbooks from your browser.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, ""),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com",
  company: process.env.NEXT_PUBLIC_COMPANY_NAME || "AI Book Creator",
  jurisdiction: process.env.NEXT_PUBLIC_LEGAL_JURISDICTION || "the State of Delaware, United States",
  legalUpdated: "September 15, 2026",
};

/** Only allow same-site relative paths as post-login destinations. */
export function safeNext(value: unknown, fallback = "/dashboard") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;
}
