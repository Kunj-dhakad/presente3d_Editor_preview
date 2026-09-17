"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import BookEditor from "./BookEditor";
import useEditorStore, { type SlideType } from "@editor/store/editorStore";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { BookLoader } from "@shared/components/BookLoader";
type SaveContext = {
  status: string;
  save: () => Promise<void>;
  /** Saves and waits until the latest pages are stored; throws if they cannot be. */
  flush: () => Promise<void>;
  download: () => void;
  error: string;
};
const Context = createContext<SaveContext>({
  status: "Loading",
  save: async () => {},
  flush: async () => {},
  download: () => {},
  error: "",
});
export const useBookSave = () => useContext(Context);
export default function EditorWorkspace({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("Saved");
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState<{
    slides: SlideType[];
    version: number;
  } | null>(null);
  const version = useRef(1);
  const saved = useRef<SlideType[] | null>(null);
  const saving = useRef(false);
  const blocked = useRef(false);
  const mounted = useRef(true);
  const draftKey = `fs-draft:${userId}:${id}`;
  const download = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ slides: useEditorStore.getState().slides }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-book-creator-draft.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);
  const save = useCallback(async () => {
    if (saving.current || blocked.current) return;
    const slides = useEditorStore.getState().slides;
    if (slides === saved.current) return;
    saving.current = true;
    setStatus("Saving…");
    setError("");
    try {
      const res = await fetch("/api/books/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: version.current,
          document: { slides },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) blocked.current = true;
        throw new Error(data.error || "Save failed.");
      }
      version.current = data.version;
      saved.current = slides;
      if (mounted.current) {
        if (useEditorStore.getState().slides === slides) {
          sessionStorage.removeItem(draftKey);
          if (data.document?.slides) {
            saved.current = data.document.slides;
            useEditorStore.setState({ slides: data.document.slides });
          }
          setStatus("Saved");
        } else {
          sessionStorage.setItem(
            draftKey,
            JSON.stringify({
              version: version.current,
              slides: useEditorStore.getState().slides,
            }),
          );
          setStatus("Unsaved changes");
        }
      }
    } catch (e) {
      if (mounted.current) {
        setStatus("Save failed");
        setError(e instanceof Error ? e.message : "Save failed.");
      }
    } finally {
      saving.current = false;
    }
  }, [id, draftKey]);

  const flush = useCallback(async () => {
    for (let attempt = 0; attempt < 40; attempt++) {
      if (blocked.current) throw new Error("This book was changed somewhere else. Reload the editor before publishing.");
      if (saving.current) { await new Promise(resolve => setTimeout(resolve, 150)); continue; }
      if (useEditorStore.getState().slides === saved.current) return;
      await save();
      if (!saving.current && useEditorStore.getState().slides !== saved.current && !blocked.current) {
        throw new Error("Could not save the book. Check your connection and try again.");
      }
    }
    throw new Error("Saving is taking too long. Try again in a moment.");
  }, [save]);
  useEffect(() => {
    mounted.current = true;
    let live = true;
    async function load() {
      try {
        const res = await fetch("/api/books/" + id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!live) return;
        version.current = data.version;
        saved.current = data.document.slides;
        blocked.current = false;
        useEditorStore.persist.setOptions({
          name: `fs-editor:${userId}:${id}`,
        });
        useEditorStore.setState({
          slides: data.document.slides,
          activeSlide: 0,
          activeElementId: null,
          selectedElementIds: [],
          past: [],
          future: [],
        });
        useProjectInfoStore
          .getState()
          .setAll({
            id,
            name: data.title,
            api_url: "/api/editor/",
            token: "session",
            projectName: "AI Book Creator",
          });
        try {
          const raw = sessionStorage.getItem(draftKey);
          if (raw) {
            const draft = JSON.parse(raw);
            if (Array.isArray(draft.slides)) setRecovery(draft);
          }
        } catch {}
        setReady(true);
      } catch (e) {
        if (live)
          setLoadError(e instanceof Error ? e.message : "Could not load book.");
      }
    }
    void load();
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [id, userId, draftKey]);
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (state.slides === previous.slides || state.slides === saved.current)
        return;
      setStatus("Unsaved changes");
      try {
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({ version: version.current, slides: state.slides }),
        );
      } catch {
        setError(
          "Local recovery storage is full. Keep this tab open until cloud saving finishes.",
        );
      }
      clearTimeout(timer);
      timer = setTimeout(() => void save(), 1800);
    });
    const retry = setInterval(() => void save(), 15000);
    const unload = (event: BeforeUnloadEvent) => {
      if (useEditorStore.getState().slides !== saved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      unsubscribe();
      clearTimeout(timer);
      clearInterval(retry);
      window.removeEventListener("beforeunload", unload);
    };
  }, [ready, save, draftKey]);
  if (loadError)
    return (
      <main className="fs-app fs-editor-loading">
        <h1>Could not open this book</h1>
        <p role="alert">{loadError}</p>
        <Link href="/dashboard">Back to dashboard</Link>
      </main>
    );
  if (!ready)
    return (
      <main className="fs-app fs-editor-loading">
        <BookLoader label="Opening your book" size={1.2} />
      </main>
    );
  return (
    <Context.Provider value={{ status, save, flush, download, error }}>
      <BookEditor />
      {recovery && (
        <div className="fs-draft-banner" role="status">
          An unsaved draft was found.
          {recovery.version === version.current ? (
            <button
              onClick={() => {
                useEditorStore.setState({ slides: recovery.slides });
                setRecovery(null);
              }}
            >
              Restore draft
            </button>
          ) : (
            <span>
              {" "}
              The cloud copy has changed; download this draft before continuing.
            </span>
          )}
          <button
            onClick={() => {
              const blob = new Blob(
                [JSON.stringify({ slides: recovery.slides }, null, 2)],
                { type: "application/json" },
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "recovered-draft.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Download draft
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem(draftKey);
              setRecovery(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      {error && (
        <div className="fs-draft-banner" role="alert">
          {error}
          <button onClick={() => void save()}>Retry</button>
          <button onClick={download}>Download draft</button>
        </div>
      )}
    </Context.Provider>
  );
}
