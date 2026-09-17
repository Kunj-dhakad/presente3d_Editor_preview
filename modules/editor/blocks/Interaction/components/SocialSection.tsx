import React from "react";
import { SocialItem } from "./types";
import SocialCard from "./SocialCard";

interface SocialSectionProps {
  title: string;
  items: SocialItem[];
  onAdd: (platform: string) => void;
}

const SocialSection: React.FC<SocialSectionProps> = ({
  title,
  items,
  onAdd,
}) => {
  return (
    <div className="space-y-2">
      <div className="px-1">
        <h3 className="kd-panel-section-title">{title}</h3>
      </div>
      <div className="kd-asset-grid kd-asset-grid-4">
        {items.map((item) => (
          <SocialCard
            key={item.label}
            {...item}
            onClick={() => onAdd(item.label)}
          />
        ))}
      </div>
    </div>
  );
};

export default SocialSection;
