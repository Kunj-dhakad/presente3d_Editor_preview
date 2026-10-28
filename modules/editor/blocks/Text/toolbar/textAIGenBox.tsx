// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import {
//   // Copy,
//   LoaderCircle,
//   SendHorizontal,
//   Sparkles,
//   X,
// } from "lucide-react";
// import useEditorStore from "@editor/store/editorStore";

// const ACTION_PROMPTS: Record<string, string> = {
//   Rephrase: "Rephrase this text.",
//   "Make Longer": "Expand this text with more detail.",
//   "Make Shorter": "Shorten this text.",
//   "Change Tone": "Rewrite this text in a professional tone.",
//   Simplify: "Simplify this text.",
//   Improve: "Improve clarity and flow of this text.",
//   Summarize: "Summarize this text.",
//   Grammar: "Fix grammar and spelling mistakes.",
// };

// export default function TextAIGenBox({
//   isOpen,
//   onClose,
//   buttonRef,
// }: {
//   isOpen: boolean;
//   onClose: () => void;
//   buttonRef: React.RefObject<HTMLButtonElement | null>;
// }) {
//   const [prompt, setPrompt] = useState("");
//   const [extraPrompt, setExtraPrompt] = useState("");
//   const [showExtraPrompt, setShowExtraPrompt] = useState(false);

//   const [loading, setLoading] = useState(false);
//   const [activeAction, setActiveAction] = useState<string | null>(null);

//   const menuRef = useRef<HTMLDivElement>(null);
//   const [pos, setPos] = useState({ top: 0, left: 0 });

//   const updateElement = useEditorStore((s) => s.updateElement);
//   const activeElementId = useEditorStore((s) => s.activeElementId);

//   const activeText = useEditorStore((s) => {
//     if (!s.activeElementId) return "";
//     const slide = s.slides[s.activeSlide];
//     const el = slide?.elements.find(
//       (e) => e.id === s.activeElementId && e.data.type === "text"
//     );
//     return el?.data.type === "text" ? el.data.text : "";
//   });

//   /* ---------------- SYNC ACTIVE TEXT ---------------- */
//   useEffect(() => {
//     if (isOpen) setPrompt(activeText);
//   }, [isOpen, activeText]);

//   /* ---------------- POSITIONING ---------------- */
//   useEffect(() => {
//     if (!isOpen || !buttonRef.current) return;
//     const btn = buttonRef.current;
//     const rect = btn.getBoundingClientRect();
//     const parent =
//       btn.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };

//     setPos({
//       top: rect.bottom - parent.top + 8,
//       left: rect.left - parent.left - 400,
//     });
//   }, [isOpen, buttonRef]);

//   /* ---------------- OUTSIDE CLICK ---------------- */
//   useEffect(() => {
//     if (!isOpen) return;
//     const handleClick = (e: MouseEvent) => {
//       if (
//         menuRef.current &&
//         !menuRef.current.contains(e.target as Node) &&
//         !buttonRef.current?.contains(e.target as Node)
//       ) {
//         onClose();
//       }
//     };
//     window.addEventListener("mousedown", handleClick);
//     window.addEventListener("resize", onClose);
//     return () => {
//       window.removeEventListener("mousedown", handleClick);
//       window.removeEventListener("resize", onClose);
//     };
//   }, [isOpen, onClose, buttonRef]);

//   /* ---------------- PRESET ACTION AI ---------------- */
//   const generateFromAction = async (action: string) => {
//     if (!activeElementId || !prompt.trim()) return;

//     setActiveAction(action);
//     setLoading(true);

//     try {
//       const res = await apiFetch("/api/generate-ai-text", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           prompt: `${ACTION_PROMPTS[action]}\n\n${prompt}`,
//         }),
//       });

//       const data = await res.json();
//       if (!res.ok || !data.text) throw new Error();

//       // updateElement(activeElementId, { text: data.text });
//       setPrompt(data.text);
//     } finally {
//       setLoading(false);
//       setActiveAction(null);
//     }
//   };

//   /* ---------------- CUSTOM PROMPT AI ---------------- */
//   const handleGenerateCustom = async () => {
//     if (!activeElementId || !extraPrompt.trim()) return;

//     setActiveAction("custom");
//     setLoading(true);

//     try {
//       const res = await apiFetch("/api/generate-ai-text", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           prompt: `${extraPrompt}`,
//         }),
//       });

//       const data = await res.json();
//       if (!res.ok || !data.text) throw new Error();

//       // updateElement(activeElementId, { text: data.text });
//       setPrompt(data.text);
//       setExtraPrompt("");
//       setShowExtraPrompt(false);
//     } finally {
//       setLoading(false);
//       setActiveAction(null);
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <div
//       ref={menuRef}
//       className="absolute  kd-popup-main-container z-999 w-[480px] p-4"
//       style={{ top: pos.top, left: pos.left }}
//     >
//       {/* HEADER */}
//       <div className="flex items-center justify-between mb-2">
//         <div className="flex items-center gap-2 text-sm font-medium">
//           <Sparkles size={16} />
//           Generate Text with AI
//         </div>
//         <button onClick={onClose} className="kd-popup-close w-7 h-7">
//           <X size={14} />
//         </button>
//       </div>

//       <div

//         data-element="true"  // ✅ ADD THIS
//         onMouseDown={(e) => e.stopPropagation()} // ✅ ADD THIS

//         className="kd-ai-generator-inputWrapper">
//         <textarea
//           rows={3}
//           placeholder="Describe your image... (e.g. futuristic city at sunset)"
//           value={prompt}
//           onChange={(e) => setPrompt(e.target.value)}
//           className="kd-ai-generator-textarea custom-scrollbar"
//         />

//         <button
//           onClick={() => {
//             if (!activeElementId) return;
//             updateElement(activeElementId, { text: prompt ,html:prompt});
//             onClose();
//           }}
//           className="kd-btn px-2"
//         >
//           Use text
//         </button>

//       </div>
//       {/* ACTION BUTTONS */}
//       <div className="flex flex-wrap gap-2 mt-3">
//         {Object.keys(ACTION_PROMPTS).map((item) => (
//           <button
//             key={item}
//             onClick={() => generateFromAction(item)}
//             // disabled={loading}
//             disabled={loading && activeAction === item}
//             className="kd-btn relative flex items-center justify-center px-2 py-1  gap-2 text-sm"
//           >
//             {loading && activeAction === item ? (
//               <div className="flex  items-center justify-center">{item}..<LoaderCircle size={14} className="animate-spin kd-text-primary" /></div>
//             ) : (
//               item
//             )}
//           </button>
//         ))}

//         <button
//           onClick={() => setShowExtraPrompt((v) => !v)}
//           className="kd-btn px-2 py-1 gap-2 text-sm"
//         >
//           {showExtraPrompt ? "Remove" : "Add New"}
//         </button>
//       </div>

//       {/* CUSTOM PROMPT */}
//       {showExtraPrompt && (
//         <div className="mt-2 flex items-center gap-2 rounded-md px-2 h-[34px] ">
//           <input
//             value={extraPrompt}
//             onChange={(e) => setExtraPrompt(e.target.value)}
//             placeholder="Custom AI instruction…"
//             className="flex-1 bg-transparent text-sm kd-ai-text-generate-input "
//           />
//           <button
//             onClick={handleGenerateCustom}
//             disabled={loading || !extraPrompt.trim()}
//             className="kd-ai-generator-sendBtn"
//           >
//             {loading && activeAction === "custom" ? (
//               <LoaderCircle size={16} className="animate-spin" />
//             ) : (
//               <SendHorizontal size={16} />
//             )}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  // Copy,
  LoaderCircle,
  SendHorizontal,
  // Sparkles,
  X,
} from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import { Kd_magic_TextGenIcon } from "@editor/lib/icon/icons";
import { apiFetch } from "@shared/apiFetch";

const ACTION_PROMPTS: Record<string, string> = {
  Simplify: "Simplify this text.",
  Improve: "Improve clarity and flow of this text.",
  Summarize: "Summarize this text.",
  Grammar: "Fix grammar and spelling mistakes.",
  Rephrase: "Rephrase this text.",
  "Make Longer": "Expand this text with more detail.",
  "Make Shorter": "Shorten this text.",
  "Change Tone": "Rewrite this text in a professional tone.",
};

export default function TextAIGenBox({
  isOpen,
  onClose,
  buttonRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [prompt, setPrompt] = useState("");
  const [extraPrompt, setExtraPrompt] = useState("");
  const [showExtraPrompt, setShowExtraPrompt] = useState(false);

  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updateElement = useEditorStore((s) => s.updateElement);
  const activeElementId = useEditorStore((s) => s.activeElementId);

  const activeText = useEditorStore((s) => {
    if (!s.activeElementId) return "";
    const slide = s.slides[s.activeSlide];
    const el = slide?.elements.find(
      (e) => e.id === s.activeElementId && e.data.type === "text"
    );
    return el?.data.type === "text" ? el.data.text : "";
  });

  /* ---------------- SYNC ACTIVE TEXT ---------------- */
  useEffect(() => {
    if (isOpen) setPrompt(activeText);
  }, [isOpen, activeText]);

  /* ---------------- POSITIONING ---------------- */
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const btn = buttonRef.current;
    const rect = btn.getBoundingClientRect();
    const parent =
      btn.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };

    setPos({
      top: rect.bottom - parent.top + 8,
      left: rect.left - parent.left - 400,
    });
  }, [isOpen, buttonRef]);

  /* ---------------- OUTSIDE CLICK ---------------- */
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", onClose);
    };
  }, [isOpen, onClose, buttonRef]);

  /* ---------------- PRESET ACTION AI ---------------- */
  const generateFromAction = async (action: string) => {
    if (!activeElementId || !prompt.trim()) return;

    setActiveAction(action);
    setLoading(true);

    try {
      const res = await apiFetch("/api/generate-ai-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${ACTION_PROMPTS[action]}\n\n${prompt}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.text) throw new Error();

      // updateElement(activeElementId, { text: data.text });
      setPrompt(data.text);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  /* ---------------- CUSTOM PROMPT AI ---------------- */
  const handleGenerateCustom = async () => {
    if (!activeElementId || !extraPrompt.trim()) return;

    setActiveAction("custom");
    setLoading(true);

    try {
      const res = await apiFetch("/api/generate-ai-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${extraPrompt}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.text) throw new Error();

      // updateElement(activeElementId, { text: data.text });
      setPrompt(data.text);
      setExtraPrompt("");
      setShowExtraPrompt(false);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute  kd-popup-main-container z-999 w-[480px] p-4"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        <div className="kd-text-Ai-gen-box-lable flex items-center gap-2 ">
          <Kd_magic_TextGenIcon />
          Generate Text with AI
        </div>
        <button onClick={onClose} className="kd-popup-close w-7 h-7">
          <X size={14} />
        </button>
      </div>
      <div className="kd-toolPanel-hr-devide-border  mb-2" />



      <div className="flex flex-wrap gap-2 my-3 justify-center">
        {Object.keys(ACTION_PROMPTS).map((item) => (
          <button
            key={item}
            onClick={() => generateFromAction(item)}
            disabled={loading && activeAction === item}
            className="kd-text-Ai-gen-box-text-btn relative flex items-center justify-center px-2 py-2  gap-2"
          >
            {loading && activeAction === item ? (
              <div className="flex  items-center justify-center">{item}..<LoaderCircle size={14} className="animate-spin kd-text-primary" /></div>
            ) : (
              item
            )}
          </button>
        ))}
      </div>





      <div

        data-element="true"
        onMouseDown={(e) => e.stopPropagation()}
        >
        <textarea
          rows={3}
          placeholder="Describe your text... "
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="kd-ai-video-textarea custom-scrollbar"
        />

      </div>

      <div className="flex items-center justify-end mt-2 gap-2">
        
        <button
          onClick={() => setShowExtraPrompt((v) => !v)}
          className="kd-text-Ai-gen-box-AddNew-btn px-4 py-2 gap-2 text-sm"
        >
          {showExtraPrompt ? "Remove" : "Add New"}
        </button>

        <button
          onClick={() => {
            if (!activeElementId) return;
            updateElement(activeElementId, { text: prompt, html: prompt });
            onClose();
          }}
          className="kd-text-Ai-gen-box-UseText-btn px-8 py-2 gap-2 text-sm"
        >
          Use text
        </button>
      </div>
      {/* CUSTOM PROMPT */}
      {showExtraPrompt && (
        <div className="mt-2 flex items-center gap-2 rounded-md px-2 h-[34px] ">
          <input
            value={extraPrompt}
            onChange={(e) => setExtraPrompt(e.target.value)}
            placeholder="Custom AI instruction…"
            className="flex-1 bg-transparent text-sm kd-ai-text-generate-input "
          />
          <button
            onClick={handleGenerateCustom}
            disabled={loading || !extraPrompt.trim()}
            className="kd-ai-generator-sendBtn p-2"
          >
            {loading && activeAction === "custom" ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <SendHorizontal size={16} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

