"use client";

import React from 'react';
import { BookOpen, Rows3, Columns3, X } from 'lucide-react';
import { useBook } from '../context/BookStateContext';
import type { ViewMode } from '../types/book';

interface PreviewHeaderProps {
  onBack?: () => void;
  backLabel?: string;
}

const MODES: {
  id: Exclude<ViewMode, 'index'>;
  label: string;
  short: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'flipbook',
    label: 'Flipbook View',
    short: 'Flipbook',
    title: 'Flipbook Mode',
    Icon: BookOpen,
  },
  {
    id: 'vertical',
    label: 'Vertical View',
    short: 'Vertical',
    title: 'Vertical Scrolling Mode',
    Icon: Rows3,
  },
  {
    id: 'horizontal',
    label: 'Horizontal View',
    short: 'Horizontal',
    title: 'Horizontal Snapping Mode',
    Icon: Columns3,
  },
];

export function PreviewHeader({ onBack, backLabel = 'Back' }: PreviewHeaderProps) {
  const { viewMode, setViewMode } = useBook();

  return (
    <header className="h-[60px] w-full shrink-0 border-b kd-bd-subtle kd-bg-surface kd-fg flex items-center justify-between px-2 md:px-6 sticky top-0 z-50 shadow-xs">
      {/* View mode pills, on the left */}
      <div className="flex items-center kd-bg-sunken border kd-bd-subtle rounded-lg p-1 gap-1">
        {MODES.map(({ id, label, short, title, Icon }) => (
          <button
            key={id}
            id={`btn-${id}-view`}
            onClick={() => setViewMode(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
              viewMode === id
                ? 'kd-bg-accent kd-fg-on-accent shadow-sm'
                : 'kd-fg-muted kd-hv-fg kd-hv-bg'
            }`}
            title={title}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden lg:inline">{label}</span>
            <span className="hidden sm:inline lg:hidden">{short}</span>
          </button>
        ))}
      </div>

      {/* Close, on the right — an icon, since the header is a dialog bar */}
      {onBack && (
        <button
          onClick={onBack}
          aria-label={backLabel}
          title={backLabel}
          className="w-9 h-9 flex items-center justify-center rounded-lg border kd-bd-subtle kd-fg-muted kd-hv-fg-danger kd-hv-bd-danger kd-hv-bg-danger-soft transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </header>
  );
}

export default PreviewHeader;
