"use client";

import React, { memo, useRef, useState } from "react";
import { IoIosPause, IoIosPlay } from "react-icons/io";
import type { VideoBlock } from "../types/blocks";
import { blockFrame, filterCss, flipCss, strokeCss } from "../utils/blockStyles";
import {
  getYoutubeId,
  isYoutubeShorts,
  youtubeThumbnail,
} from "../utils/media";

interface Props {
  block: VideoBlock;
  /**
   * False for pages far from the reader or in thumbnails: render only the
   * poster so dozens of hidden <video>/YouTube players don't load at once.
   */
  active?: boolean;
}

function VideoPoster({ block, youtubeId }: { block: VideoBlock; youtubeId: string | null }) {
  const poster = youtubeId ? youtubeThumbnail(youtubeId) : block.thumbnail;

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-900">
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: flipCss(block.flipX, block.flipY) }}
        />
      )}
      <span className="relative flex h-7.5 w-7.5 items-center justify-center rounded-full bg-black/60 text-[22px] text-white">
        <IoIosPlay />
      </span>
    </div>
  );
}

/** Shorts can't be iframed, so the reader offers the link instead of failing. */
function ShortsFallback({ src, youtubeId }: { src: string; youtubeId: string }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden bg-neutral-900 p-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={youtubeThumbnail(youtubeId)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-20 blur-md"
      />
      <span className="relative text-[13px] font-semibold text-white">
        YouTube Shorts cannot be embedded
      </span>
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="relative rounded bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white no-underline"
      >
        Watch on YouTube
      </a>
    </div>
  );
}

const VideoRenderer = memo(function VideoRenderer({ block, active = true }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const youtubeId = getYoutubeId(block.src);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  return (
    <div
      data-block-id={block.id}
      style={blockFrame(block, {
        opacity: block.opacity,
        borderRadius: block.borderRadius,
        overflow: "hidden",
      })}
    >
      {!active ? (
        <VideoPoster block={block} youtubeId={youtubeId} />
      ) : youtubeId ? (
        isYoutubeShorts(block.src) ? (
          <ShortsFallback src={block.src} youtubeId={youtubeId} />
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
            title="Embedded video"
            className="h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )
      ) : (
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            src={block.src}
            poster={block.thumbnail}
            preload="metadata"
            draggable={false}
            playsInline
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: flipCss(block.flipX, block.flipY),
              border: strokeCss(block.stroke),
              borderRadius: block.borderRadius,
              filter: filterCss(block.filters),
            }}
          />
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause video" : "Play video"}
            className="absolute left-1/2 top-1/2 flex h-7.5 w-7.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-black/60 text-[22px] text-white"
          >
            {playing ? <IoIosPause /> : <IoIosPlay />}
          </button>
        </div>
      )}
    </div>
  );
});

export default VideoRenderer;
