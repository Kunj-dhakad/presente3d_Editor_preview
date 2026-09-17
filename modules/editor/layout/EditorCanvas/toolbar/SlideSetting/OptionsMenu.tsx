"use client";
import useEditorStore from "@editor/store/editorStore";
import { BadgePlus, Copy, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export default function OptionsMenu({
    isOpen,
    onClose,
    buttonRef
}: {
    isOpen: boolean;
    onClose: () => void;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {

    const addSlide = useEditorStore((s) => s.addSlide);
    const deleteSlide = useEditorStore((s) => s.deleteSlide);

    const slides = useEditorStore((s) => s.slides);
    const activeSlideIndex = useEditorStore((s) => s.activeSlide);

    const activeSlideId = slides[activeSlideIndex]?.id;
    const duplicateSlide = useEditorStore((s) => s.duplicateSlide);

    // const activeSlide = useEditorStore((s) => s.activeSlide);






    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const btn = buttonRef.current;

            const buttonRect = btn.getBoundingClientRect();
            const parentRect =
                btn.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };

            setPosition({
                top: buttonRect.bottom - parentRect.top + 6,
                left: buttonRect.left - parentRect.left
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

            function handleScroll() {
                onClose();
            }

            function handleResize() {
                onClose();
            }

            function handleKeyDown() {
                onClose();
            }

            document.addEventListener("click", handleClick);
            window.addEventListener("scroll", handleScroll, true);
            window.addEventListener("resize", handleResize);
            document.addEventListener("keydown", handleKeyDown);

            return () => {
                document.removeEventListener("click", handleClick);
                window.removeEventListener("scroll", handleScroll, true);
                window.removeEventListener("resize", handleResize);
                document.removeEventListener("keydown", handleKeyDown);
            };
        }, 50);

        return () => clearTimeout(timer);
    }, [buttonRef, isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="absolute  kd-popup-main-container   z-99 w-[130px] p-1"
            style={{
                top: position.top,
                left: position.left,
            }}
        >
            <button
                onClick={() => addSlide()}
                className="w-full gap-2 text-sm kd-slide-options-menu"
            >
                <BadgePlus size={16} />
                <span>New Add</span>
            </button>



            <button
                onClick={() => duplicateSlide()}

                className="gap-2 w-full text-sm kd-slide-options-menu"
            >
                <Copy size={16} />
                <span>Duplicate</span>
            </button>


            <button
                onClick={() => deleteSlide(String(activeSlideId))}
                className=" gap-2 w-full  text-sm kd-slide-options-menu kd-context-item-danger"
            > <Trash2 size={16} />
                <span>Delete</span>

            </button>
        </div>
    );
}

