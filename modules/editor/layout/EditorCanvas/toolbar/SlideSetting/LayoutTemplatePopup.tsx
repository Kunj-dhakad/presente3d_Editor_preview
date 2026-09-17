  "use client";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Clock } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (layout: string) => void;
}

export default function LayoutTemplateModal({
    open,
    onClose,
    onSelect,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);

    // ESC key close
    useEffect(() => {
        function onEsc(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        if (open) document.addEventListener("keydown", onEsc);
        return () => document.removeEventListener("keydown", onEsc);
    }, [open, onClose]);

    if (!open || typeof window === "undefined") return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-9998"
                style={{ background: "var(--kd-bg-app)" }}
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-9999 flex items-center justify-center px-4">
                <div
                    ref={ref}
                    onClick={(e) => e.stopPropagation()}
                    className="
            w-full max-w-[860px] h-[560px]
            kd-bg-secondary kd-border-primary
            rounded-xl
            flex flex-col overflow-hidden
            kd-shadow
          "
                >
                    {/* Header */}
                    <div className="h-14 px-6 flex items-center justify-between kd-popup-header">
                        <h2 className="text-lg font-semibold kd-text-primary">
                            Add card template
                        </h2>

                        <button
                            onClick={onClose}
                            className="
                h-8 w-8 flex items-center justify-center
                rounded-md
                kd-popup-close
                transition
              "
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 kd-popup-content custom-scrollbar">
                        {/* Recently used */}
                        <section className="mb-8">
                            <div className="flex items-center gap-2 text-sm kd-text-muted mb-3">
                                <Clock size={14} />
                                Recently used
                            </div>

                            <div className="flex gap-4">
                                <TemplateCard
                                    title="Text and image"
                                    onClick={() => onSelect("text-image")}
                                />
                                <TemplateCard
                                    title="Two columns"
                                    onClick={() => onSelect("two-columns")}
                                />
                            </div>
                        </section>

                        {/* Basic */}
                        <section>
                            <h4 className="text-sm font-medium kd-text-secondary mb-3">
                                Basic
                            </h4>

                            <div className="grid grid-cols-6 gap-5">
                                <TemplateCard  title="Blank card" onClick={() => onSelect("blank")} />
                                <TemplateCard title="Image and text" onClick={() => onSelect("image-text")} />
                                <TemplateCard title="Text and image" onClick={() => onSelect("text-image")} />
                                <TemplateCard title="Two columns" onClick={() => onSelect("two-columns")} />
                                <TemplateCard title="Three columns" onClick={() => onSelect("three-columns")} />
                                <TemplateCard title="Four columns" onClick={() => onSelect("four-columns")} />
                                <TemplateCard title="Title with bullets" onClick={() => onSelect("title-bullets")} />
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}

/* =========================
   Template Card
========================= */

function TemplateCard({
    title,
    onClick,
}: {
    title: string;
    onClick: () => void;
}) {
    return (
        <button onClick={onClick} className="text-left group">
            <div
                className="
          w-[132px] h-[92px]
          rounded-lg
          kd-bg-tertiary
          kd-border-primary
          transition
        "
                style={{
                    boxShadow: "var(--kd-shadow-sm)",
                }}
            >
                {/* fake layout preview */}
                <div className="p-2 space-y-1">
                    <div className="h-2 w-3/4 rounded kd-bg-secondary opacity-40" />
                    <div className="h-2 w-full rounded kd-bg-secondary opacity-25" />
                    <div className="h-2 w-5/6 rounded kd-bg-secondary opacity-25" />
                </div>
            </div>

            <div className="mt-2 text-xs kd-text-secondary text-center">
                {title}
            </div>
        </button>
    );
}
