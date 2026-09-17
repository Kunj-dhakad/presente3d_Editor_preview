"use client";
import React, { useState } from "react";
import useEditorStore from "@editor/store/editorStore";

import { Plus, 
    // Wand2, LayoutGrid 
} from "lucide-react";
import LayoutTemplatePopup from "./LayoutTemplatePopup";

export default function SlideAddToolbar() {
    const addSlide = useEditorStore((s) => s.addSlide);
    const [open, setOpen] = useState(false);

    return (
        <div
            style={{
                position: "absolute",
                zIndex: 99,
                display: "flex",
                bottom: -36,
                right: "50%",
                transform: "translateX(50%)",

            }}
        >
            <button onClick={() => addSlide()} className="px-3  kd-btn">
                <Plus className="me-1" size={16} />Add New
            </button>

            {/* <button className="p-1 kd-bg-primary rounded kd-text-primary  transition-colors">
                <Wand2 size={16} />
            </button> */}

            {/* <button className="p-1 kd-bg-primary rounded kd-text-primary  transition-colors">
                <LayoutGrid size={16} />
            </button> */}
            {/* <button
                // onClick={() => setOpen((v) => !v)}
                className="p-1 kd-bg-primary rounded kd-text-primary"
            >
                <LayoutGrid size={16} />
            </button> */}
            <LayoutTemplatePopup
                open={open}
                onClose={() => setOpen(false)}
                onSelect={() => {
                    // addSlide(layout);
                    setOpen(false);
                }}
            />
        </div>
    );
}
