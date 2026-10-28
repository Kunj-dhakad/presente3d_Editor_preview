"use client";
import { useEffect, useState } from "react";
import type { ViewerData } from "@/modules/viewer/types";

/**
 * The editor and preview run inside an iframe on the PHP app
 * (views/default/presentation/editor/presentation_editor.php). They talk with
 * window.postMessage:
 *
 *   iframe → PHP   REACT_READY            the page is listening
 *   PHP → iframe   INIT_DATA              { id, name, token, URL }  (URL = PHP base URL)
 *   PHP → iframe   LOAD_TEMPLATE          { templateUrl }           (the presentation JSON)
 *   PHP → iframe   VIEWER_DATA            { viewer }                (preview: settings, PHP URLs, slides)
 *   iframe → PHP   LOADER_ON / LOADER_OFF show or hide PHP's full-page loader
 *   iframe → PHP   PUBLISH_CLICKED        saved and published; PHP moves on to customize-slide
 *   iframe → PHP   EDITOR_BACK            the user left the editor
 *   iframe → PHP   VIEWER_BACK            the preview's back arrow
 *
 * Opened directly (no parent page), the same data can come from the query
 * string — ?id=&token=&api=&name=&template= — which is handy in development.
 */
export type ParentData = { id: string; name: string; token: string; apiUrl: string };

let parentOrigin = "*";

/** NEXT_PUBLIC_PARENT_ORIGINS: comma-separated origins, `https://*.example.com` allowed. Empty allows any (development). */
function allowedOrigin(origin: string) {
  const list = (process.env.NEXT_PUBLIC_PARENT_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!list.length) return true;
  return list.some(rule => {
    if (!rule.includes("*")) return rule === origin;
    const pattern = new RegExp("^" + rule.split("*").map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[a-z0-9-]+") + "$", "i");
    return pattern.test(origin);
  });
}

export function inIframe() {
  return typeof window !== "undefined" && window.parent !== window;
}

export function notifyParent(type: string, data: Record<string, unknown> = {}) {
  if (!inIframe()) return;
  window.parent.postMessage({ type, ...data }, parentOrigin);
}

const withSlash = (url: string) => (url && !url.endsWith("/") ? url + "/" : url);

/**
 * Says REACT_READY and collects INIT_DATA / LOAD_TEMPLATE. `needsInit` is false
 * for the preview, which only needs the JSON URL.
 */
export function useParentData(needsInit = true) {
  const [init, setInit] = useState<ParentData | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  /**
   * Opened on its own, without a PHP page: no INIT_DATA will arrive. The editor
   * still opens, but has nowhere to save; the preview has nothing to show.
   */
  const [standalone, setStandalone] = useState(false);
  const [viewer, setViewer] = useState<ViewerData | null>(null);

  useEffect(() => {
    if (!inIframe()) {
      const query = new URLSearchParams(window.location.search);
      // Reading the URL once on mount is the only way to get it on the client.
      /* eslint-disable react-hooks/set-state-in-effect */
      const hasInit = Boolean(query.get("id") && query.get("token") && query.get("api"));
      // The editor opens anyway, on a blank slide; the preview needs slides to show.
      if (query.get("template") || needsInit) setTemplateUrl(query.get("template") || "");
      if (needsInit && hasInit) {
        setInit({ id: query.get("id")!, name: query.get("name") || "Untitled presentation", token: query.get("token")!, apiUrl: withSlash(query.get("api")!) });
      }
      setStandalone(needsInit ? !hasInit : !query.get("template"));
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || !allowedOrigin(event.origin)) return;
      const message = event.data;
      if (!message || typeof message !== "object") return;
      if (message.type === "INIT_DATA" && message.id && message.token) {
        parentOrigin = event.origin;
        setInit({
          id: String(message.id),
          name: String(message.name || "Untitled presentation"),
          token: String(message.token),
          apiUrl: withSlash(String(message.URL || event.origin + "/")),
        });
      }
      if (message.type === "VIEWER_DATA" && message.viewer && typeof message.viewer === "object") {
        parentOrigin = event.origin;
        setViewer(message.viewer as ViewerData);
      }
      if (message.type === "LOAD_TEMPLATE" && typeof message.templateUrl === "string") {
        parentOrigin = event.origin;
        setTemplateUrl(message.templateUrl);
      }
    };
    window.addEventListener("message", onMessage);
    // REACT_READY carries nothing secret, so any parent may hear it.
    window.parent.postMessage({ type: "REACT_READY" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, [needsInit]);

  return { init, templateUrl, standalone, viewer };
}
