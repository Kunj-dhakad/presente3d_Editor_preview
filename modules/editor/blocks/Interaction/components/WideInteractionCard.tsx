import React from "react";
import { WideInteractionItem } from "./types";

const WideInteractionCard: React.FC<WideInteractionItem> = ({
  label,
  icon: Icon,
}) => {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-xl border kd-bd-subtle kd-bg-app kd-hv-bg-sunken kd-hv-bd transition-colors px-4 py-3"
    >
      <Icon className="w-5 h-5 kd-fg shrink-0" />
      <span className="text-[12px] font-medium kd-fg">{label}</span>
    </button>
  );
};

export default WideInteractionCard;
