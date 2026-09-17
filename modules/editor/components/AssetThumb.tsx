"use client";
import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";

/**
 * Thumbnail for the asset panels. Library tiles used to sit empty while their
 * picture downloaded; this keeps the shimmer running until the image paints,
 * and shows a quiet icon when it never arrives.
 */
export default function AssetThumb({ className = "", wrapperClassName = "", onLoad, onError, ...props }: ImageProps & { wrapperClassName?: string }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  return (
    <span className={`kd-thumb kd-thumb-${state} ${wrapperClassName}`.trim()}>
      <Image
        {...props}
        className={className}
        onLoad={event => { setState("ready"); onLoad?.(event); }}
        onError={event => { setState("failed"); onError?.(event); }}
      />
      {state === "failed" && <ImageOff className="kd-thumb-failed-icon" size={18} aria-hidden />}
    </span>
  );
}
