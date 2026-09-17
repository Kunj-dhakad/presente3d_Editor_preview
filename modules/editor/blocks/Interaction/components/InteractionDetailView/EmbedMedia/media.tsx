"use client";

import React from "react";

export type MediaType = "image" | "video" | "embed";
export type RenderMode = "image" | "video" | "iframe" | "external";
export type ParsedMedia = {
  platformName: string;
  originalUrl: string;
  embedUrl: string;
  type: MediaType;
  renderMode: RenderMode;
  thumbnailUrl: string;
  extractedId: string | null;
};

const genericThumbnail =
  "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=400&q=80";
const thumbnails: Record<string, string> = {
  Vimeo:
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=400&q=80",
  Loom: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=400&q=80",
  Instagram:
    "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=400&q=80",
  Pinterest:
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
  Figma:
    "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=400&q=80",
  Canva:
    "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=400&q=80",
  Wistia:
    "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=400&q=80",
  Twitch:
    "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80",
  "Adobe Express":
    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=400&q=80",
  Streamable:
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80",
};
const parsed = (
  originalUrl: string,
  values: Omit<ParsedMedia, "originalUrl">,
): ParsedMedia => ({ originalUrl, ...values });
const image = (url: URL) =>
  /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(url.href);
const video = (url: URL) =>
  /\.(?:m3u8|m4v|mov|mp4|ogv|webm)(?:$|[?#])/i.test(url.href);

// This is the single parser extracted from the existing EmbedMedia reference.
export function parseMediaUrl(
  value: string,
  hostname = "localhost",
): ParsedMedia | null {
  const originalUrl = value.trim();
  if (!originalUrl) return null;
  let url: URL;
  try {
    url = new URL(originalUrl);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (image(url))
    return parsed(originalUrl, {
      platformName: host.includes("cloudinary") ? "Cloudinary" : "Direct Image",
      embedUrl: originalUrl,
      type: "image",
      renderMode: "image",
      thumbnailUrl: originalUrl,
      extractedId: null,
    });
  if (video(url))
    return parsed(originalUrl, {
      platformName: host.includes("cloudinary") ? "Cloudinary" : "Direct Video",
      embedUrl: originalUrl,
      type: "video",
      renderMode: "video",
      thumbnailUrl: genericThumbnail,
      extractedId: null,
    });
  const yt =
    host === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : [
            "youtube.com",
            "m.youtube.com",
            "music.youtube.com",
            "youtube-nocookie.com",
          ].includes(host)
        ? (url.searchParams.get("v") ??
          (() => {
            const p = url.pathname.split("/").filter(Boolean);
            const i = p.findIndex((x) =>
              ["embed", "shorts", "live", "v"].includes(x),
            );
            return i >= 0 ? p[i + 1] : null;
          })())
        : null;
  if (yt && /^[\w-]{11}$/.test(yt))
    return parsed(originalUrl, {
      platformName: "YouTube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=0&rel=0`,
      type: "video",
      renderMode: "iframe",
      thumbnailUrl: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
      extractedId: yt,
    });
  const segments = url.pathname.split("/").filter(Boolean),
    numericId = [...segments].reverse().find((x) => /^\d+$/.test(x));
  if (
    (host === "vimeo.com" ||
      host.endsWith(".vimeo.com") ||
      host.endsWith("vhx.tv")) &&
    numericId
  )
    return parsed(originalUrl, {
      platformName:
        host.endsWith("vhx.tv") || segments.includes("ondemand")
          ? "Vimeo OTT"
          : "Vimeo",
      embedUrl: `https://player.vimeo.com/video/${numericId}?autoplay=0&dnt=1&title=0&byline=0`,
      type: "video",
      renderMode: "iframe",
      thumbnailUrl: thumbnails.Vimeo,
      extractedId: numericId,
    });
  const match = (pattern: RegExp) => url.pathname.match(pattern);
  let m: RegExpMatchArray | null;
  if (
    (host === "loom.com" || host.endsWith(".loom.com")) &&
    (m = match(/^\/(?:share|embed)\/([a-zA-Z0-9]+)/i))
  )
    return parsed(originalUrl, {
      platformName: "Loom",
      embedUrl: `https://www.loom.com/embed/${m[1]}?hide_owner=true&hide_share=true`,
      type: "video",
      renderMode: "iframe",
      thumbnailUrl: thumbnails.Loom,
      extractedId: m[1],
    });
  if (
    (host === "giphy.com" || host === "media.giphy.com") &&
    (m = match(
      /\/(?:gifs|media)\/(?:[a-zA-Z0-9-]+-)?([a-zA-Z0-9]{6,32})(?:\/|$)/i,
    ))
  )
    return parsed(originalUrl, {
      platformName: "Giphy",
      embedUrl: `https://giphy.com/embed/${m[1]}`,
      type: "embed",
      renderMode: "iframe",
      thumbnailUrl: `https://media.giphy.com/media/${m[1]}/giphy.gif`,
      extractedId: m[1],
    });
  if (
    (host === "instagram.com" || host.endsWith(".instagram.com")) &&
    (m = match(/^\/(p|reel|tv)\/([^/?#]+)/i))
  )
    return parsed(originalUrl, {
      platformName: "Instagram",
      embedUrl: `https://www.instagram.com/${m[1].toLowerCase()}/${m[2]}/embed/captioned/`,
      type: "embed",
      renderMode: "iframe",
      thumbnailUrl: thumbnails.Instagram,
      extractedId: m[2],
    });
  if (
    (host === "pinterest.com" ||
      host.endsWith(".pinterest.com") ||
      host === "pin.it") &&
    (m = match(/\/pin\/(\d+)/i))
  )
    return parsed(originalUrl, {
      platformName: "Pinterest",
      embedUrl: `https://assets.pinterest.com/ext/embed.html?id=${m[1]}`,
      type: "embed",
      renderMode: "iframe",
      thumbnailUrl: thumbnails.Pinterest,
      extractedId: m[1],
    });
  if (
    (host === "figma.com" || host.endsWith(".figma.com")) &&
    (m = match(/^\/(?:file|design|proto|board)\/([^/?#]+)/i))
  )
    return parsed(originalUrl, {
      platformName: "Figma",
      embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(originalUrl)}`,
      type: "embed",
      renderMode: "iframe",
      thumbnailUrl: thumbnails.Figma,
      extractedId: m[1],
    });
  if (
    (host === "canva.com" || host.endsWith(".canva.com")) &&
    (m = match(/^\/design\/([a-zA-Z0-9_-]+)/i))
  )
    return parsed(originalUrl, {
      platformName: "Canva",
      embedUrl: `https://www.canva.com/design/${m[1]}/view?embed`,
      type: "embed",
      renderMode: "iframe",
      thumbnailUrl: thumbnails.Canva,
      extractedId: m[1],
    });
  if (
    (host.includes("wistia.com") || host.includes("wistia.net")) &&
    (m = match(/\/(?:medias|embed\/iframe)\/([a-zA-Z0-9]+)/i))
  )
    return parsed(originalUrl, {
      platformName: "Wistia",
      embedUrl: `https://fast.wistia.net/embed/iframe/${m[1]}?videoFoam=true`,
      type: "video",
      renderMode: "iframe",
      thumbnailUrl: thumbnails.Wistia,
      extractedId: m[1],
    });
  m =
    host === "dai.ly"
      ? match(/^\/([a-zA-Z0-9]+)/)
      : match(/^\/video\/([a-zA-Z0-9]+)/);
  if (
    (host === "dailymotion.com" ||
      host.endsWith(".dailymotion.com") ||
      host === "dai.ly") &&
    m
  )
    return parsed(originalUrl, {
      platformName: "DailyMotion",
      embedUrl: `https://www.dailymotion.com/embed/video/${m[1]}?autoplay=0&queue-enable=false`,
      type: "video",
      renderMode: "iframe",
      thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${m[1]}`,
      extractedId: m[1],
    });
  const videoMatch = match(/^\/videos\/(\d+)/i),
    clipMatch =
      host === "clips.twitch.tv"
        ? match(/^\/([^/?#]+)/)
        : match(/^\/[^/]+\/clip\/([^/?#]+)/i),
    channelMatch = match(/^\/([a-zA-Z0-9_]+)\/?$/i);
  if (
    (host === "twitch.tv" ||
      host.endsWith(".twitch.tv") ||
      host === "clips.twitch.tv") &&
    (m = videoMatch || clipMatch || channelMatch)
  ) {
    const query = videoMatch
      ? `video=v${m[1]}`
      : clipMatch
        ? `clip=${encodeURIComponent(m[1])}`
        : `channel=${encodeURIComponent(m[1])}`;
    return parsed(originalUrl, {
      platformName: "Twitch",
      embedUrl: `${clipMatch ? "https://clips.twitch.tv/embed" : "https://player.twitch.tv/"}?${query}&parent=${encodeURIComponent(hostname.trim() || "localhost")}&autoplay=false`,
      type: "video",
      renderMode: "iframe",
      thumbnailUrl: thumbnails.Twitch,
      extractedId: m[1],
    });
  }
  if (
    host === "express.adobe.com" &&
    (m = match(/^\/(page|video|post|sp)\/([a-zA-Z0-9_-]+)/i))
  )
    return parsed(originalUrl, {
      platformName: "Adobe Express",
      embedUrl: `https://express.adobe.com/${m[1].toLowerCase()}/${m[2]}/embed`,
      type: "embed",
      renderMode: "iframe",
      thumbnailUrl: thumbnails["Adobe Express"],
      extractedId: m[2],
    });
  if (host === "streamable.com" && (m = match(/^\/(?:e\/)?([a-zA-Z0-9]+)/i)))
    return parsed(originalUrl, {
      platformName: "Streamable",
      embedUrl: `https://streamable.com/e/${m[1]}?loop=0&autoplay=0`,
      type: "video",
      renderMode: "iframe",
      thumbnailUrl: thumbnails.Streamable,
      extractedId: m[1],
    });
  if (host === "i.imgur.com")
    return parsed(originalUrl, {
      platformName: "Imgur",
      embedUrl: originalUrl,
      type: "image",
      renderMode: "image",
      thumbnailUrl: originalUrl,
      extractedId: url.pathname.split("/").pop()?.split(".")[0] ?? null,
    });
  if (host === "imgur.com" && (m = match(/^\/(a|gallery)\/([a-zA-Z0-9]+)/i)))
    return parsed(originalUrl, {
      platformName: "Imgur",
      embedUrl: `https://imgur.com/${m[1]}/${m[2]}/embed`,
      type: "embed",
      renderMode: "iframe",
      thumbnailUrl: `https://i.imgur.com/${m[2]}b.jpg`,
      extractedId: m[2],
    });
  return null;
}

export function MediaPreview({
  media,
  autoplay = false,
  controls = true,
  allowFullscreen = true,
}: {
  media: Pick<ParsedMedia, "embedUrl" | "renderMode" | "originalUrl">;
  autoplay?: boolean;
  controls?: boolean;
  allowFullscreen?: boolean;
}) {
  const source = media.embedUrl || media.originalUrl;
  if (media.renderMode === "image")
    return (
      <img
        src={source}
        alt="Embedded media"
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  if (media.renderMode === "video")
    return (
      <video
        src={source}
        className="w-full h-full object-cover"
        controls={controls}
        autoPlay={autoplay}
      />
    );
  if (media.renderMode === "iframe")
    return (
      <iframe
        src={source}
        title="Embedded media"
        className="w-full h-full border-0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen={allowFullscreen}
      />
    );
  return (
    <a
      href={source}
      target="_blank"
      rel="noreferrer"
      className="flex h-full items-center justify-center kd-bg-sunken text-sm kd-fg-accent"
    >
      Open media
    </a>
  );
}
