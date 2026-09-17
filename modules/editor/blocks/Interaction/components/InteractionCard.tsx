import React from "react";
import { InteractionItem } from "./types";

const InteractionCard: React.FC<InteractionItem & { onClick?: () => void }> = ({
  label,
  icon: Icon,
  dashed,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="kd-element-card group relative flex flex-col items-center justify-center gap-2 px-2 py-4 cursor-pointer"
      style={{
        color: "var(--kd-text)",
        ...(dashed ? { borderStyle: "dashed" as const } : null),
      }}
    >
      <Icon className="w-5 h-5" />
      <span
        className="leading-tight text-center"
        style={{ fontSize: "var(--kd-fs-sm)" }}
      >
        {label}
      </span>
    </button>
  );
};

export default InteractionCard;
