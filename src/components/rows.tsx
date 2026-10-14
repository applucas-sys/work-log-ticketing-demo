"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { ago, fmtDate, rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Reservation } from "@/lib/types";
import { isUrgentOpen, stage } from "@/lib/workflow";
import { PaxCell, Pips, PipHead, TtlText, stop } from "./bits";
import { useUi } from "./ui-context";

function RowShell({ r, grid, children }: { r: Reservation; grid: string; children: ReactNode }) {
  const { openDetail } = useUi();
  const cls = ["row", grid, "click", isUrgentOpen(r) ? "urgent" : "", stage(r) === "done" ? "done" : ""].join(" ");
  const onKey = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openDetail(r.id);
    }
  };
  return (
    <div className={cls} tabIndex={0} onClick={() => openDetail(r.id)} onKeyDown={onKey} aria-label={`Buka detail ${r.pax[0]}, PNR ${r.pnr}`}>
      <div className="bar" />
      {children}
    </div>
  );
}

const prodLine = (r: Reservation) => [r.carrier, r.route].filter(Boolean).join(" ") + (r.carrier || r.route ? ", " : "") + fmtDate(r.travel);

/* ---------- ticketing staff ---------- */

export function StaffHead() {
  return (
    <div className="row g-staff head-row">
      <div className="bar" />
      <div>Pax dan perusahaan</div>
      <div>Vendor dan rute</div>
      <div>PNR</div>
      <div>Nilai</div>
      <div><PipHead /></div>
      <div>Waktu</div>
      <div>Langkah berikutnya</div>
    </div>
  );
}

export function StaffRow({ r }: { r: Reservation }) {
  const { now } = useStore();
  const { openModal, openDetail } = useUi();
  const s = stage(r);
  let act: ReactNode;
  if (s === "toissue")
    act = <button className="btn sm primary" onClick={(e) => { stop(e); openModal({ kind: "issue", id: r.id }); }}>Tandai issued</button>;
  else if (s === "toinvoice")
    act = <button className="btn sm" onClick={(e) => { stop(e); openModal({ kind: "invoice", id: r.id }); }}>Tandai sudah invoice</button>;
  else if (s === "waitap") act = <span className="btn sm wait" aria-disabled="true">Menunggu AP</span>;
  else if (s === "revise")
    act = <button className="btn sm danger" onClick={(e) => { stop(e); openDetail(r.id); }}>Perbaiki permintaan</button>;
  else act = <span className="sub">{r.invoiceNo}</span>;

  return (
    <RowShell r={r} grid="g-staff">
      <div className="c-who"><PaxCell r={r} sub={r.company} /></div>
      <div className="c-prod"><div>{r.vendor}</div><div className="sub">{prodLine(r)}</div></div>
      <div className="c-pnr"><span className="code">{r.pnr}</span></div>
      <div className="c-amt"><span className="amt">{rp(r.amount)}</span></div>
      <div className="c-pips"><Pips r={r} /></div>
      <div className="c-age"><TtlText r={r} now={now} /><div className="sub">Dibuat {ago(r.createdAt, now)}</div></div>
      <div className="c-act">{act}</div>
    </RowShell>
  );
}

/* ---------- SPV and finance (whole team) ---------- */

export function TeamHead({ statusLabel, timeLabel = "Waktu" }: { statusLabel: string; timeLabel?: string }) {
  return (
    <div className="row g-team head-row">
      <div className="bar" />
      <div>Staf</div>
      <div>Pax dan perusahaan</div>
      <div>Vendor dan rute</div>
      <div>PNR</div>
      <div>Nilai</div>
      <div><PipHead /></div>
      <div>{statusLabel}</div>
      <div>{timeLabel}</div>
    </div>
  );
}

export function TeamRow({ r, extra, showAge = true }: { r: Reservation; extra: ReactNode; showAge?: boolean }) {
  const { now } = useStore();
  return (
    <RowShell r={r} grid="g-team">
      <div className="c-staff"><b>{r.staff}</b></div>
      <div className="c-who"><PaxCell r={r} sub={r.company} /></div>
      <div className="c-prod"><div>{r.vendor}</div><div className="sub">{prodLine(r)}</div></div>
      <div className="c-pnr"><span className="code">{r.pnr}</span></div>
      <div className="c-amt"><span className="amt">{rp(r.amount)}</span></div>
      <div className="c-pips"><Pips r={r} /></div>
      <div className="c-act">{extra}</div>
      <div className="c-age">{showAge && <><TtlText r={r} now={now} /><div className="sub">Dibuat {ago(r.createdAt, now)}</div></>}</div>
    </RowShell>
  );
}

/* ---------- accounts payable ---------- */

export function ApHead() {
  return (
    <div className="row g-ap head-row">
      <div className="bar" />
      <div>Pax, perusahaan, peminta</div>
      <div>Vendor dan PNR</div>
      <div>Transfer ke</div>
      <div>Nominal</div>
      <div>Batas waktu</div>
      <div />
    </div>
  );
}

export function ApRow({ r }: { r: Reservation }) {
  const { now } = useStore();
  const { openModal } = useUi();
  if (!r.ap) return null;
  const paid = r.ap.status === "paid";
  return (
    <RowShell r={{ ...r, urgent: r.urgent && !paid }} grid="g-ap">
      <div className="c-who"><PaxCell r={{ ...r, urgent: r.urgent && !paid }} sub={`${r.company}, dari ${r.staff}`} /></div>
      <div className="c-prod"><div>{r.vendor} <span className="code faint">{r.pnr}</span></div><div className="sub">{prodLine(r)}</div></div>
      <div className="c-extra"><div>{r.ap.bank} <span className="code">{r.ap.acct}</span></div><div className="sub">{r.ap.acctName}</div></div>
      <div className="c-amt"><span className="amt">{rp(r.amount)}</span></div>
      <div className="c-age">
        {paid && r.ap.paidAt ? <span className="ttl faint">Dibayar {ago(r.ap.paidAt, now)}</span> : <TtlText r={r} now={now} />}
        <div className="sub">Diminta {ago(r.ap.requestedAt, now)}</div>
      </div>
      <div className="c-act">
        {paid ? (
          <span className="tag green">Dibayar</span>
        ) : r.ap.status === "revise" ? (
          <span className="tag red">Dikembalikan</span>
        ) : (
          <button className="btn sm green" onClick={(e) => { stop(e); openModal({ kind: "pay", id: r.id }); }}>Tandai dibayar</button>
        )}
      </div>
    </RowShell>
  );
}
