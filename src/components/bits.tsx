"use client";

import type { ReactNode } from "react";
import { ago, dur } from "@/lib/format";
import type { FileRef, PipState, Reservation } from "@/lib/types";
import { apLabel, isUrgentOpen, pipStates, stage } from "@/lib/workflow";
import { IconFile, IconSearch } from "./icons";
import { useUi } from "./ui-context";

export function Pip({ state, title }: { state: PipState; title?: string }) {
  return <span className={"pip " + (state === "todo" ? "" : state)} title={title} />;
}

/** The three status boxes from the client's sketch. */
export function Pips({ r }: { r: Reservation }) {
  const [a, b, c] = pipStates(r);
  const ap = apLabel(r);
  return (
    <div
      className="pips"
      role="img"
      aria-label={`Issued: ${r.issuedAt ? "ya" : "belum"}. ${ap}. Invoice: ${r.invoicedAt ? "ya" : "belum"}`}
    >
      <Pip state={a} title={r.issuedAt ? "Issued" : "Belum issued"} />
      <Pip state={b} title={ap} />
      <Pip state={c} title={r.invoicedAt ? "Sudah invoice" : "Belum invoice"} />
    </div>
  );
}

export function PipHead() {
  return (
    <div className="phead" aria-hidden="true">
      <span>Issued</span>
      <span>Bayar AP</span>
      <span>Invoice</span>
    </div>
  );
}

export function Legend() {
  return (
    <div className="legend">
      <span><i className="pip done" />Selesai</span>
      <span><i className="pip" />Belum</span>
      <span><i className="pip wait" />Menunggu AP</span>
      <span><i className="pip paid" />Dibayar AP</span>
      <span><i className="pip revise" />Dikembalikan AP</span>
      <span><i className="pip na" />Tidak lewat AP (deposit vendor)</span>
    </div>
  );
}

export function StageTag({ r }: { r: Reservation }) {
  switch (stage(r)) {
    case "done":
      return <span className="tag">Selesai</span>;
    case "toinvoice":
      return <span className="tag blue">Siap invoice</span>;
    case "waitap":
      return <span className="tag amber">Menunggu AP</span>;
    case "revise":
      return <span className="tag red">Dikembalikan AP</span>;
    default:
      return r.pay === "ap" ? <span className="tag green">Dibayar AP, siap issue</span> : <span className="tag">Siap issue</span>;
  }
}

export function TtlText({ r, now }: { r: Reservation; now: number }) {
  if (r.issuedAt) return <span className="ttl faint">Issued {ago(r.issuedAt, now)}</span>;
  if (r.ttl == null) return null;
  const left = r.ttl - now;
  if (left < 0) return <span className="ttl hot">TTL lewat</span>;
  return <span className={"ttl" + (left < 3 * 3_600_000 ? " hot" : "")}>TTL {dur(left)}</span>;
}

export function PaxCell({ r, sub }: { r: Reservation; sub: ReactNode }) {
  const urgent = isUrgentOpen(r);
  return (
    <>
      <div className="pax">
        {r.pax[0]}
        {r.pax.length > 1 && <span className="faint"> +{r.pax.length - 1}</span>}
        {urgent && <span className="urgent-flag">URGENT</span>}
      </div>
      <div className="sub">{sub}</div>
    </>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="search">
      <IconSearch />
      <label htmlFor="q" className="sr">Cari</label>
      <input id="q" type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Count({ n, hot }: { n: number; hot?: boolean }) {
  return <span className={"count" + (hot ? " hot" : "")}>{n}</span>;
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; count?: number; hot?: boolean }[];
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count != null && <Count n={t.count} hot={t.hot} />}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

export function FileButton({ file, label }: { file: FileRef | null; label: string }) {
  const { toast } = useUi();
  if (!file)
    return (
      <div className="faint" style={{ fontSize: 14 }}>
        {label}: belum ada
      </div>
    );
  return (
    <button
      type="button"
      className="file"
      onClick={() => (file.url ? window.open(file.url, "_blank") : toast("File contoh, tidak ada pratinjau. File yang kamu unggah bisa dibuka."))}
    >
      <IconFile />
      <span>
        <b>{label}</b>
        <br />
        <span className="sub">{file.name}</span>
      </span>
    </button>
  );
}

export function CopyButton({ value }: { value: string }) {
  const { toast } = useUi();
  return (
    <button
      type="button"
      className="copy"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value).catch(() => {});
        toast("Disalin: " + value);
      }}
    >
      Salin
    </button>
  );
}

/** Stops a click inside a row from also opening the row. */
export const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
