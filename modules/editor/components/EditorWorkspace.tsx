"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import BookEditor from "./BookEditor";
import useEditorStore, { type SlideType } from "@editor/store/editorStore";
import useProjectInfoStore from "@editor/store/projectInfoStore";
import { loadTemplateSlides } from "@editor/layout/AssetsPanel/Template/templateUtils";
import { publishPresentation, saveDraft, type PhpProject } from "@editor/lib/php/phpSync";
import { setApiToken } from "@shared/apiFetch";
import { notifyParent, useParentData } from "@shared/parentBridge";

type SaveContext = {
  status: string;
  save: () => Promise<void>;
  /** Saves and waits until the latest slides are stored; throws if they cannot be. */
  flush: () => Promise<void>;
  /** Saves, sends the PPT, thumbnail and slide images to PHP, then tells PHP to move on. */
  publish: () => Promise<void>;
  /** Where saves go; null until INIT_DATA arrives. */
  project: PhpProject | null;
  download: () => void;
  error: string;
};
const Context = createContext<SaveContext>({
  status: "Loading",
  save: async () => {},
  flush: async () => {},
  publish: async () => {},
  project: null,
  download: () => {},
  error: "",
});
export const usePresentationSave = () => useContext(Context);

const blankSlides = (): SlideType[] => [{
  id: crypto.randomUUID(), width: 853.33, height: 480, background: "#ffffff",
  subtitle_url: "", subtitle_text: "", subtitle_json: "", thumbnail: "", elements: [],
}];

function downloadJson(slides: SlideType[], name: string) {
  const blob = new Blob([JSON.stringify({ slides }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The editor as the PHP app embeds it: the presentation id, token and PHP base
 * URL arrive with INIT_DATA, the slides with LOAD_TEMPLATE, and every save goes
 * back to PHP (see @editor/lib/php/phpSync).
 */
export default function EditorWorkspace() {
  const { init, templateUrl, standalone } = useParentData();
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("Saved");
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState<SlideType[] | null>(null);
  const saved = useRef<SlideType[] | null>(null);
  const saving = useRef(false);
  const mounted = useRef(true);
  const project: PhpProject | null = init ? { apiUrl: init.apiUrl, id: init.id, token: init.token } : null;
  const projectKey = project ? `${project.apiUrl}|${project.id}` : "";
  const draftKey = `ppt-draft:${projectKey}`;

  const download = useCallback(() => downloadJson(useEditorStore.getState().slides, "presentation-draft.json"), []);

  const save = useCallback(async () => {
    if (!project || saving.current) return;
    const slides = useEditorStore.getState().slides;
    if (slides === saved.current) return;
    saving.current = true;
    setStatus("Saving…");
    setError("");
    try {
      await saveDraft(project, slides);
      saved.current = slides;
      if (!mounted.current) return;
      if (useEditorStore.getState().slides === slides) {
        sessionStorage.removeItem(draftKey);
        setStatus("Saved");
      } else {
        setStatus("Unsaved changes");
      }
    } catch (e) {
      if (mounted.current) {
        setStatus("Save failed");
        setError(e instanceof Error ? e.message : "Save failed.");
      }
    } finally {
      saving.current = false;
    }
    // projectKey stands in for project, which is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey, draftKey]);

  const flush = useCallback(async () => {
    for (let attempt = 0; attempt < 40; attempt++) {
      if (saving.current) { await new Promise(resolve => setTimeout(resolve, 150)); continue; }
      if (useEditorStore.getState().slides === saved.current) return;
      await save();
      if (!saving.current && useEditorStore.getState().slides !== saved.current) {
        throw new Error("Could not save the presentation. Check your connection and try again.");
      }
    }
    throw new Error("Saving is taking too long. Try again in a moment.");
  }, [save]);

  const publish = useCallback(async () => {
    if (!project) throw new Error("This editor is not connected to a presentation. Open it from your dashboard to publish.");
    notifyParent("LOADER_ON");
    try {
      await flush();
      await publishPresentation(project, useEditorStore.getState().slides);
      notifyParent("PUBLISH_CLICKED", { id: project.id });
    } finally {
      notifyParent("LOADER_OFF");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey, flush]);

  // Load once both halves of the handoff are here. Opened on its own (no PHP
  // page), the editor starts at once and keeps changes in this tab only.
  useEffect(() => {
    if ((!init && !standalone) || templateUrl === null) return;
    mounted.current = true;
    let live = true;
    setApiToken(init?.token ?? "");
    useProjectInfoStore.getState().setAll({
      id: init?.id ?? "",
      name: init?.name ?? "Untitled presentation",
      api_url: init?.apiUrl ?? "",
      token: init?.token ?? "",
      projectName: "Presentation",
    });
    setStatus(init ? "Saved" : "Not saved");
    (async () => {
      try {
        let slides = templateUrl ? await loadTemplateSlides(templateUrl) : [];
        if (!slides.length) slides = blankSlides();
        if (!live) return;
        // The template cache shares its arrays; the editor must own its copy.
        const own = structuredClone(slides) as SlideType[];
        saved.current = own;
        useEditorStore.setState({
          slides: own,
          activeSlide: 0,
          activeElementId: null,
          selectedElementIds: [],
          past: [],
          future: [],
        });
        try {
          const raw = sessionStorage.getItem(init ? `ppt-draft:${init.apiUrl}|${init.id}` : "ppt-draft:");
          const draft = raw ? JSON.parse(raw) : null;
          if (Array.isArray(draft?.slides)) setRecovery(draft.slides);
        } catch {}
        setReady(true);
      } catch (e) {
        console.error("Could not load the presentation:", e);
        if (live) setLoadError("Could not load this presentation's slides.");
      }
    })();
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [init, templateUrl, standalone]);

  // PHP shows its own loader while the editor starts; take it down once there is something to see.
  useEffect(() => {
    if (ready || loadError) notifyParent("LOADER_OFF");
  }, [ready, loadError]);

  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (state.slides === previous.slides || state.slides === saved.current) return;
      setStatus(projectKey ? "Unsaved changes" : "Not saved");
      try {
        sessionStorage.setItem(draftKey, JSON.stringify({ slides: state.slides }));
      } catch {
        setError("Local recovery storage is full. Keep this tab open until saving finishes.");
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
  }, [ready, save, draftKey, projectKey]);

  if (loadError)
    return (
      <main className="fs-app fs-editor-loading">
        <h1>Could not open this presentation</h1>
        <p role="alert">{loadError}</p>
        <button onClick={() => { setLoadError(""); useEditorStore.setState({ slides: blankSlides(), activeSlide: 0, past: [], future: [] }); saved.current = null; setReady(true); }}>
          Start with a blank slide
        </button>
      </main>
    );
  // PHP's loader covers this moment.
  if (!ready) return null;
  return (
    <Context.Provider value={{ status, save, flush, publish, project, download, error }}>
      <BookEditor />
      {recovery && (
        <div className="fs-draft-banner" role="status">
          An unsaved draft was found.
          <button onClick={() => { useEditorStore.setState({ slides: recovery }); setRecovery(null); }}>
            Restore draft
          </button>
          <button onClick={() => downloadJson(recovery, "recovered-draft.json")}>Download draft</button>
          <button onClick={() => { sessionStorage.removeItem(draftKey); setRecovery(null); }}>Dismiss</button>
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
