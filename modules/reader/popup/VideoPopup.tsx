"use client";

import React from "react";
import { Video } from "lucide-react";
import type { InteractionBlock } from "../types/interaction";
import { resolvePlayback } from "../utils/media";
import PopupShell from "./PopupShell";

interface Props {
  block: InteractionBlock;
  onClose: () => void;
}

export default function VideoPopup({ block, onClose }: Props) {
  const playback = resolvePlayback(block.videoUrl);
  const playable =
    playback && (playback.mode === "video" || playback.mode === "iframe");

  return (
    <PopupShell onClose={onClose} maxWidth={560} label="Video">
      {playable ? (
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          {playback.mode === "video" ? (
            <video
              src={playback.src}
              className="h-full w-full object-contain"
              controls={block.controls}
              autoPlay={block.autoplay}
              playsInline
            />
          ) : (
            <iframe
              src={playback.src}
              title="Video"
              className="h-full w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen={block.allowFullscreen}
            />
          )}
        </div>
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg bg-slate-100 px-6 text-center text-sm text-slate-500">
          <Video size={24} className="text-slate-400" />
          <span>
            {block.videoUrl
              ? "This video URL cannot be played here."
              : "No video has been attached to this button."}
          </span>
          {block.videoUrl && (
            <a
              href={block.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-(--kd-accent)"
            >
              Open the video
            </a>
          )}
        </div>
      )}
    </PopupShell>
  );
}
