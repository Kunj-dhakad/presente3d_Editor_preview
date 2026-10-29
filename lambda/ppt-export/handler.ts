/**
 * PowerPoint export as an AWS Lambda (Function URL). Same code and checks as
 * /api/generate-ppt, but with up to 15 minutes and more memory than the
 * Amplify server function, which ran out on decks with many images (502).
 *
 * The editor calls it directly when NEXT_PUBLIC_PPT_EXPORT_URL is set.
 * Build with `npm run build:ppt-lambda`; setup is in lambda/ppt-export/README.md.
 */
import { ApiError, consumeLimit, currentUser } from "@shared/server/api";
import { exportPptx } from "@shared/server/pptx";

type FunctionUrlEvent = {
  headers?: Record<string, string | undefined>;
  body?: string;
  isBase64Encoded?: boolean;
  requestContext?: { http?: { method?: string } };
};

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

export async function handler(event: FunctionUrlEvent) {
  const method = event.requestContext?.http?.method ?? "POST";
  // Preflight is answered by the Function URL's CORS settings; this is a fallback.
  if (method === "OPTIONS") return { statusCode: 204, body: "" };
  if (method !== "POST") return reply(405, { error: "Use POST." });

  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers ?? {})) if (value !== undefined) headers.set(name, value);
  // The editor's page is always on another site than the Function URL, so this
  // header says "cross-site" on every call; the Origin check still applies.
  headers.delete("sec-fetch-site");
  const body = event.body ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8") : undefined;
  const request = new Request("https://ppt-export.lambda/", { method, headers, body });

  try {
    await consumeLimit(currentUser(request).id, "export", 10);
    return reply(200, await exportPptx(request));
  } catch (error) {
    if (error instanceof ApiError) return reply(error.status, { status: 0, error: error.message, message: error.message });
    console.error("PPT export failed:", error); // Lambda logs are private to the account
    return reply(500, { error: "The service could not complete this request. Please try again." });
  }
}
