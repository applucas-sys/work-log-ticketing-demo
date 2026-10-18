"use client";

import { useState } from "react";
import { PRODUCTS, STAFF } from "@/lib/constants";
import { rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Reservation } from "@/lib/types";
import { matchesQuery, sortWork, stage, stuckReason } from "@/lib/workflow";
import { IconPlane, IconTrain, IconWhoosh } from "../icons";
import { useUi } from "../ui-context";

const PROD_SHORT: Record<string, string> = {
  intl: "Psw. Intl", dom: "Psw. Dom", kai: "Kereta KAI", whoosh: "Whoosh",
};
function ProdTag({ p }: { p: string }) {
  const icon =
    p === "kai"    ? <IconTrain size={12} /> :
    p === "whoosh" ? <IconWhoosh size={12} /> :
                     <IconPlane size={12} />;
  return <span className="prod-tag" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{icon}{PROD_SHORT[p] ?? p}</span>;
}

function nextStep(r: Reservation, now: number): { text: string; cls: string } {
  const s = stage(r);
  const stuck = s !== "done" ? stuckReason(r, now) : "";
  if (s === "done")    return { text: "Selesai", cls: "done" };
  if (stuck)           return { text: stuck, cls: "stuck" };
  if (s === "waitap")  return { text: "Next: AP transfer ke vendor", cls: "wait" };
  if (s === "revise")  return { text: "Next: Staf perbaiki dokumen AP", cls: "stuck" };
  if (s === "toissue") return { text: "Next: Staf tandai issued", cls: "action" };
  return               { text: "Next: Staf kirim invoice", cls: "action" };
}

function TeamTableRow({ r, now }: { r: Reservation; now: number }) {
  const { openDetail } = useUi();
  const s = stage(r);
  const stuck = s !== "done" ? stuckReason(r, now) : "";
  const paxName = r.pax[0] ?? r.company;
  const extraPax = r.pax.length > 1 ? ` +${r.pax.length - 1}` : "";

  return (
    <tr
      className={(r.urgent && s !== "done" ? "urgent " : "") + (s === "done" ? "done-row" : "")}
      onClick={() => openDetail(r.id)}
    >
      <td><span style={{ fontWeight: 800, fontSize: 12 }}>{r.staff}</span></td>
      <td>
        <div className="pax-name">
          {r.urgent && s !== "done" && <span className="ubadge">URGENT</span>}
          {paxName}{extraPax}
        </div>
        <div className="pax-co">{r.company}</div>
      </td>
      <td><ProdTag p={r.product} /></td>
      <td>
        <div className="route-main">{r.route || "—"}</div>
        <div className="route-sub">{r.pnr} ({r.carrier})</div>
      </td>
      <td className="tr"><span className="amt">{rp(r.amount)}</span></td>
      <td className="tc">
        <div className="sboxes">
          {r.pay !== "ap" || !r.ap
            ? <div className="sbox na">AP<span className="mk">—</span></div>
            : r.ap.status === "waiting"
              ? <div className="sbox pending">AP<span className="mk">⌛</span></div>
              : r.ap.status === "paid"
                ? <div className="sbox done">AP<span className="mk">✓</span></div>
                : <div className="sbox revise">AP<span className="mk">!</span></div>}
          <div className={"sbox" + (r.issuedAt ? " done" : "")}>ISS<span className="mk">{r.issuedAt ? "✓" : "—"}</span></div>
          <div className={"sbox" + (r.invoicedAt ? " done" : "")}>INV<span className="mk">{r.invoicedAt ? "✓" : "—"}</span></div>
        </div>
      </td>
    </tr>
  );
}

export function SpvView({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const { records, now } = useStore();
  const [tab, setTab]       = useState<"active" | "archive">("active");
  const [staffFilter, setStaffFilter] = useState<string>("all");

  const active  = records.filter((r) => stage(r) !== "done");
  const archive = records.filter((r) => stage(r) === "done");
  const urgent  = active.filter((r) => r.urgent);

  const base = tab === "active" ? [...active].sort(sortWork) : [...archive].sort((a, b) => (b.invoicedAt ?? 0) - (a.invoicedAt ?? 0));
  const list = base
    .filter((r) => staffFilter === "all" || r.staff === staffFilter)
    .filter((r) => matchesQuery(r, query));

  const staffCounts = STAFF.map((s) => ({
    s,
    count: (tab === "active" ? active : archive).filter((r) => r.staff === s).length,
  })).filter((x) => x.count > 0);

  const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

  return (
    <>
      <div className="view-head">
        <div className="grow">
          <h1>Pantauan Tim</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat"><div className={"stat-n" + (urgent.length > 0 ? " amber" : "")}>{urgent.length}</div><div className="stat-label">Urgent aktif</div></div>
        <div className="stat"><div className="stat-n">{active.length}</div><div className="stat-label">Total tugas aktif</div></div>
        <div className="stat"><div className="stat-n blue">{STAFF.length}</div><div className="stat-label">Staf dalam tim</div></div>
      </div>

      {/* Active / Archive tabs */}
      <div className="view-tabs">
        <button className={tab === "active" ? "active" : ""} onClick={() => { setTab("active"); setStaffFilter("all"); }}>
          Active <span className="tc">{active.length}</span>
        </button>
        <button className={tab === "archive" ? "active" : ""} onClick={() => { setTab("archive"); setStaffFilter("all"); }}>
          Archive <span className="tc">{archive.length}</span>
        </button>
      </div>

      {/* Staff filter pills */}
      <div className="staff-pills">
        <button className={"staff-pill" + (staffFilter === "all" ? " active" : "")} onClick={() => setStaffFilter("all")}>
          All staff ({(tab === "active" ? active : archive).length})
        </button>
        {staffCounts.map(({ s, count }) => (
          <button
            key={s}
            className={"staff-pill" + (staffFilter === s ? " active" : "")}
            onClick={() => setStaffFilter(staffFilter === s ? "all" : s)}
          >
            {cap(s)} ({count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="filters">
        <input
          className="filter-search"
          type="search"
          placeholder="⌕  Cari di semua staf…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cari"
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="tk">
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "31%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "17%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Staf</th>
              <th>Penumpang / Perusahaan</th>
              <th>Produk</th>
              <th>Rute / Kode</th>
              <th className="tr">Nominal</th>
              <th className="tc">Status (AP · ISS · INV)</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => <TeamTableRow key={r.id} r={r} now={now} />)}
          </tbody>
        </table>
        {list.length === 0 && (
          <div className="empty">
            <b>{query ? "Tidak ada yang cocok" : tab === "active" ? "Semua tugas selesai!" : "Belum ada arsip"}</b>
            {!query && tab === "active" && "Buat entri baru untuk memulai."}
          </div>
        )}
      </div>
    </>
  );
}
