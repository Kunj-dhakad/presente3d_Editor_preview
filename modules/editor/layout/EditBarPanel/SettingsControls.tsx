"use client";

/**
 * The controls every element's settings panel is built from.
 *
 * These grew up inside `TableSettings` and were the only panel that looked the
 * part, so they live here now — a second panel copying them is exactly how the
 * chart panel ended up looking like a different product.
 *
 * Presentation is in `styles/globals.css` under "Settings panel kit", written
 * against the `--kd-*` tokens: the hard-coded slate/violet these started with
 * meant a project theme (lib/themes/themes.ts) could never reach them.
 */

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/** A titled card of fields, hairline-separated. */
export const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="kd-set-section">
    <h3 className="kd-set-section-title">{title}</h3>
    <div className="kd-set-card">{children}</div>
  </section>
);

/** A card's own padded area — for grids of buttons or lists of repeating rows. */
export const Block = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`kd-set-block ${className}`}>{children}</div>;

/**
 * One labelled row inside a `Section`. `stacked` puts the control on its own
 * line below the label, for anything too wide to sit beside it.
 */
export const Field = ({
  label,
  stacked = false,
  children,
}: {
  label: string;
  stacked?: boolean;
  children: React.ReactNode;
}) => (
  <label className={`kd-set-field ${stacked ? "kd-set-field-stacked" : ""}`}>
    <span className="kd-set-field-label">{label}</span>
    <span className={stacked ? "mt-1.5 block" : "kd-set-field-control"}>
      {children}
    </span>
  </label>
);

/** Explanatory copy sitting inside a card, between fields. */
export const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="kd-set-hint">{children}</p>
);

/** Colour chip with the native picker hidden behind it. */
export const Swatch = ({
  color,
  onChange,
}: {
  color: string;
  onChange: (next: string) => void;
}) => (
  <span className="kd-set-swatch">
    <span className="kd-set-swatch-fill" style={{ background: color }} />
    <input
      type="color"
      value={color}
      onChange={(event) => onChange(event.target.value)}
    />
  </span>
);

export const Segmented = <T extends string>({
  options,
  active,
  onChange,
}: {
  options: { value: T; label: string }[];
  active: T;
  onChange: (next: T) => void;
}) => (
  <span className="kd-set-segmented">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`kd-set-segmented-item ${
          active === option.value ? "kd-set-segmented-item-active" : ""
        }`}
      >
        {option.label}
      </button>
    ))}
  </span>
);

export const Switch = ({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={() => onChange(!on)}
    className={`kd-set-switch ${on ? "kd-set-switch-on" : ""}`}
  >
    <span className="kd-set-switch-thumb" />
  </button>
);

/** Square on/off button, for B/I/U and the like. */
export const Toggle = ({
  active,
  label,
  title,
  style,
  onClick,
}: {
  active: boolean;
  label: string;
  title: string;
  style?: React.CSSProperties;
  onClick: () => void;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    style={style}
    className={`kd-set-toggle ${active ? "kd-set-toggle-active" : ""}`}
  >
    {label}
  </button>
);

/** Destructive row action — removing a quiz option, a form field, a data row. */
export const IconButton = ({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onClick={onClick}
    className="kd-set-icon-btn"
  >
    {children}
  </button>
);

/** A repeating card — one quiz question, one form field. */
export const Item = ({
  title,
  onRemove,
  removeTitle = "Remove",
  children,
}: {
  title?: string;
  onRemove?: () => void;
  removeTitle?: string;
  children: React.ReactNode;
}) => (
  <div className="kd-set-item">
    {(title || onRemove) && (
      <div className="kd-set-item-head">
        <span>{title}</span>
        {onRemove && (
          <IconButton title={removeTitle} onClick={onRemove}>
            <TrashGlyph />
          </IconButton>
        )}
      </div>
    )}
    {children}
  </div>
);

/** Kept inline so `Item` needs no icon import of its own. */
const TrashGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" />
  </svg>
);

/**
 * Select replacement. The native one cannot be styled to match the panel, so
 * every panel that wanted a themed one grew its own copy — this is that copy,
 * kept once.
 */
export const Dropdown = ({
  value,
  options,
  onChange,
  className = "",
}: {
  value: string | number;
  options: { label: string; value: string | number }[];
  onChange: (next: string) => void;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocumentDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDocumentDown);
    return () => document.removeEventListener("mousedown", onDocumentDown);
  }, [open]);

  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div className={`kd-set-dropdown ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        className="kd-set-input kd-set-dropdown-trigger"
      >
        <span className="truncate">{selected?.label ?? "Select"}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="kd-set-dropdown-menu">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(String(option.value));
                setOpen(false);
              }}
              className={`kd-set-dropdown-option ${
                String(option.value) === String(value)
                  ? "kd-set-dropdown-option-active"
                  : ""
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Segmented control whose choices are icons or very short glyphs. */
export const IconSegmented = <T extends string>({
  options,
  active,
  onChange,
}: {
  options: { value: T; title: string; Icon?: React.ComponentType<{ size?: number }>; label?: string }[];
  active: T;
  onChange: (next: T) => void;
}) => (
  <span className="kd-set-icon-group">
    {options.map(({ value, title, Icon, label }) => (
      <button
        key={value}
        type="button"
        title={title}
        aria-label={title}
        onClick={() => onChange(value)}
        className={`kd-set-icon-item ${
          active === value ? "kd-set-icon-item-active" : ""
        }`}
      >
        {Icon ? <Icon size={13} /> : label}
      </button>
    ))}
  </span>
);

/**
 * Hex field and picker as one control. Typing is accepted a character at a
 * time, so the value is only committed once it is a real colour — otherwise
 * deleting a digit would repaint the element mid-edit.
 */
export const ColorInput = ({
  color,
  onChange,
}: {
  color: string;
  onChange: (next: string) => void;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? color;
  return (
    <span className="kd-set-color">
      <input
        type="text"
        className="kd-set-color-hex"
        value={shown}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const hex = next.startsWith("#") ? next : `#${next}`;
          if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) onChange(hex);
        }}
        onBlur={() => setDraft(null)}
      />
      <span className="kd-set-color-chip" style={{ background: color }}>
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#000000"}
          onChange={(event) => {
            setDraft(null);
            onChange(event.target.value);
          }}
        />
      </span>
    </span>
  );
};

export const input = "kd-set-input";
export const numberInput = "kd-set-input kd-set-input-number";
export const smallInput = "kd-set-input kd-set-input-small";
export const textInput = "kd-set-input kd-set-input-text";
export const fullInput = "kd-set-input kd-set-input-full";
export const actionButton = "kd-set-action";
export const primaryButton = "kd-set-action kd-set-action-primary";

/** Reads a number out of an input, keeping the old value when it is mid-edit. */
export const numeric = (input: string, fallback: number) =>
  Number.isFinite(Number(input)) ? Number(input) : fallback;
