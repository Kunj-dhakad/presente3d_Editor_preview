"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import type { InteractionBlock } from "../types/interaction";
import PopupShell from "./PopupShell";

interface Props {
  block: InteractionBlock;
  onClose: () => void;
}

export default function SpotlightPopup({ block, onClose }: Props) {
  return (
    <PopupShell onClose={onClose} maxWidth={380} label="Spotlight">
      {block.spotlightImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.spotlightImageUrl}
          alt=""
          className="mb-3 h-36 w-full rounded-lg object-cover"
        />
      )}
      <div className="mb-2 flex items-center gap-2 text-(--kd-accent)">
        <Sparkles size={17} />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Spotlight
        </span>
      </div>
      <h3 className="m-0 text-base font-bold">
        {block.spotlightTitle || "Featured spotlight"}
      </h3>
      <p className="mb-0 mt-2 whitespace-pre-wrap text-[13px] leading-5 text-slate-600">
        {block.spotlightContent}
      </p>
    </PopupShell>
  );
}
