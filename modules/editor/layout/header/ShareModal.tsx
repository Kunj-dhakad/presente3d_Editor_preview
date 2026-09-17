"use client";
import Image from 'next/image'
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
// generateSlidesZip is imported lazily in handleZip — a static import puts
// jszip, file-saver and html-to-image in the initial bundle for a rare click.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleNotch, faDownload } from '@fortawesome/free-solid-svg-icons'
import clsx from "clsx";

/* ---------------- TYPES ---------------- */

interface ShareModalProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}



export default function ShareModal({ open, setOpen }: ShareModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const slides = useEditorStore((s) => s.slides);
  // const { setImageExportMode } = useEditorUIStore.getState();

  const [loadingItems, setLoadingItems] = useState<string[]>([]);
  // A failed export used to look exactly like a finished one: the spinner
  // stopped, nothing downloaded, and the reason went to the console where
  // nobody was looking.
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---------- EXPORT HANDLERS ---------- */
  const startLoading = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setLoadingItems((prev) => [...prev, key]);
  };

  const stopLoading = (key: string) => {
    setLoadingItems((prev) => prev.filter((item) => item !== key));
  };

  const failWith = (key: string, error: unknown, fallback: string) => {
    console.error(`${key} export failed:`, error);
    setErrors((prev) => ({
      ...prev,
      [key]: error instanceof Error && error.message ? error.message : fallback,
    }));
  };

  /** Firefox ignores a click on an anchor that is not in the document. */
  const triggerDownload = (href: string, filename: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /** The message an API route sent, when it sent one. */
  const errorFromResponse = async (res: Response, fallback: string) => {
    const body = await res.json().catch(() => null);
    return new Error(body?.error || fallback);
  };

  const handlePpt = async () => {
    try {
      startLoading("ppt");
      const res = await fetch("/api/generate-ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides }),
      });

      if (!res.ok) throw await errorFromResponse(res, "The slides could not be converted.");

      const data = await res.json();
      if (!data?.url) throw new Error("The export service returned no file.");

      triggerDownload(data.url, "presentation.pptx");
    } catch (err) {
      failWith("ppt", err, "PowerPoint export failed.");
    } finally {
      stopLoading("ppt");
    }
  };

  const handlePdf = async () => {
    try {
      startLoading("pdf");

      // Goes through our own route rather than straight to the render Lambda:
      // calling it from here meant shipping its credential in the bundle.
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides }),
      });

      if (!res.ok) throw await errorFromResponse(res, "The PDF could not be generated.");

      const data = await res.json();
      if (!data?.url) throw new Error("The export service returned no file.");

      triggerDownload(data.url, "book.pdf");
    } catch (err) {
      failWith("pdf", err, "PDF export failed.");
    } finally {
      stopLoading("pdf");
    }
  };

  const handleZip = async () => {
    try {
      startLoading("pngs");
      const { generateSlidesZip } = await import(
        "@editor/lib/outputGenerateLibrary/generateZip"
      );
      await generateSlidesZip();
    } catch (err) {
      failWith("pngs", err, "Image export failed.");
    } finally {
      stopLoading("pngs");
    }
  };

  const handlejson = async () => {
    const urls: string[] = [];
    try {
      startLoading("json");
      const jsonData = JSON.stringify({ slides }, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const exportForm = new FormData();
      exportForm.append("file", blob, "book.json");
      const stored = await fetch("/api/exports", {method:"POST",body:exportForm});
      if (!stored.ok) throw new Error("Could not save the JSON export.");
      const url = URL.createObjectURL(blob);
      urls.push(url);
      triggerDownload(url, "Template.json");
    } catch (err) {
      failWith("json", err, "JSON export failed.");
    } finally {
      // Revoking in the same tick can cancel the download the click started.
      urls.forEach((url) => setTimeout(() => URL.revokeObjectURL(url), 10_000));
      stopLoading("json");
    }
  };

  /* ---------- OUTSIDE CLICK ---------- */

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen]);

  if (!open) return null;

  /* ---------- UI ---------- */

  return (
    <div className="playfair.className kd-export-window-black  fixed inset-0 z-9999 flex items-center justify-center  ">
      <div
        ref={modalRef}
        className="w-full max-w-xl kd-export-container rounded-2xl shadow-xl p-6 animate-[fadeIn_0.2s_ease]"
      >
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Export
          </h2>
          <button onClick={() => setOpen(false)}>
            <X className="w-5 h-5 " />
          </button>
        </div>
        <div className="h-px w-full mt-2" />
        {/* OPTIONS */}
        <div className="mt-3 space-y-3">
          <ExportItem
            icon={"https://kd-presentation-editor.s3.us-east-1.amazonaws.com/File/icons/Pdf.png"}
            label="Export To PDF"
            onClick={handlePdf}
            active={loadingItems.includes("pdf")}
            error={errors.pdf}
          />

          <ExportItem
            icon={"https://kd-presentation-editor.s3.us-east-1.amazonaws.com/File/icons/Ppt.png"}
            label="Export To PowerPoint"
            onClick={handlePpt}
            active={loadingItems.includes("ppt")}
            error={errors.ppt}
          />

          <ExportItem
            icon={"https://kd-presentation-editor.s3.us-east-1.amazonaws.com/File/icons/iamge.png"}
            label="Export as PNGs"
            onClick={handleZip}
            active={loadingItems.includes("pngs")}
            error={errors.pngs}
          />


          <ExportItem
            icon={"https://kd-presentation-editor.s3.us-east-1.amazonaws.com/File/icons/iamge.png"}
            label="Export as Json"
            onClick={handlejson}
            active={loadingItems.includes("json")}
            error={errors.json}
          />

          {/* <ExportItem
            icon={<Images className="kd-fg-accent" />}
            label="Export Current Slide (PNG)"
            onClick={handleCurrentSlideImage}
            active={loadingItem === "current-png"}
          /> */}
        </div>
      </div>
    </div>
  );
}


function ExportItem({
  icon,
  label,
  onClick,
  active,
  error,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  /** Why the last attempt failed; shown in place of nothing happening. */
  error?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "kd-export-item",
        // active && "kd-export-item-active"
      )}
    >
      {/* LEFT SIDE (ICON AREA) */}
      <div className="kd-export-left">
        <div className="kd-export-icon">
          <Image
            src={icon}
            width={42}
            height={42}
            unoptimized
            alt="export icon"
          />
        </div>
      </div>

      {/* RIGHT SIDE (CONTENT AREA) */}
      <div className="kd-export-content">
        <span className="kd-export-label">{label}</span>

        {error && (
          <span
            role="alert"
            style={{
              display: "block",
              fontSize: 11,
              lineHeight: 1.4,
              color: "var(--kd-text-danger)",
              maxWidth: 260,
            }}
          >
            {error} Try again.
          </span>
        )}

        <button
          className="kd-export-btn"
        // onClick={(e) => e.stopPropagation()}
        >
          {active ? (
            <>
              Download...
              <FontAwesomeIcon
                className="animate-spin"
                icon={faCircleNotch}
              />
            </>
          ) : (
            <>
              {error ? "Retry" : "Download"}
              <FontAwesomeIcon icon={faDownload} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}