import type { ViewerEnv, ViewerSettings } from "./types";

/**
 * The calls the PHP viewer made (assets/presentation/js/*.js), to the same
 * endpoints. PHP's Presentation_view_controller sends CORS headers so they can
 * be read from this app's domain; the lead form goes to another controller,
 * so it is sent without reading the reply.
 */

/* ---------- visitor id and "already done" flags ---------- */

// Cookies set inside a cross-site iframe are often blocked, so localStorage backs them up.
function readCookie(name: string) {
  for (const part of document.cookie.split(";")) {
    const cookie = part.trim();
    if (cookie.startsWith(name + "=")) return cookie.slice(name.length + 1);
  }
  return null;
}
export function getFlag(name: string) {
  try { return readCookie(name) || localStorage.getItem(name); } catch { return readCookie(name); }
}
export function setFlag(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=864000; SameSite=None; Secure`;
  try { localStorage.setItem(name, value); } catch { /* storage blocked */ }
}
export function visitorId() {
  let id = getFlag("visitor_idPpt");
  if (!id) {
    id = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    setFlag("visitor_idPpt", id);
  }
  return id;
}

/* ---------- helpers ---------- */

function form(fields: Record<string, string | number>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, String(value));
  return data;
}
async function postForm<T>(url: string, fields: Record<string, string | number>): Promise<T> {
  const res = await fetch(url, { method: "POST", body: form(fields) });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

/* ---------- chat ---------- */

/** Google's free translate endpoint, as languageDetect.js used; brand words count as English. */
export async function detectLanguage(text: string) {
  if (/\bpresent3d\b/i.test(text)) return "en";
  try {
    const url = "https://translate.googleapis.com/translate_a/single?" + new URLSearchParams({ client: "gtx", sl: "auto", tl: "en", dt: "t", q: text });
    const data = await (await fetch(url)).json();
    return typeof data?.[2] === "string" ? data[2] : "en";
  } catch {
    return "en";
  }
}

/** The trained answer for this presentation; empty when there is none. */
export async function askTrained(s: ViewerSettings, question: string, language: string) {
  const res = await fetch("https://ai.oppyo.com/app/v1/ask_question", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({
      query: question,
      app_id: s.ppt_id,
      api_key: "D684B8EFF387DBD9",
      client_id: visitorId(),
      project_id: "11",
      language_code: language,
      response_length: String(s.response_length || 30),
    }),
  });
  const data = await res.json().catch(() => null);
  const answer = typeof data?.answer === "string" ? data.answer : "";
  if (!answer || answer === "Training Data not Found" || data?.httpsCode == 500) return "";
  return answer;
}

/** OpenAI through PHP (get-ai-respo), for questions the training does not cover. */
export async function askAi(env: ViewerEnv, s: ViewerSettings, message: string, language: string) {
  const data = await postForm<{ txt?: string; history?: unknown }>(env.site_url + "get-ai-respo", {
    message,
    history: (() => { try { return localStorage.getItem("history") || ""; } catch { return ""; } })(),
    type: "response",
    language,
    response_length: s.response_length || 30,
  });
  try { if (data.history !== undefined) localStorage.setItem("history", JSON.stringify(data.history)); } catch { /* storage blocked */ }
  return data.txt || "I am sorry, I could not process that.";
}

/** Spoken answer (Speechify through PHP's txt-to-speech) as a data URL. */
export async function textToSpeech(env: ViewerEnv, s: ViewerSettings, text: string) {
  const data = await postForm<{ audio_data?: string }>(env.site_url + "txt-to-speech", {
    inputText: text,
    voice_id: s.voice_id || "henry",
    voice_type: s.voice_type || 1,
    audio_format: "mp3",
  });
  if (!data?.audio_data) throw new Error("No audio data received");
  return `data:audio/mp3;base64,${data.audio_data}`;
}

/** type 1: the visitor's message, 2: the answer. */
export function saveChat(env: ViewerEnv, s: ViewerSettings, message: string, type: 1 | 2) {
  if (env.mode === "owner" || !env.site_url) return;
  void fetch(env.site_url + "save-chat-history", {
    method: "POST",
    body: form({ type, ppt_id: s.ppt_id, user_id: s.user_id, chat_msg: message, visitor_id: visitorId() }),
  }).catch(() => {});
}

/* ---------- forms ---------- */

export async function submitLead(env: ViewerEnv, s: ViewerSettings, name: string, email: string) {
  if (env.mode === "owner" || !env.site_url) return;
  const query = new URLSearchParams({
    name, email,
    autoresponder_id: s.autoresponder_id,
    list_id: s.auto_list_id,
    prompt_id: s.ppt_id,
    visitor_id: visitorId(),
    user_id: s.user_id,
    business_id: s.business_id,
  });
  // Autoresponder_sender_controller sends no CORS headers: the request still
  // arrives, the reply just cannot be read.
  await fetch(`${env.site_url}autoresponder_datasender?${query}`, { mode: "no-cors" });
}

export async function submitFeedback(env: ViewerEnv, s: ViewerSettings, rating: number, message: string) {
  if (env.mode === "owner" || !env.site_url) return;
  await postForm(env.site_url + "feedback-submit", { ppt_id: s.ppt_id, visitor_id: visitorId(), selectedValue: rating, message });
}

/* ---------- counts (slideCountEngine.js) ---------- */

let visitCount = 0;
export async function countSlideVisit(env: ViewerEnv, s: ViewerSettings, slideIndex: number, totalSlides: number) {
  if (env.mode === "owner" || !env.site_url) return;
  try {
    const data = await postForm<{ counts?: string }>(env.site_url + "get-slide-count", { ppt_id: s.ppt_id });
    let counts: number[] = [];
    try { counts = JSON.parse(data.counts || "[]") || []; } catch { counts = []; }
    if (!counts.length) counts = new Array(totalSlides).fill(0);
    counts = counts.map((value, index) => {
      const n = Number(value);
      if (index !== slideIndex) return n;
      if (visitCount === 0 && n === 0) return ++visitCount;
      return n + 1;
    });
    await postForm(env.site_url + "save-slide-count", { ppt_id: s.ppt_id, visit_count: JSON.stringify(counts) });
    visitCount = 0;
  } catch { /* counting must never disturb the visitor */ }
}

export function countPresentationView(env: ViewerEnv, s: ViewerSettings) {
  if (env.mode === "owner" || !env.site_url) return;
  void fetch(env.site_url + "save-presentation-count", { method: "POST", body: form({ ppt_id: s.ppt_id }) }).catch(() => {});
}

export function countShare(env: ViewerEnv, s: ViewerSettings) {
  if (env.mode === "owner" || !env.site_url) return;
  void fetch(env.site_url + "save-share-count", { method: "POST", body: form({ ppt_id: s.ppt_id }) }).catch(() => {});
}
