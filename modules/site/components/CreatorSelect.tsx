"use client";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type CreatorOption = { value: string; label: string; description?: string };
export default function CreatorSelect({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: CreatorOption[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  const anchor = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const selected = options.find(option => option.value === value);
  const filtered = options.filter(option => `${option.label} ${option.description || ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  function placePopup() {
    if (!anchor.current) return;
    const rect = anchor.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 14;
    const above = rect.top - 14;
    const upward = below < 240 && above > below;
    const width = Math.min(rect.width, window.innerWidth - 24);
    setPosition({ position: "fixed", width, left: Math.min(Math.max(12, rect.left), window.innerWidth - width - 12),
      ...(upward ? { bottom: window.innerHeight - rect.top + 7 } : { top: rect.bottom + 7 }), maxHeight: Math.min(320, Math.max(80, upward ? above : below)) });
  }
  function show() {
    if (disabled || open) return;
    placePopup(); setQuery(""); setActive(Math.max(0, options.findIndex(option => option.value === value))); setOpen(true);
  }
  function choose(option: CreatorOption) { onChange(option.value); setOpen(false); input.current?.focus(); }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { show(); return; }
      setActive(index => Math.max(0, Math.min(filtered.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
    }
    if (event.key === "Enter") { event.preventDefault(); if (open && filtered[active]) choose(filtered[active]); else show(); }
  }
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!anchor.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", placePopup);
    window.addEventListener("scroll", placePopup, true);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", placePopup); window.removeEventListener("scroll", placePopup, true); };
  }, [open]);
  useEffect(() => { if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, open, id]);

  return <div className="fs-creator-select"><label htmlFor={id}>{label}</label><div ref={anchor} className={`fs-select-control${open ? " open" : ""}`} onClick={() => { input.current?.focus(); show(); }}>
    {open ? <Search size={16} /> : null}<input id={id} ref={input} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open && filtered[active] ? `${id}-option-${active}` : undefined} autoComplete="off" disabled={disabled} value={open ? query : selected?.label || ""} placeholder={`Search ${label.toLowerCase()}…`} onFocus={show} onClick={show} onKeyDown={keyDown} onBlur={event => { if (!popup.current?.contains(event.relatedTarget as Node)) setOpen(false); }} onChange={event => { if (!open) show(); setQuery(event.target.value); setActive(0); }} />
    <ChevronDown size={16} className={open ? "expanded" : ""} aria-hidden="true" />
  </div>{open && createPortal(<div ref={popup} className="fs-creator-select-popup" style={position}>
    <div className="fs-select-popup-caption">{label}<span>{filtered.length} options</span></div>
    <div id={`${id}-list`} role="listbox" aria-label={label}>{filtered.map((option, index) => <button key={option.value} id={`${id}-option-${index}`} type="button" tabIndex={-1} role="option" aria-selected={value === option.value} className={index === active ? "highlighted" : ""} onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>{value === option.value && <Check size={16} />}</button>)}</div>
    {!filtered.length && <p role="status">No matches. Try another word.</p>}
  </div>, document.body)}</div>;
}
