import React from "react";
import useEditorStore from "@editor/store/editorStore";
import { toggleMainPanel } from "@editor/lib/ui/mainPanel";
import { ButtonIcon, ElementsIcon, ImageIcon, KdWaterMarkIcon, TemplateIcon, TextIcon, VideoIcon } from "@editor/lib/icon/icons";

/**
 * The panels the nav offers. Exported because the narrow shell shows the same
 * list as a bottom tab bar — one list, so a panel added here appears in both
 * places instead of only the one someone remembered to edit.
 */
export type NavItem = { panel: string; icon: React.ReactElement; label: string };

export const NAV_ITEMS: NavItem[] = [
    { panel: "TemplateAddPanel", icon: <TemplateIcon />, label: "Template" },
    { panel: "text", icon: <TextIcon />, label: "Text" },
    { panel: "image", icon: <ImageIcon />, label: "Images" },
    { panel: "AddButtonPanel", icon: <ButtonIcon />, label: "Buttons" },
    { panel: "AddElementPanel", icon: <ElementsIcon />, label: "Elements" },
    { panel: "AddInteractionsPanel", icon: <ElementsIcon />, label: "Interactions" },
    { panel: "AddVideoPanel", icon: <VideoIcon />, label: "Videos" },
    { panel: "WatermarkPanel", icon: <KdWaterMarkIcon />, label: "WaterMark" },
];

const Navbar: React.FC = () => {
    const active = useEditorStore((s) => s.activeRightPanel);
    const togglePanel = (panel: string) => toggleMainPanel(panel);

    return (
        <aside className="flex flex-col items-center w-full h-full kd-nav-btn-container">
            <div className="flex flex-col h-full p-1 gap-1 mt-1.5">
                {NAV_ITEMS.map(({ panel, icon, label }) => {
                    const isActive = active === panel;
                    return (
                        <div
                            key={panel}
                            className={`kd-nav-btn-wrapper ${isActive ? "kd-nav-btn-wrapper-active" : ""}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePanel(panel);
                            }}
                        >
                            <button className={`kd-nav-btn ${isActive ? "kd-nav-btn-active" : ""}`}>
                                {icon}
                            </button>
                            <span className="kd-nav-btn-label">{label}</span>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
};

export default Navbar;
