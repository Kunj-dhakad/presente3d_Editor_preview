"use client";
import React from "react";

/** Placeholder tiles that occupy exactly the space the real tiles will. */
export const AssetTileSkeletons: React.FC<{ count?: number }> = ({ count = 12 }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="kd-skeleton kd-asset-tile-skeleton" aria-hidden />
    ))}
  </>
);

export const CategoryPillSkeletons: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="kd-skeleton kd-pill-skeleton" aria-hidden />
    ))}
  </>
);

export const LibraryError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="kd-panel-empty">
    <span>Couldn&apos;t load the library.</span>
    <button type="button" onClick={onRetry} className="kd-panel-empty-action">
      Try again
    </button>
  </div>
);

export const LibraryEmpty: React.FC<{ message: string }> = ({ message }) => (
  <div className="kd-panel-empty">
    <span>{message}</span>
  </div>
);
