// "use client";

// import React from "react";
// import { X } from "lucide-react";

// interface InteractionPopupShellProps {
//   onClose: () => void;
//   children: React.ReactNode;
//   maxWidth?: number;
// }


// const InteractionPopupShell: React.FC<InteractionPopupShellProps> = ({
//   onClose,
//   children,
//   maxWidth = 300,
// }) => {
//   return (
//     <div
//       data-element="true"
//       onMouseDown={(e) => e.stopPropagation()}
//       onPointerDown={(e) => e.stopPropagation()}
//       onClick={(e) => {
//         e.stopPropagation();
//         if (e.target === e.currentTarget) onClose();
//       }}
//       style={{
//         position: "absolute",
//         inset: 0,
//         background: "rgba(15, 15, 20, 0.35)",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         zIndex: 1000,
//         borderRadius: "inherit",
//         pointerEvents: "auto",
//       }}
//     >
//       <div
//         style={{
//           position: "relative",
//           width: `min(${maxWidth}px, 92%)`,
//           maxHeight: "88%",
//           background: "#ffffff",
//           borderRadius: 14,
//           boxShadow: "0 20px 45px rgba(0,0,0,0.25)",
//           display: "flex",
//           flexDirection: "column",
//           overflow: "hidden",
//         }}
//       >
//         <button
//           type="button"
//           onClick={onClose}
//           aria-label="Close"
//           style={{
//             position: "absolute",
//             top: 10,
//             right: 10,
//             width: 24,
//             height: 24,
//             borderRadius: "50%",
//             border: "none",
//             background: "#f3f4f6",
//             color: "#374151",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             cursor: "pointer",
//             zIndex: 3,
//           }}
//         >
//           <X size={14} />
//         </button>

//         <div
//           style={{
//             padding: "18px 16px 16px",
//             overflowY: "auto",
//             fontFamily: "Inter, sans-serif",
//           }}
//         >
//           {children}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default InteractionPopupShell;


"use client";

import React from "react";
import { X } from "lucide-react";

interface InteractionPopupShellProps {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}


const InteractionPopupShell: React.FC<InteractionPopupShellProps> = ({
  onClose,
  children,
  maxWidth = 300,
}) => {
  return (
    <div
      data-element="true"
      // Capture, not bubble. React runs bubble-phase handlers when the event
      // reaches its root — by then the flipbook's own listener, which sits on
      // an element in between, has already started a page turn. Closing the
      // popup then flipped the page out from under the reader.
      onMouseDownCapture={(e) => e.stopPropagation()}
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseUpCapture={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--kd-bg-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        borderRadius: "inherit",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          position: "relative",
          width: `min(${maxWidth}px, 94%)`,
          maxWidth: "100%",
          maxHeight: "min(88%, 90vh)",
          background: "var(--kd-bg-surface)",
          borderRadius: 14,
          boxShadow: "0 20px 45px var(--kd-shadow-color)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "none",
            background: "var(--kd-bg-sunken)",
            color: "var(--kd-text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 3,
          }}
        >
          <X size={14} />
        </button>

        <div
          style={{
            padding: "clamp(12px, 3vw, 18px) clamp(12px, 3vw, 16px)",
            overflowY: "auto",
            overflowX: "hidden",
            fontFamily: "Inter, sans-serif",
            minWidth: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default InteractionPopupShell;
