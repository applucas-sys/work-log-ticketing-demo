"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";

export interface AcItem {
  label: string;
  meta?: string;
  value: string;
}

interface Options {
  listId: string;
  value: string;
  setValue: (v: string) => void;
  getItems: (q: string) => { head: string; items: AcItem[] };
  onPick: (v: string) => void;
  /** Keep the list open after picking and let Enter add free text (for pax chips). */
  multi?: boolean;
  onBackspaceEmpty?: () => void;
}

/**
 * Small accessible combobox. Returns props for the <input> and the dropdown
 * element so the caller decides where each one goes (the pax input lives inside
 * the chips box, but its list must sit outside it).
 */
export function useAutocomplete(o: Options): { inputProps: InputHTMLAttributes<HTMLInputElement>; list: ReactNode } {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const { head, items } = o.getItems(o.value.trim());
  const show = open && items.length > 0;

  const pick = (v: string) => {
    o.onPick(v);
    setIdx(0);
    if (!o.multi) setOpen(false);
  };

  const inputProps: InputHTMLAttributes<HTMLInputElement> = {
    value: o.value,
    role: "combobox",
    "aria-autocomplete": "list",
    "aria-expanded": show,
    "aria-controls": o.listId,
    "aria-activedescendant": show ? `${o.listId}-${idx}` : undefined,
    autoComplete: "off",
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      o.setValue(e.target.value);
      setOpen(true);
      setIdx(0);
    },
    onFocus: () => setOpen(true),
    onBlur: () => setTimeout(() => setOpen(false), 120),
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setIdx((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (show && items[idx]) pick(items[idx].value);
        else if (o.multi && o.value.trim()) pick(o.value);
      } else if (e.key === "Escape" && show) {
        e.stopPropagation();
        setOpen(false);
      } else if (e.key === "Backspace" && !o.value && o.onBackspaceEmpty) {
        o.onBackspaceEmpty();
      }
    },
  };

  const list = show ? (
    <div className="ac on" id={o.listId} role="listbox">
      <div className="ac-h">{head}</div>
      {items.map((it, i) => (
        <button
          type="button"
          key={it.value + i}
          id={`${o.listId}-${i}`}
          role="option"
          aria-selected={i === idx}
          className={i === idx ? "on" : ""}
          onMouseDown={(e) => {
            e.preventDefault();
            pick(it.value);
          }}
        >
          <span>{it.label}</span>
          <small>{it.meta}</small>
        </button>
      ))}
    </div>
  ) : null;

  return { inputProps, list };
}
