// "use client";
// import React, { useEffect, useState } from "react";
// import { ButtonData } from "@editor/store/editorStore";

// interface ToolbarProps {
//   targetRef: React.RefObject<HTMLElement | null>;
//   data: ButtonData;
//   updateButton: (patch: Partial<ButtonData>) => void;
// }
// const ColorEditBox: React.FC<ToolbarProps> = ({ targetRef, data, updateButton, }) => {
//   const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
//   const [bgColor, setBgColor] = useState(data.backgroundColor || "#000000");
//   const [textColor, setTextColor] = useState(data.textColor || "#ffffff");
//   const [borderColor, setBorderColor] = useState(
//     data.borderColor || "#000000"
//   );
//   useEffect(() => {
//     const target = targetRef.current;
//     if (!target) return;


//     const updatePos = () => {
//       const rect = target.getBoundingClientRect();

//       // 👇 nearest positioned parent
//       const parentRect =
//         target.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };

//       setPos({
//         top: rect.bottom - parentRect.top - 180,
//         left: rect.left - parentRect.left - 160,
//         visible: true,
//       });
//     };

//     updatePos();

//     window.addEventListener("scroll", updatePos, true);
//     window.addEventListener("resize", updatePos);

//     const obs = new MutationObserver(updatePos);
//     obs.observe(target, { attributes: true, childList: true, subtree: true });

//     return () => {
//       window.removeEventListener("scroll", updatePos, true);
//       window.removeEventListener("resize", updatePos);
//       obs.disconnect();
//     };
//   }, [targetRef]);
//   if (!pos.visible || !targetRef) return null;


//   return (
//     <div
//       className="fixed z-9999"
//       style={{ top: pos.top, left: pos.left }}
//     >
//       <div className="kd-popup-main-container w-60  text-sm p-2">
//         <h3 className="text-sm font-semibold kd-text-primary">
//           Button Colors
//         </h3>

//         {/* Background */}
//         <div className="flex items-center justify-between">
//           <label className="text-xs kd-text-primary">
//             Background
//           </label>
//           <input
//             type="color"
//             value={bgColor}
//             onChange={(e) => {
//               setBgColor(e.target.value);
//               updateButton({ backgroundColor: e.target.value });
//             }}
//             className="w-8 h-8 p-1 rounded cursor-pointer"
//           />
//         </div>

//         {/* Text */}
//         <div className="flex items-center justify-between">
//           <label className="text-xs kd-text-primary">
//             Text
//           </label>
//           <input
//             type="color"
//             value={textColor}
//             onChange={(e) => {
//               setTextColor(e.target.value);
//               updateButton({ textColor: e.target.value });
//             }}
//             className="w-8 h-8 p-1 rounded cursor-pointer"
//           />
//         </div>

//         {/* Border */}
//         <div className="flex items-center justify-between">
//           <label className="text-xs kd-text-primary">
//             Border
//           </label>
//           <input
//             type="color"
//             value={borderColor}
//             onChange={(e) => {
//               setBorderColor(e.target.value);
//               updateButton({ borderColor: e.target.value });
//             }}
//             className="w-8 h-8 p-1 rounded cursor-pointer"
//           />
//         </div>

//       </div>
//     </div>
//   );
// };

// export default ColorEditBox;


"use client";
import React, { useEffect, useRef, useState } from "react";
import { ButtonData } from "@editor/store/editorStore";
import { samePosition, trackAnchor } from "@editor/lib/ui/anchorTracking";

interface ToolbarProps {
  targetRef: React.RefObject<HTMLElement | null>;
  data: ButtonData;
  updateButton: (patch: Partial<ButtonData>) => void;
  onClose: () => void;
}

const ColorEditBox: React.FC<ToolbarProps> = ({ targetRef, data, updateButton, onClose }) => {
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const [bgColor, setBgColor] = useState(data.backgroundColor || "#000000");
  const [textColor, setTextColor] = useState(data.textColor || "#ffffff");
  const [borderColor, setBorderColor] = useState(data.borderColor || "#000000");
  const [mounted, setMounted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // RAF-based position tracking (same as LinkEditBox)
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const updatePos = () => {
      const rect = target.getBoundingClientRect();
      setPos((prev) =>
        samePosition(prev, rect.bottom + 8, rect.left + rect.width / 2 - 120)
          ? prev
          : { top: rect.bottom + 8, left: rect.left + rect.width / 2 - 120, visible: true },
      );
    };

    updatePos();
    // Event-driven, not a 60fps loop: see trackAnchor.
    return trackAnchor(target, updatePos);
  }, [targetRef]);

  // Outside click handler (same as LinkEditBox)
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        !targetRef.current?.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose, targetRef]);

  // Mount animation trigger (same as LinkEditBox)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  if (!pos.visible) return null;

  return (
    <div
      ref={popupRef}
      data-element="true"
      className="fixed z-9999"
      style={{
        top: pos.top,
        left: pos.left,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0px)" : "translateY(-6px)",
        transition: "opacity 0.15s ease, transform 0.15s ease",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="kd-bg-surface border kd-bd-subtle rounded-xl p-3 w-60 shadow-lg flex flex-col gap-2.5">
        
        {/* Label */}
        <span className="text-xs font-medium kd-fg-muted tracking-wide">Button Colors</span>

        {/* Background */}
        <div className="flex items-center justify-between">
          <label className="text-xs kd-fg-muted">Background</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => {
              setBgColor(e.target.value);
              updateButton({ backgroundColor: e.target.value });
            }}
            className="w-8 h-8 p-1 rounded cursor-pointer border kd-bd-subtle"
          />
        </div>

        {/* Text */}
        <div className="flex items-center justify-between">
          <label className="text-xs kd-fg-muted">Text</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => {
              setTextColor(e.target.value);
              updateButton({ textColor: e.target.value });
            }}
            className="w-8 h-8 p-1 rounded cursor-pointer border kd-bd-subtle"
          />
        </div>

        {/* Border */}
        <div className="flex items-center justify-between">
          <label className="text-xs kd-fg-muted">Border</label>
          <input
            type="color"
            value={borderColor}
            onChange={(e) => {
              setBorderColor(e.target.value);
              updateButton({ borderColor: e.target.value });
            }}
            className="w-8 h-8 p-1 rounded cursor-pointer border kd-bd-subtle"
          />
        </div>

      </div>
    </div>
  );
};

export default ColorEditBox;