"use client";
import React from "react";

interface Props {
  popupRef: React.RefObject<HTMLDivElement | null>;
  pos: { top: number; left: number; visible: boolean };
  mounted: boolean;
  /** Fixed width chahiye to do; nahi diya to content decide karega. */
  width?: number;
  /** Andar wale `.kd-popup` box par extra layout classes. */
  boxClassName?: string;
  children: React.ReactNode;
  /** Popup ke neeche dikhne wala chhota toast. */
  toast?: string;
}

/**
 * Sabhi element-toolbar popups ka common khol: fixed positioning,
 * fade-in, aur `.kd-popup` skin. Colors class se aate hain — yahan
 * koi hardcoded color nahi hai.
 */
const PopupShell: React.FC<Props> = ({
  popupRef,
  pos,
  mounted,
  width,
  boxClassName = "",
  children,
  toast,
}) => {
  if (!pos.visible) return null;

  return (
    <div
      ref={popupRef}
      data-element="true"
      className="fixed z-9999"
      style={{
        top: pos.top,
        left: pos.left,
        width,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0px)" : "translateY(-6px)",
        transition: "opacity 0.15s ease, transform 0.15s ease",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={`kd-popup ${boxClassName}`}>{children}</div>
      {toast ? <p className="kd-fg-muted mt-2 text-xs text-center">{toast}</p> : null}
    </div>
  );
};

export default PopupShell;
