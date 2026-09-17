
"use client";
import React, { useState } from "react";

interface Props {
    color?: string;
    onChangeColor: (color: string) => void;
}

const COLORS = [
    "#FF6900", "#FCB900", "#00D084", "#00C4CC", "#0693E3", "#7D2AE8", "#9B51E0", "#C084FC",
    "#EB144C", "#F72585", "#16A34A", "#6EE7B7", "#8ED1FC", "#A5B4FC", "#E9D5FF", "#F78DA7",
    "#FFD6A5", "#FDFFB6", "#D9F99D", "#DCFCE7", "#E0F2FE", "#EDE9FE", "#FCE7F3", "#F3F4F6",
    "#111827", "#2A2A2A", "#525252", "#737373", "#A3A3A3",
    "#2F7D32", "#4CAF50", "#81C784",
];

export default function ColorPickerCard({
    color,
    onChangeColor,
}: Props) {
    const isHexColor = (value: string) => value.startsWith("#");


    const DEFAULT_COLOR = "#000000";
    const [hex, setHex] = useState(color ?? DEFAULT_COLOR);
    const [initialColor] = useState(color ?? DEFAULT_COLOR);
    const updateColor = (value: string) => {
        setHex(value);
        onChangeColor(value);
    };
    // ✅ RESET FUNCTION
    const handleReset = () => {
        setHex(initialColor);
        onChangeColor(initialColor);
    };
    return (
        <div className="kd-color-card-box p-2" >
            {/* COLOR GRID BOX */}
            <div className=" mb-2 ">
                <div className="grid grid-cols-8 gap-2">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => updateColor(c)}
                            className={`kd-color-button-box w-6 h-6  transition
                             ${color === c ? "kd-color-button-box-active" : ""}
              `}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <div className="kd-custom-color-input  flex items-center overflow-hidden h-9 ">
                <div
                    className="
                        w-9 h-full
                        flex items-center justify-center
                        "
                    style={{ backgroundColor: color }}
                >
                    <span >#</span>
                </div>


                <input
                    // value={hex.replace("#", "")}
                    value={isHexColor(hex) ? hex.replace("#", "") : ""}
                    onChange={(e) => updateColor("#" + e.target.value)}
                    className="
                            bg-transparent
                            outline-none
                            text-sm
                            px-3
                            w-[90px]
                            h-full
                          
                            "
                />

                <div className="flex items-end ms-auto p-1">
                    <label className="relative w-7 h-7 rounded-full overflow-hidden cursor-pointer ">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => updateColor(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />

                        <div
                            className="w-full h-full"
                            style={{ backgroundColor: color }}
                        />
                    </label>

                </div>
            </div>
            <div className="w-full flex justify-center mt-2">
                <button
                    onClick={handleReset}
                    className="kd-btn  text-sm p-1 w-full"
                >
                    Reset
                </button>
            </div>

        </div>
    );
}