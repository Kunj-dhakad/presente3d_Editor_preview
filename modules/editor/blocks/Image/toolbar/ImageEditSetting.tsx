"use client";
import React, { useEffect, useState, useRef } from "react";
import {
    Copy,
    Trash2,
    ArrowUp,
    ArrowDown,
    ChevronsUp,
    ChevronsDown,
    Layers2,
    ChevronsRight,
    Repeat,
} from "lucide-react";
import useEditorStore from "@editor/store/editorStore";

interface ToolbarProps {
    targetRef: React.RefObject<HTMLElement | null>;
}


const ImageEditSetting: React.FC<ToolbarProps> = ({ targetRef }) => {
    const deleteElement = useEditorStore((s) => s.deleteElement);
    const duplicateElement = useEditorStore((s) => s.duplicateElement);
    const copySelectedElements = useEditorStore((s) => s.copySelectedElements);

    const bringForward = useEditorStore((s) => s.bringForward);
    const bringToFront = useEditorStore((s) => s.bringToFront);
    const sendBackward = useEditorStore((s) => s.sendBackward);
    const sendToBack = useEditorStore((s) => s.sendToBack);

    const selectedId = useEditorStore((s) => s.activeElementId);
    // const slides = useEditorStore((s) => s.slides);
    // const activeSlide = useEditorStore((s) => s.activeSlide);

    // const element = slides[activeSlide]?.elements.find(
    //     (el) => el.id === selectedId
    // );

    const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
    const [showLayerMenu, setShowLayerMenu] = useState(false);
    const [layerDir, setLayerDir] = useState<"left" | "right">("right");
    const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
    const setActiveRightPanel = useEditorStore((s) => s.setActiveRightPanel);
    const activePanel = useEditorStore((s) => s.activeRightPanel);
    const handleReplace = () => {
        setActiveRightPanel(
            activePanel === "imageReplacePanel" ? null : "imageReplacePanel"
        );
    };

    useEffect(() => {
        const target = targetRef.current;
        if (!target) return;

        const OFFSET = 8;

        const updatePos = () => {
            const rect = target.getBoundingClientRect();

            // 👇 nearest positioned parent
            const parentRect =
                target.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };

            setPos({
                top: rect.bottom - parentRect.top + OFFSET,
                left: rect.left - parentRect.left,
                visible: true,
            });
        };

        updatePos();

        window.addEventListener("scroll", updatePos, true);
        window.addEventListener("resize", updatePos);

        const obs = new MutationObserver(updatePos);
        obs.observe(target, { attributes: true, childList: true, subtree: true });

        return () => {
            window.removeEventListener("scroll", updatePos, true);
            window.removeEventListener("resize", updatePos);
            obs.disconnect();
        };
    }, [targetRef]);


    if (!pos.visible || !targetRef) return null;

    /* ===== ACTIONS ===== */
    // const handleCopy = async () => {
    //     if (!element || element.data.type !== "image") return;
    //     await navigator.clipboard.writeText(
    //         JSON.stringify({ type: "image", data: element.data.src })
    //     );
    // };


    const handleLayerEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setLayerDir(window.innerWidth - rect.right < 200 ? "left" : "right");
        setShowLayerMenu(true);
    };

    return (
        <div
            data-element="true"
            className="fixed z-9999"
            style={{ top: pos.top, left: pos.left }}
        >
            <div className=" kd-popup-main-container w-52 p-1 text-sm">
                <div onClick={copySelectedElements} className="kd-context-item">
                    <div className="flex items-center gap-2">
                        <Copy size={16} />
                        Copy
                    </div>
                    <span className="text-xs kd-text-muted">Ctrl+C</span>
                </div>

                {/* Duplicate */}
                <div

                    onClick={() => selectedId && duplicateElement(selectedId)}
                    className="kd-context-item"
                >
                    <div className="flex items-center gap-2">
                        <Copy size={16} />
                        Duplicate
                    </div>
                    <span className="text-xs kd-text-muted">Ctrl+D</span>
                </div>

                {/* Replace */}
                <div onClick={handleReplace} className="kd-context-item">
                    <div className="flex items-center gap-2">
                        <Repeat size={16} />
                        Replace
                    </div>
                    <span className="text-xs kd-text-muted">Ctrl+R</span>
                </div>

                {/* Divider */}
                {/* <div className="my-1 h-px " /> */}

                {/* Layer */}
                <div
                    onMouseEnter={handleLayerEnter}
                    onMouseLeave={() =>
                    (hoverTimeout.current = setTimeout(
                      () => setShowLayerMenu(false),
                      120
                    ))
                    }
                    className="relative kd-context-item"
                >
                    {/* <span>Layer</span> */}
                    <div className="flex items-center gap-2">
                        <Layers2 size={16} />
                        Layer
                    </div>
                    <span className="text-xs kd-text-muted"><ChevronsRight /></span>
                    {showLayerMenu && (
                        <div
                            onMouseEnter={() => {
                                if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                                setShowLayerMenu(true);
                            }}
                            onMouseLeave={() => setShowLayerMenu(false)}
                            className={`
                absolute top-0
                ${layerDir === "right" ? "left-full ml-2" : "right-full mr-2"}
                kd-popup-main-container w-[220px] p-1
              `}
                        >
                            <div
                                onClick={() => selectedId && bringForward(selectedId)}
                                className="kd-context-item"
                            >
                                <ArrowUp size={16} /> Bring forward
                            </div>

                            <div
                                onClick={() => selectedId && bringToFront(selectedId)}
                                className="kd-context-item"
                            >
                                <ChevronsUp size={16} /> Bring to front
                            </div>

                            {/* <div className="my-1 h-px " /> */}

                            <div
                                onClick={() => selectedId && sendBackward(selectedId)}
                                className="kd-context-item"
                            >
                                <ArrowDown size={16} /> Send backward
                            </div>

                            <div
                                onClick={() => selectedId && sendToBack(selectedId)}
                                className="kd-context-item"
                            >
                                <ChevronsDown size={16} /> Send to back
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                {/* <div className="my-1 h-px " /> */}

                {/* Delete */}
                <div
                    onClick={() => selectedId && deleteElement(selectedId)}
                    className="kd-context-item kd-context-item-danger"
                >
                    <div className="flex items-center gap-2">
                        <Trash2 size={16} />
                        Delete
                    </div>
                    <span className="text-xs">DEL</span>
                </div>
            </div>
        </div>
    );
};


export default ImageEditSetting;
