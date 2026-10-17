"use client";

import { useState } from "react";
import { PRODUCTS, STAFF } from "@/lib/constants";
import { rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Reservation } from "@/lib/types";
import { matchesQuery, sortWork, stage, stuckReason } from "@/lib/workflow";
import { stop } from "../bits";
import { useUi } from "../ui-context";

const PROD_LABEL: Record<string, string> = {
  intl: "✈ Psw. Intl",
  dom: "✈ Psw. Dom",
  kai: "▣ Kereta API",
  whoosh: "▣ Whoosh",
};

function nextStep(r: Reservation, now: number): { text: string; cls: string } {
  const s = stage(r);
  const stuck = s !== "done" ? stuckReason(r, now) : "";
  if (s === "done")    return { text: "Selesai — pindah ke arsip", cls: "done" };
  if (stuck)           return { text: stuck, cls: "stuck" };
  if (s === "waitap")  return { text: "Next: AP transfer ke vendor", cls: "wait" };
  if (s === "revise")  return { text: "Next: Staf perbaiki dokumen AP", cls: "stuck" };
  if (s === "toissue") return { text: "Next: Staf tandai issued", cls: "action" };
  return               { text: "Next: Staf kirim invoice ke customer", cls: "action" };
}

function ApBox({ r }: { r: Reservation }) {
  if (r.pay !== "ap" || !r.ap)         return <div className="sbox na">AP<span className="mk">—</span></div>;
  if (r.ap.status === "waiting")        return <div className="sbox pending">AP<span className="mk">⌛</span></div>;
  if (r.ap.status === "paid")           return <div className="sbox done">AP<span className="mk">✓</span></div>;
  /* revise */                           return <div className="sbox revise">AP<span className="mk">!</span></div>;
}

function StaffTableRow({ r, now }: { r: Reservation; now: number }) {
  const { openDetail, openModal } = useUi();
  const s = stage(r);
  const paxName = r.pax[0] ?? r.company;
  const extraPax = r.pax.length > 1 ? ` +${r.pax.length - 1}` : "";

  let action: React.ReactNode;
  if (s === "toissue")
    action = <button className="btn-act" onClick={(e) => { stop(e); openModal({ kind: "issue", id: r.id }); }}>Tandai Issued</button>;
  else if (s === "toinvoice")
    action = <button className="btn-act" onClick={(e) => { stop(e); openModal({ kind: "invoice", id: r.id }); }}>Tandai Invoice</button>;
  else if (s === "waitap")
    action = <button className="btn-act sec" onClick={(e) => { stop(e); openDetail(r.id); }}>Detail</button>;
  else if (s === "revise")
    action = <button className="btn-act danger" onClick={(e) => { stop(e); openDetail(r.id); }}>Perbaiki</button>;
  else
    action = <span className="faint" style={{ fontSize: 11 }}>{r.invoiceNo || "—"}</span>;

  return (
    <tr
      className={(r.urgent && s !== "done" ? "urgent " : "") + (s === "done" ? "done-row" : "")}
      onClick={() => openDetail(r.id)}
    >
      <td>
        <div className="pax-name">
          {r.urgent && s !== "done" && <span className="ubadge">URGENT</span>}
          {paxName}{extraPax}
        </div>
        <div className="pax-co">{r.company}</div>
      </td>
      <td><span className="prod-tag">{PROD_LABEL[r.product] ?? r.product}</span></td>
      <td>
        <div className="route-main">{r.route || "—"}</div>
        <div className="route-sub">{r.pnr} ({r.carrier})</div>
      </td>
      <td className="tr"><span className="amt">{rp(r.amount)}</span></td>
      <td className="tc">
        <div className="sboxes">
          <ApBox r={r} />
          <div className={"sbox" + (r.issuedAt ? " done" : "")}>ISS<span className="mk">{r.issuedAt ? "✓" : "—"}</span></div>
          <div className={"sbox" + (r.invoicedAt ? " done" : "")}>INV<span className="mk">{r.invoicedAt ? "✓" : "—"}</span></div>
        </div>
      </td>
      <td className="tc" onClick={(e) => e.stopPropagation()}>{action}</td>
    </tr>
  );
}

export function StaffView({
  query, setQuery, me, setMe,
}: {
  query: string;
  setQuery: (q: string) => void;
  me: string;
  setMe: (m: string) => void;
}) {
  const { records, now } = useStore();
  const [tab, setTab] = useState<"active" | "archive">("active");

  const mine = records.filter((r) => r.staff === me);
  const active = mine.filter((r) => stage(r) !== "done");
  const archive = mine.filter((r) => stage(r) === "done");

  const list = (tab === "active"
    ? [...active].sort(sortWork)
    : [...archive].sort((a, b) => (b.invoicedAt ?? 0) - (a.invoicedAt ?? 0))
  ).filter((r) => matchesQuery(r, query));

  const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

  return (
    <>
      <div className="view-head" style={{ alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Work Log</h1>
        <span style={{ width: 2, alignSelf: "stretch", background: "var(--bdr)", borderRadius: 1, margin: "0 4px" }} aria-hidden="true" />
        <div className="staff-sel-row" style={{ margin: 0 }}>
          Masuk sebagai
          <select
            className="staff-sel"
            value={me}
            onChange={(e) => { setMe(e.target.value); setQuery(""); }}
            aria-label="Pilih staf"
          >
            {STAFF.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>
        </div>
      </div>

      {/* Active / Archive tabs */}
      <div className="view-tabs">
        <button
          className={tab === "active" ? "active" : ""}
          onClick={() => setTab("active")}
        >
          Active
          <span className={"tc" + (active.length > 0 ? "" : "")}>{active.length}</span>
        </button>
        <button
          className={tab === "archive" ? "active" : ""}
          onClick={() => setTab("archive")}
        >
          Archive
          <span className="tc">{archive.length}</span>
        </button>
      </div>

      {/* Search */}
      <div className="filters">
        <input
          className="filter-search"
          type="search"
          placeholder="⌕  Cari pax, perusahaan, PNR…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cari"
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="tk">
          <colgroup>
            <col style={{ width: "35%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Penumpang / Perusahaan</th>
              <th>Produk</th>
              <th>Rute / Kode / Op</th>
              <th className="tr">Nominal Tagihan</th>
              <th className="tc">Status (AP · ISS · INV)</th>
              <th className="tc">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => <StaffTableRow key={r.id} r={r} now={now} />)}
          </tbody>
        </table>
        {list.length === 0 && (
          <div className="empty">
            <b>{query ? "Tidak ada yang cocok" : tab === "active" ? "Semua beres!" : "Arsip masih kosong"}</b>
            {query ? "Coba kata kunci lain." : tab === "active" ? "Buat entri baru saat ada reservasi masuk." : "Reservasi yang sudah diinvoice akan muncul di sini."}
          </div>
        )}
      </div>
    </>
  );
}
