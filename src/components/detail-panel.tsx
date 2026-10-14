"use client";

import type { ReactNode } from "react";
import { PRODUCTS } from "@/lib/constants";
import { ago, fmtDate, fmtDateTime, rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { PipState } from "@/lib/types";
import { isUrgentOpen, stage, stuckReason } from "@/lib/workflow";
import { CopyButton, FileButton, Pip, StageTag } from "./bits";
import { FileDrop } from "./file-drop";
import { DrawerHead } from "./ui/overlay";
import { useUi } from "./ui-context";

function Step({ state, title, sub }: { state: PipState; title: string; sub?: ReactNode }) {
  return (
    <li>
      <Pip state={state} />
      <div>
        {title}
        {sub && <div className="sub wrap">{sub}</div>}
      </div>
    </li>
  );
}

export function DetailPanel({ id }: { id: string }) {
  const { get, now, actions } = useStore();
  const { role, me, actor, closeDrawer, openModal, toast } = useUi();
  const r = get(id);
  if (!r) return null;
  const s = stage(r);
  const ownRecord = role === "staff" && r.staff === me;

  let foot: ReactNode = null;
  if (ownRecord && s === "toissue") foot = <button className="btn primary" onClick={() => openModal({ kind: "issue", id })}>Tandai issued</button>;
  if (ownRecord && s === "toinvoice") foot = <button className="btn primary" onClick={() => openModal({ kind: "invoice", id })}>Tandai sudah invoice</button>;
  if (ownRecord && s === "revise")
    foot = (
      <button className="btn primary" onClick={() => { actions.resubmit(id); toast("Dikirim ulang ke AP."); }}>
        Kirim ulang ke AP
      </button>
    );
  if (ownRecord && s === "waitap")
    foot = <button className="btn" onClick={() => actions.toggleUrgent(id)}>{r.urgent ? "Hapus tanda urgent" : "Tandai urgent"}</button>;
  if (role === "ap" && r.ap?.status === "waiting")
    foot = (
      <>
        <button className="btn danger" onClick={() => openModal({ kind: "revise", id })}>Kembalikan ke staf</button>
        <button className="btn green" onClick={() => openModal({ kind: "pay", id })}>Tandai dibayar</button>
      </>
    );
  if (role === "spv" && stuckReason(r, now))
    foot = (
      <button className="btn" onClick={() => { actions.log(id, actor, "Mengirim pengingat"); toast(`Pengingat dikirim ke ${r.staff} untuk ${r.pnr}.`); }}>
        Ingatkan {r.staff}
      </button>
    );

  const ap = r.ap;
  const apStep: { state: PipState; title: string; sub: string } = !ap
    ? { state: "na", title: "Bayar pakai deposit vendor", sub: "Tidak lewat AP" }
    : ap.status === "waiting"
      ? { state: "wait", title: "Menunggu pembayaran AP", sub: "Diminta " + ago(ap.requestedAt, now) }
      : ap.status === "paid"
        ? { state: "paid", title: "Dibayar AP", sub: ap.paidAt ? fmtDateTime(ap.paidAt) : "" }
        : { state: "revise", title: "Dikembalikan AP", sub: ap.revise };

  return (
    <>
      <DrawerHead eyebrow={`${r.id}, dibuat ${ago(r.createdAt, now)}`} title={r.pax.join(", ")} labelId="d-title" onClose={closeDrawer}>
        <div className="tagline">
          <StageTag r={r} />
          {isUrgentOpen(r) && <span className="tag red">Urgent</span>}
        </div>
      </DrawerHead>

      <div className="d-body">
        {s === "revise" && ap && (
          <div className="sec">
            <div className="note red"><b>Catatan AP:</b> {ap.revise}</div>
            {ownRecord && (
              <div className="field" style={{ marginTop: 12 }}>
                <span className="lbl">Ganti invoice vendor</span>
                <FileDrop label="Pilih file SS atau PDF" current={ap.invoice} onFile={(f) => actions.replaceInvoice(id, f)} />
              </div>
            )}
          </div>
        )}

        <div className="sec">
          <h3>Progres</h3>
          <ul className="steps">
            <Step state="done" title="Reservasi dibuat" sub={`${r.staff}, ${fmtDateTime(r.createdAt)}`} />
            <Step state={apStep.state} title={apStep.title} sub={apStep.sub} />
            <Step
              state={r.issuedAt ? "done" : "todo"}
              title={r.issuedAt ? "Tiket issued" : "Belum issued"}
              sub={r.issuedAt ? fmtDateTime(r.issuedAt) + (r.ticketNo ? ", no. " + r.ticketNo : "") : r.ttl ? "TTL " + fmtDateTime(r.ttl) : undefined}
            />
            <Step
              state={r.invoicedAt ? "done" : "todo"}
              title={r.invoicedAt ? "Sudah diinvoice" : "Belum diinvoice"}
              sub={r.invoicedAt ? r.invoiceNo + ", " + fmtDateTime(r.invoicedAt) : undefined}
            />
          </ul>
        </div>

        <div className="sec">
          <h3>Reservasi</h3>
          <dl className="kv">
            <dt>Perusahaan</dt><dd>{r.company}</dd>
            <dt>Produk</dt><dd>{PRODUCTS[r.product]}</dd>
            <dt>Vendor</dt><dd>{r.vendor}</dd>
            <dt>Maskapai</dt><dd>{r.carrier || "-"}</dd>
            <dt>Rute</dt><dd>{r.route ? r.route + ", " : ""}{fmtDate(r.travel)}</dd>
            <dt>PNR / order</dt><dd><span className="code">{r.pnr}</span> <CopyButton value={r.pnr} /></dd>
            {r.ticketNo && (<><dt>No. tiket</dt><dd><span className="code">{r.ticketNo}</span></dd></>)}
            <dt>Nilai</dt><dd className="amt">{rp(r.amount)}</dd>
            <dt>Staf</dt><dd>{r.staff}</dd>
          </dl>
        </div>

        {ap && (
          <div className="sec">
            <h3>Permintaan bayar</h3>
            <dl className="kv">
              <dt>Nominal</dt><dd className="amt">{rp(r.amount)}</dd>
              <dt>Transfer ke</dt>
              <dd>
                {ap.bank} <span className="code">{ap.acct}</span> <CopyButton value={ap.acct} />
                <br />
                <span className="sub">{ap.acctName}</span>
              </dd>
              <dt>Berita transfer</dt><dd><span className="code">{r.pnr} {r.pax[0]}</span></dd>
              {ap.note && (<><dt>Catatan staf</dt><dd>{ap.note}</dd></>)}
            </dl>
            <div className="files">
              <FileButton file={ap.invoice} label="Invoice vendor" />
              <FileButton file={ap.proof} label="Bukti transfer" />
            </div>
          </div>
        )}

        <div className="sec">
          <h3>Riwayat</h3>
          <ul className="log">
            {[...r.log].sort((a, b) => b.t - a.t).map((l, i) => (
              <li key={i}>
                <time>{fmtDateTime(l.t)}</time>
                <span><b>{l.who}</b> {l.msg}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {foot && <div className="d-foot">{foot}</div>}
    </>
  );
}
