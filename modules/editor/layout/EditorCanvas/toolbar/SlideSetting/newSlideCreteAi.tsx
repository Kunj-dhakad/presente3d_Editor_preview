"use client";
import useEditorStore from "@editor/store/editorStore";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Sparkles, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export default function NewSlideCreteAi({
    isOpen,
    onClose,
    buttonRef
}: {
    isOpen: boolean;
    onClose: () => void;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
    const [prompt, setPrompt] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const btn = buttonRef.current;

            const buttonRect = btn.getBoundingClientRect();
            const parentRect =
                btn.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };

            setPosition({
                top: buttonRect.bottom - parentRect.top + 6,
                left: buttonRect.left - parentRect.left - 200
            });
        }
    }, [buttonRef, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            function handleClick(e: MouseEvent) {
                if (
                    menuRef.current &&
                    !menuRef.current.contains(e.target as Node) &&
                    !buttonRef.current?.contains(e.target as Node)
                ) {
                    onClose();
                }
            }

            // function handleScroll() {
            //     onClose();
            // }

            function handleResize() {
                onClose();
            }

            document.addEventListener("mousedown", handleClick);
            // window.addEventListener("scroll", handleScroll, true);
            window.addEventListener("resize", handleResize);

            return () => {
                document.removeEventListener("mousedown", handleClick);
                // window.removeEventListener("scroll", handleScroll, true);
                window.removeEventListener("resize", handleResize);
            };
        }, 50);

        return () => clearTimeout(timer);
    }, [isOpen, onClose, buttonRef]);


    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);

        try {
            const response = await fetch("/api/generate-Ai-slide", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Slide generation failed");
            }

            const aiSlideData = data.content;

            // Debug log
            console.log("📊 AI Slide Data received:", aiSlideData);

            if (!aiSlideData || !aiSlideData.elements) {
                throw new Error("Invalid slide data structure");
            }

            // Get fresh state from store
            const { slides, activeSlide, slideUpdateAI } = useEditorStore.getState();
            const activeSlideId = slides[activeSlide].id;

            console.log("🔄 Updating slide:", activeSlideId);

            // Update the slide with AI-generated content
            slideUpdateAI(activeSlideId, aiSlideData);

            console.log("✅ Slide updated successfully");

            setPrompt(""); // Clear prompt after success
        } catch (error) {
            console.error("❌ Slide generation error:", error);
            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to generate slide. Please try again."
            );
        } finally {
            setLoading(false);
            onClose();
        }
    };



    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") onClose();
            }}

            className="  absolute  z-99 w-[320px] p-3 kd-popup-main-container "
            style={{
                top: position.top,
                left: position.left,  
            }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 kd-text-primary font-medium">
                    <Sparkles size={18} className="kd-icon-text" />
                    Generate Slide with AI
                </div>
                <button onClick={onClose} className="kd-text-secondary hover:kd-text-primary transition-colors">
                    <X size={18} />
                </button>
            </div>

            <textarea
                value={prompt}
                onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Eg: Create a slide about Startup Pitch Deck with bullet points"
                className="kd-new-slide-generate-textarea kd-custom-scrollbar w-full"
            />

           
            <div className="flex items-center justify-end gap-2 mt-2">
                <button
                    onClick={onClose}
                    className="px-3 py-1  kd-btn"
                >
                    Cancel
                </button>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="kd-btn  px-3 py-1 flex items-center gap-1"
                >
                    {/* {loading ? "Generating..." : "Generate"}
                    <Sparkles size={16} /> */}

                    {loading ? (
                        <span className="flex items-center gap-1">
                          Generating..<FontAwesomeIcon className="animate-spin" icon={faSpinner} />
                        </span>
                    ) : (
                        "Generate"
                    )}
                </button>
            </div>
        </div>
    );
}

