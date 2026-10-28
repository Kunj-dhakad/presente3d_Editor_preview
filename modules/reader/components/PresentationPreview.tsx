"use client";
import { useEffect, useState } from "react";
import { OpenFromApp } from "@shared/components/OpenFromApp";
import { setApiToken } from "@shared/apiFetch";
import { inIframe, useParentData } from "@shared/parentBridge";
import PitchViewer from "@/modules/viewer/PitchViewer";

/** How long to wait for VIEWER_DATA after LOAD_TEMPLATE before showing the slides with default settings. */
const SETTINGS_GRACE_MS = 1500;

/**
 * The preview page: the pitch viewer (chat, avatar, narration, forms) fed by
 * the PHP page. VIEWER_DATA carries the presentation's settings and usually
 * the slides themselves; a page that only sends LOAD_TEMPLATE gets the viewer
 * with default settings. Opened directly, ?template=<json url> works too.
 */
export default function PresentationPreview() {
  const { init, templateUrl, standalone, viewer } = useParentData(false);
  const [graceOver, setGraceOver] = useState(false);
  useEffect(() => { if (init) setApiToken(init.token); }, [init]);
  useEffect(() => {
    if (!templateUrl || viewer) return;
    const timer = setTimeout(() => setGraceOver(true), SETTINGS_GRACE_MS);
    return () => clearTimeout(timer);
  }, [templateUrl, viewer]);

  if (standalone) return <OpenFromApp />;
  const ready = viewer ? (viewer.document !== undefined || Boolean(templateUrl)) : Boolean(templateUrl) && (graceOver || !inIframe());
  // PHP's loader covers this moment; the viewer takes it down once the slides are in.
  if (!ready) return null;
  return <PitchViewer key={viewer ? "settings" : "defaults"} data={viewer} templateUrl={templateUrl} />;
}
