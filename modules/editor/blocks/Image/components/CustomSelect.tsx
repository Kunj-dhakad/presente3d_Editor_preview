"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  label: string;
  value: string;
}

interface Props {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

const CustomSelect: React.FC<Props> = ({
  value,
  options,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* outside click close */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () =>
      document.removeEventListener("mousedown", handler);
  }, []);

  const active = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      {/* trigger */}
      <div
        className="kd-font-trigger"
        onClick={() => setOpen((p) => !p)}
      >
        <span className="text-xs">
          {active?.label || "Select"}
        </span>
        <ChevronDown size={14} />
      </div>

      {/* menu */}
      {open && (
        <div className="kd-font-menu">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`kd-font-option ${
                value === opt.value
                  ? "kd-font-option-active"
                  : ""
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;