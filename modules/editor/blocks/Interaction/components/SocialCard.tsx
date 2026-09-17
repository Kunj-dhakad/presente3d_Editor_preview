import React from "react";
import { SocialItem } from "./types";

const SocialCard: React.FC<SocialItem & { onClick: () => void }> = ({
  label,
  icon: Icon,
  onClick,
}) => {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="kd-element-card flex items-center justify-center aspect-square cursor-pointer"
      style={{ color: "var(--kd-text)" }}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

export default SocialCard;
