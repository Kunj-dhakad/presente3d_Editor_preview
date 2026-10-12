"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Package } from "lucide-react";

export default function AdminSelect({ value, options, onChange }: {
  value: string; options: { value: string; label: string }[]; onChange: (value: string) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);
  useEffect(() => {
    if (!open) return;
    const buttons = root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const index = Math.max(0, options.findIndex(option => option.value === value));
    buttons?.[index]?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, options, value]);
  return <div className="fs-admin-select" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <span id={`${id}-label`} className="fs-admin-select-label">Package</span>
    <button ref={trigger} type="button" className="fs-admin-select-trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} aria-labelledby={`${id}-label ${id}-value`} onClick={() => setOpen(!open)} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); }
    }}><Package size={16} aria-hidden="true" /><span id={`${id}-value`}>{selected?.label || "All packages"}</span><ChevronDown size={15} aria-hidden="true" /></button>
    {open && <div id={`${id}-options`} className="fs-admin-select-menu" role="listbox" aria-labelledby={`${id}-label`} onKeyDown={event => {
      const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')];
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    }}>{options.map(option => <button key={option.value} type="button" role="option" aria-selected={option.value === value} tabIndex={-1} onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}><span>{option.label}</span>{option.value === value && <Check size={15} aria-hidden="true" />}</button>)}</div>}
  </div>;
}
