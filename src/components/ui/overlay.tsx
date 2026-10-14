"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "../icons";

function useAutoFocus(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("[data-autofocus], input, textarea, select, button");
      el?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [open]);
  return ref;
}

export function Drawer({ open, labelId, children }: { open: boolean; labelId: string; children: ReactNode }) {
  const ref = useAutoFocus(open);
  return (
    <aside ref={ref} className={"drawer" + (open ? " on" : "")} role="dialog" aria-modal="true" aria-labelledby={labelId} aria-hidden={!open} inert={!open}>
      {children}
    </aside>
  );
}

export function DrawerHead({ eyebrow, title, labelId, onClose, children }: { eyebrow: ReactNode; title: ReactNode; labelId: string; onClose: () => void; children?: ReactNode }) {
  return (
    <div className="d-head">
      <div>
        <div className="sub">{eyebrow}</div>
        <h2 id={labelId}>{title}</h2>
        {children}
      </div>
      <button className="x" onClick={onClose} aria-label="Tutup">
        <IconClose />
      </button>
    </div>
  );
}

export function Modal({ title, children, footer, onClose }: { title: string; children: ReactNode; footer: ReactNode; onClose: () => void }) {
  const ref = useAutoFocus(true);
  return (
    <div className="modal-wrap on" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <div className="m-body">{children}</div>
        <div className="m-foot">{footer}</div>
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div className={"toast" + (message ? " on" : "")} role="status" aria-live="polite">
      {message}
    </div>
  );
}
