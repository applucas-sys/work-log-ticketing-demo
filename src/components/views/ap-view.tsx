"use client";

import { useState } from "react";
import { ago, rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Product, Reservation } from "@/lib/types";
import { matchesQuery, sortApQueue } from "@/lib/workflow";
import { stop } from "../bits";
import { IconPlane, IconTrain, IconWhoosh } from "../icons";
import { useUi } from "../ui-context";

const PROD_SHORT: Record<Product, string> = {
  intl: "Psw. Intl",
  dom: "Psw. Dom",
  kai: "Kereta KAI",
  whoosh: "Whoosh",
};

function ProdTag({ p }: { p: Product }) {
  const icon =
    p === "kai"   ? <IconTrain size={12} /> :
    p === "whoosh" ? <IconWhoosh size={12} /> :
    <IconPlane size={12} />;
  return <span className="prod-tag" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{icon}{PROD_SHORT[p]}</span>;
}

function ApTableRow({ r }: { r: Reservation }) {
  const { openModal, openDetail } = useUi();
  const { now } = useStore();
  if (!r.ap) return null;
  const paid = r.ap.status === "paid";
  const revise = r.ap.status === "revise";

  let action: React.ReactNode;
  if (paid)
    action = <span className="tag green">✓ Dibayar</span>;
  else if (revise)
    action = <span className="tag red">Dikembalikan</span>;
  else
    action = (
      <>
        <button className="btn-act success" style={{ marginBottom: 4, display: "block", width: "100%" }} onClick={(e) => { stop(e); openModal({ kind: "pay", id: r.id }); }}>Tandai Dibayar</button>
        <button className="btn-act sec" style={{ display: "block", width: "100%", fontSize: 10 }} onClick={(e) => { stop(e); openModal({ kind: "revise", id: r.id }); }}>Kembalikan</button>
      </>
    );

  return (
    <tr
      className={(r.urgent && !paid ? "urgent " : "") + (paid ? "done-row" : "")}
      onClick={() => openDetail(r.id)}
    >
      <td>
        <div className="pax-name">
          {r.urgent && !paid && <span className="ubadge">URGENT</span>}
          {r.pax[0] ?? r.company}
          {r.pax.length > 1 ? ` +${r.pax.length - 1}` : ""}
        </div>
        <div className="pax-co">{r.company}</div>
        <div className="pax-co" style={{ marginTop: 2 }}>dari {r.staff}</div>
      </td>
      <td><ProdTag p={r.product} /></td>
      <td>
        <div className="route-main">{r.vendor}</div>
        <div className="route-sub"><span className="code">{r.pnr}</span> · {r.route}</div>
      </td>
      <td>
        <div style={{ fontWeight: 700 }}>{r.ap.bank}</div>
        <div className="route-sub"><span className="code">{r.ap.acct}</span></div>
        <div className="route-sub">{r.ap.acctName}</div>
      </td>
      <td className="tr"><span className="amt">{rp(r.amount)}</span></td>
      <td>
        {paid && r.ap.paidAt
          ? <span className="faint" style={{ fontSize: 11 }}>Dibayar {ago(r.ap.paidAt, now)}</span>
          : r.ttl
            ? <span style={{ fontSize: 12 }}>TTL: {new Date(r.ttl).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
            : <span className="faint">—</span>}
        <div className="route-sub">Diminta {ago(r.ap.requestedAt, now)}</div>
      </td>
      <td className="tc" onClick={(e) => e.stopPropagation()}>{action}</td>
    </tr>
  );
}

export function ApView({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const { records } = useStore();
  const [tab, setTab] = useState<"queue" | "paid" | "back">("queue");

  const all = records.filter((r) => r.pay === "ap" && r.ap);
  const queue  = all.filter((r) => r.ap!.status === "waiting").sort(sortApQueue);
  const paid   = all.filter((r) => r.ap!.status === "paid").sort((a, b) => (b.ap!.paidAt ?? 0) - (a.ap!.paidAt ?? 0));
  const back   = all.filter((r) => r.ap!.status === "revise");
  const urgent = queue.filter((r) => r.urgent).length;
  const total  = queue.reduce((s, r) => s + r.amount, 0);

  const listRaw = tab === "queue" ? queue : tab === "paid" ? paid : back;
  const list = listRaw.filter((r) => matchesQuery(r, query));

  return (
    <>
      <div className="view-head">
        <div className="grow">
          <h1>Permintaan Pembayaran AP</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat"><div className={"stat-n" + (queue.length > 0 ? " blue" : "")}>{queue.length}</div><div className="stat-label">Menunggu dibayar</div></div>
        <div className="stat"><div className={"stat-n" + (total > 0 ? " amber" : "")} style={{ fontSize: 18 }}>{rp(total)}</div><div className="stat-label">Total antrian</div></div>
        <div className="stat"><div className={"stat-n" + (urgent > 0 ? " red" : "")}>{urgent}</div><div className="stat-label">Urgent — dahulukan</div></div>
        <div className="stat"><div className={"stat-n" + (back.length > 0 ? " red" : "")}>{back.length}</div><div className="stat-label">Dikembalikan ke staf</div></div>
      </div>

      {/* Tabs */}
      <div className="view-tabs">
        <button className={tab === "queue" ? "active" : ""} onClick={() => setTab("queue")}>
          Antrian <span className={"tc" + (urgent > 0 ? " hot" : "")}>{queue.length}</span>
        </button>
        <button className={tab === "paid" ? "active" : ""} onClick={() => setTab("paid")}>
          Sudah Dibayar <span className="tc">{paid.length}</span>
        </button>
        <button className={tab === "back" ? "active" : ""} onClick={() => setTab("back")}>
          Dikembalikan <span className={"tc" + (back.length > 0 ? " hot" : "")}>{back.length}</span>
        </button>
      </div>

      {/* Search */}
      <div className="filters">
        <input
          className="filter-search"
          type="search"
          placeholder="⌕  Cari pax, vendor, PNR, staf…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cari"
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="tk">
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Pax / Perusahaan / Peminta</th>
              <th>Produk</th>
              <th>Vendor &amp; PNR</th>
              <th>Transfer Ke</th>
              <th className="tr">Nominal</th>
              <th>Batas Waktu</th>
              <th className="tc">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => <ApTableRow key={r.id} r={r} />)}
          </tbody>
        </table>
        {list.length === 0 && (
          <div className="empty">
            <b>{tab === "queue" ? "Antrian kosong" : "Belum ada data"}</b>
            {tab === "queue" ? "Permintaan baru dari staf akan muncul di sini." : null}
          </div>
        )}
      </div>
    </>
  );
}
