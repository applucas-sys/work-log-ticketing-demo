"use client";

import { useState, type ReactNode } from "react";
import { PRODUCTS } from "@/lib/constants";
import { ago, fmtDate, fmtDateTime, formatNumber, rp } from "@/lib/format";
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

  const [editing, setEditing] = useState(false);
  const [eCompany, setECompany] = useState("");
  const [eCarrier, setECarrier] = useState("");
  const [eRoute,   setERoute]   = useState("");
  const [ePnr,     setEPnr]     = useState("");
  const [eAmount,  setEAmount]  = useState("");
  const [eTtl,     setETtl]     = useState("");

  if (!r) return null;
  const s = stage(r);
  const ownRecord = role === "staff" && r.staff === me;
  const postPayment = !!(r.issuedAt !== null || r.ap?.status === "paid");

  const startEdit = () => {
    setECompany(r.company);
    setECarrier(r.carrier);
    setERoute(r.route);
    setEPnr(r.pnr);
    setEAmount(formatNumber(r.amount));
    setETtl(r.ttl ? new Date(r.ttl).toISOString().slice(0, 16) : "");
    setEditing(true);
  };

  const saveEdit = () => {
    const amt = Number(eAmount.replace(/\D/g, ""));
    actions.editFields(
      id,
      {
        company: eCompany.trim() || r.company,
        carrier: eCarrier.trim().toUpperCase() || r.carrier,
        route:   eRoute.trim().toUpperCase()   || r.route,
        pnr:     ePnr.trim().toUpperCase()     || r.pnr,
        ttl:     eTtl ? new Date(eTtl).getTime() : null,
        amount:  amt > 0 ? amt : r.amount,
      },
      actor,
      postPayment,
    );
    setEditing(false);
    toast("Perubahan disimpan dan dicatat di riwayat.");
  };

  let foot: ReactNode = null;
  if (editing) {
    foot = (
      <>
        <button className="btn" onClick={() => setEditing(false)}>Batal</button>
        <button className="btn primary" onClick={saveEdit}>Simpan perubahan</button>
      </>
    );
  } else if (ownRecord && s === "toissue") {
    foot = <button className="btn primary" onClick={() => openModal({ kind: "issue", id })}>Tandai issued</button>;
  } else if (ownRecord && s === "toinvoice") {
    foot = <button className="btn primary" onClick={() => openModal({ kind: "invoice", id })}>Tandai sudah invoice</button>;
  } else if (ownRecord && s === "revise") {
    foot = (
      <button className="btn primary" onClick={() => { actions.resubmit(id); toast("Dikirim ulang ke AP."); }}>
        Kirim ulang ke AP
      </button>
    );
  } else if (role === "ap" && r.ap?.status === "waiting") {
    foot = (
      <>
        <button className="btn danger" onClick={() => openModal({ kind: "revise", id })}>Kembalikan ke staf</button>
        <button className="btn green" onClick={() => openModal({ kind: "pay", id })}>Tandai dibayar</button>
      </>
    );
  } else if (role === "spv" && stuckReason(r, now)) {
    foot = (
      <button className="btn" onClick={() => { actions.log(id, actor, "Mengirim pengingat"); toast(`Pengingat dikirim ke ${r.staff} untuk ${r.pnr}.`); }}>
        Ingatkan {r.staff}
      </button>
    );
  }

  const ap = r.ap;
  const apStep: { state: PipState; title: string; sub: string } = !ap
    ? { state: "na", title: "Bayar pakai deposit vendor", sub: "Tidak lewat AP" }
    : ap.status === "waiting"
      ? { state: "wait", title: "Menunggu pembayaran AP", sub: "Diminta " + ago(ap.requestedAt, now) }
      : ap.status === "paid"
        ? { state: "paid", title: "Dibayar AP", sub: ap.paidAt ? fmtDateTime(ap.paidAt) : "" }
        : { state: "revise", title: "Dikembalikan AP", sub: ap.revise };

  const canEdit = ownRecord || role === "spv";

  return (
    <>
      <DrawerHead eyebrow={`${r.id}, dibuat ${ago(r.createdAt, now)}`} title={r.pax.join(", ")} labelId="d-title" onClose={closeDrawer}>
        <div className="tagline">
          <StageTag r={r} />
          {isUrgentOpen(r) && <span className="tag red">Urgent</span>}
          {postPayment && editing && <span className="tag amber">Edit setelah pembayaran</span>}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Reservasi</h3>
            {canEdit && !editing && (
              <button className="btn" style={{ fontSize: 11, padding: "3px 10px" }} onClick={startEdit}>Edit</button>
            )}
          </div>
          {editing ? (
            <div style={{ display: "grid", gap: 10 }}>
              {postPayment && (
                <div className="note" style={{ marginBottom: 0 }}>⚠ Perubahan setelah tahap pembayaran akan dicatat khusus di riwayat.</div>
              )}
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Perusahaan</label>
                <input className="inp" value={eCompany} onChange={(e) => setECompany(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Maskapai / operator</label>
                  <input className="inp" value={eCarrier} onChange={(e) => setECarrier(e.target.value)} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Rute</label>
                  <input className="inp upper" value={eRoute} onChange={(e) => setERoute(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>PNR / kode booking</label>
                  <input className="inp code upper" value={ePnr} onChange={(e) => setEPnr(e.target.value)} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Nilai (Rp)</label>
                  <input className="inp" inputMode="numeric" value={eAmount}
                    onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setEAmount(d ? formatNumber(Number(d)) : ""); }} />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Time limit (TTL)</label>
                <input className="inp" type="datetime-local" value={eTtl} onChange={(e) => setETtl(e.target.value)} />
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {ap && (
          <div className="sec">
            <h3>Permintaan bayar</h3>
            <dl className="kv">
              <dt>Nominal</dt><dd className="amt">{rp(r.amount)}</dd>
              <dt>Bank / Metode</dt><dd>{ap.bank}</dd>
              <dt>No. rekening / VA</dt>
              <dd>
                <span className="code">{ap.acct}</span> <CopyButton value={ap.acct} />
              </dd>
              <dt>Atas nama</dt><dd>{ap.acctName}</dd>
              <dt>Berita transfer</dt><dd><span className="code">{r.pnr} {r.pax[0]}</span></dd>
            </dl>
            <div className="files">
              <FileButton file={ap.invoice} label="Invoice vendor" />
              {ap.proof && <FileButton file={ap.proof} label="Bukti transfer" />}
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
