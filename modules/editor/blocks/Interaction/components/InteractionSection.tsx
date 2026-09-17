import React from "react";
import { InteractionItem } from "./types";
import InteractionCard from "./InteractionCard";

interface InteractionSectionProps {
  title: string;
  items: InteractionItem[];
  badgeLabel?: string;
  onAdd?: (label: string) => void;
}

const InteractionSection: React.FC<InteractionSectionProps> = ({
  title,
  items,
  badgeLabel,
  onAdd,
}) => {
  return (
    <div className="space-y-2">
      <div className="px-1 flex items-center justify-between">
        <h3 className="kd-panel-section-title">{title}</h3>
      </div>
      <div className="kd-asset-grid kd-asset-grid-3">
        {items.map((item) => (
          <InteractionCard
            key={item.label}
            {...item}
            pro={!!badgeLabel || item.pro}
            onClick={onAdd ? () => onAdd(item.label) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default InteractionSection;
