/**
 * Google font loading for the editor.
 *
 * The font panel asks for ~80 previews the moment it opens. Injecting one
 * <link> per family (each pulling regular + bold + italic) meant hundreds of
 * parallel requests and stylesheet parses, which froze the editor. So requests
 * are batched into shared stylesheets, run through a small concurrency queue,
 * and previews only ask for the single weight a row actually renders.
 */

const MAX_CONCURRENT_REQUESTS = 3;
const PREVIEW_BATCH_SIZE = 8;
const BATCH_WINDOW_MS = 80;
const REQUEST_TIMEOUT_MS = 8000;

/** Weights a selected font needs; previews get regular only. */
const FULL_AXES = "ital,wght@0,400;0,700;1,400";
const PREVIEW_AXES = "wght@400";

type Entry = { promise: Promise<void>; full: boolean };

const entries = new Map<string, Entry>();
const injectedHrefs = new Set<string>();

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";
const slug = (family: string) => encodeURIComponent(family.trim()).replace(/%20/g, "+");

/* ------------------------------------------------------------------ */
/* Concurrency-limited request queue                                    */
/* ------------------------------------------------------------------ */

type Job = () => Promise<void>;

const queue: Job[] = [];
let inFlight = 0;

function pump() {
  while (inFlight < MAX_CONCURRENT_REQUESTS && queue.length > 0) {
    const job = queue.shift()!;
    inFlight += 1;
    job()
      .catch(() => undefined)
      .finally(() => {
        inFlight -= 1;
        pump();
      });
  }
}

/** `priority` jumps the queue — a font the user just picked beats previews. */
function enqueue(job: Job, priority = false) {
  if (priority) queue.unshift(job);
  else queue.push(job);
  pump();
}

/* ------------------------------------------------------------------ */
/* Stylesheet injection                                                 */
/* ------------------------------------------------------------------ */

let preconnected = false;

function preconnect() {
  if (preconnected || !isBrowser()) return;
  preconnected = true;
  for (const [href, crossOrigin] of [
    ["https://fonts.googleapis.com", false],
    ["https://fonts.gstatic.com", true],
  ] as const) {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    if (crossOrigin) link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
}

/** Resolves on load, on error, or on timeout — never leaves a queue slot stuck. */
function injectStylesheet(href: string): Promise<void> {
  if (injectedHrefs.has(href)) return Promise.resolve();
  injectedHrefs.add(href);
  preconnect();

  return new Promise<void>((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(settle, REQUEST_TIMEOUT_MS);

    link.onload = settle;
    link.onerror = settle;
    document.head.appendChild(link);
  });
}

/** Waits for the face itself, not just the CSS. Falls through on timeout. */
function ensureFaceReady(family: string): Promise<void> {
  if (!isBrowser() || !("fonts" in document)) return Promise.resolve();
  return Promise.race([
    document.fonts.load(`400 16px "${family}"`).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, REQUEST_TIMEOUT_MS)),
  ]).catch(() => undefined);
}

/* ------------------------------------------------------------------ */
/* Preview batching                                                     */
/* ------------------------------------------------------------------ */

let pendingPreviews: string[] = [];
const previewResolvers = new Map<string, (() => void)[]>();
let flushHandle: ReturnType<typeof setTimeout> | null = null;

function settlePreview(family: string) {
  const resolvers = previewResolvers.get(family);
  previewResolvers.delete(family);
  resolvers?.forEach((resolve) => resolve());
}

function flushPreviews() {
  flushHandle = null;
  const families = pendingPreviews;
  pendingPreviews = [];

  for (let i = 0; i < families.length; i += PREVIEW_BATCH_SIZE) {
    const batch = families.slice(i, i + PREVIEW_BATCH_SIZE);
    const href =
      "https://fonts.googleapis.com/css2?" +
      batch.map((family) => `family=${slug(family)}:${PREVIEW_AXES}`).join("&") +
      "&display=swap";

    enqueue(async () => {
      await injectStylesheet(href);
      // `display=swap` means the row can render now; the woff2 for a family
      // is only fetched once its row is actually painted with it.
      batch.forEach(settlePreview);
    });
  }
}

function schedulePreview(family: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const resolvers = previewResolvers.get(family) ?? [];
    resolvers.push(resolve);
    previewResolvers.set(family, resolvers);

    if (!pendingPreviews.includes(family)) pendingPreviews.push(family);
    if (flushHandle === null) flushHandle = setTimeout(flushPreviews, BATCH_WINDOW_MS);
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Regular weight only, batched with every other preview asked for in the same
 * tick. Use for list rows and other throwaway samples.
 */
export function loadFontPreview(fontFamily: string): Promise<void> {
  if (!fontFamily || !isBrowser()) return Promise.resolve();

  const existing = entries.get(fontFamily);
  if (existing) return existing.promise;

  const promise = schedulePreview(fontFamily);
  entries.set(fontFamily, { promise, full: false });
  return promise;
}

/**
 * All weights the editor renders (regular, bold, italic). Resolves once the
 * face is usable — or once it is clear it will not be, so callers gating
 * visibility on this never wait forever.
 */
export function loadGoogleFont(fontFamily: string): Promise<void> {
  if (!fontFamily || !isBrowser()) return Promise.resolve();

  const existing = entries.get(fontFamily);
  if (existing?.full) return existing.promise;

  const href = `https://fonts.googleapis.com/css2?family=${slug(fontFamily)}:${FULL_AXES}&display=swap`;

  const promise = new Promise<void>((resolve) => {
    enqueue(async () => {
      await injectStylesheet(href);
      await ensureFaceReady(fontFamily);
      resolve();
    }, true);
  });

  entries.set(fontFamily, { promise, full: true });
  return promise;
}

export function useLoadFontOnMount(fontFamily: string | undefined) {
  if (isBrowser() && fontFamily) {
    void loadGoogleFont(fontFamily);
  }
}
