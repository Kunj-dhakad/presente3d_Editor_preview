"use client";

import { useEffect, useState } from "react";
import PreviewBook from "./PreviewBook";

interface LoadTemplateMessage {
  type: "LOAD_TEMPLATE";
  templateUrl: string;
}

export default function PreviewPage() {
  const [jsonUrl, setJsonUrl] = useState<string | null>(null);

  useEffect(() => {
    window.parent.postMessage({ type: "REACT_READY" }, "*");
  }, []);

  useEffect(() => {
    function handleMessage(e: MessageEvent<Partial<LoadTemplateMessage>>) {
      if (e.data?.type === "LOAD_TEMPLATE" && e.data.templateUrl) {
        setJsonUrl(e.data.templateUrl);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!jsonUrl) {
    return <main className="h-dvh kd-bg-hover" aria-busy="true" />;
  }

  return <PreviewBook jsonUrl={jsonUrl} mode="page" />;
}
