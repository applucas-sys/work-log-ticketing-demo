"use client";

import { useState } from "react";
import { PRODUCTS } from "@/lib/constants";
import { D, dur, fmtDateTime, rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Reservation } from "@/lib/types";
import { matchesQuery, stage } from "@/lib/workflow";
import { IconDownload } from "../icons";
import { useUi } from "../ui-context";

type Bucket = "all" | "0" | "1" | "3";

function downloadCsv(rows: Reservation[]) {
  const head = ["ID", "Staf", "Perusahaan", "Pax", "Produk", "Vendor", "Maskapai", "PNR", "No tiket", "Rute", "Nilai", "Issued", "Cara bayar"];
  const body = rows.map((r) => [
    r.id, r.staff, r.company, r.pax.join("; "), PRODUCTS[r.product], r.vendor, r.carrier, r.pnr, r.ticketNo, r.route, r.amount,
    r.issuedAt ? new Date(r.issuedAt).toISOString() : "", r.pay === "ap" ? "Via AP" : "Deposit vendor",
  ]);
  const csv = [head, ...body].map((row) => row.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = "belum-invoice.csv";
  a.click();
}

export function FinanceView({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const { records, now } = useStore();
  const { toast, openDetail } = useUi();
  const [bucket, setBucket] = useState<Bucket>("all");

  const age = (r: Reservation) => now - (r.issuedAt ?? now);
  const inBucket = (r: Reservation, b: Bucket) => {
    const a = age(r);
    return b === "all" || (b === "0" && a < D) || (b === "1" && a >= D && a < 3 * D) || (b === "3" && a >= 3 * D);
  };

  const uninvoiced = records.filter((r) => stage(r) === "toinvoice");
  const list = uninvoiced
    .filter((r) => inBucket(r, bucket) && matchesQuery(r, query))
    .sort((a, b) => (a.issuedAt ?? 0) - (b.issuedAt ?? 0));

  const total    = uninvoiced.reduce((s, r) => s + r.amount, 0);
  const paidWeek = records.filter((r) => r.ap?.status === "paid" && r.ap.paidAt && now - r.ap.paidAt < 7 * D).reduce((s, r) => s + r.amount, 0);
  const apProc   = records.filter((r) => r.ap && r.ap.status !== "paid" && !r.issuedAt).reduce((s, r) => s + r.amount, 0);

  const byCompany = new Map<string, { n: number; sum: number; old: number; staff: Set<string> }>();
  for (const r of list) {
    const c = byCompany.get(r.company) ?? { n: 0, sum: 0, old: 0, staff: new Set<string>() };
    c.n++; c.sum += r.amount; c.old = Math.max(c.old, age(r)); c.staff.add(r.staff);
    byCompany.set(r.company, c);
  }
  const companies = [...byCompany.entries()].sort((a, b) => b[1].sum - a[1].sum);

  const buckets: [Bucket, string][] = [
    ["all", "Semua"],
    ["0", "< 1 hari"],
    ["1", "1–3 hari"],
    ["3", "> 3 hari"],
  ];

  return (
    <>
      <div className="view-head">
        <div className="grow">
          <h1>Dashboard Laporan Keuangan</h1>
        </div>
        <button className="btn" onClick={() => { downloadCsv(uninvoiced); toast("CSV belum invoice diunduh."); }}>
          <IconDownload /> Unduh CSV
        </button>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat"><div className={"stat-n" + (uninvoiced.length > 0 ? " red" : "")}>{uninvoiced.length}</div><div className="stat-label">Belum diinvoice</div></div>
        <div className="stat"><div className={"stat-n" + (total > 0 ? " amber" : "")} style={{ fontSize: 16 }}>{rp(total)}</div><div className="stat-label">Total piutang aktif</div></div>
        <div className="stat"><div className="stat-n green" style={{ fontSize: 16 }}>{rp(paidWeek)}</div><div className="stat-label">AP dibayar minggu ini</div></div>
        <div className="stat"><div className={"stat-n" + (apProc > 0 ? " blue" : "")} style={{ fontSize: 16 }}>{rp(apProc)}</div><div className="stat-label">AP sedang dalam proses</div></div>
      </div>

      {/* Per-company panel */}
      {companies.length > 0 && (
        <div className="panel">
          <h2>Per Perusahaan</h2>
          <table className="t">
            <thead>
              <tr>
                <th>Perusahaan</th>
                <th className="num">Reservasi</th>
                <th className="num">Nilai</th>
                <th className="num">Paling Lama</th>
                <th>Staf</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(([name, c]) => (
                <tr key={name} className="click" onClick={() => setQuery(name)}>
                  <td><b>{name}</b></td>
                  <td className="num">{c.n}</td>
                  <td className="num amt">{rp(c.sum)}</td>
                  <td className="num">{c.old > 3 * D ? <span className="tag red">{dur(c.old)}</span> : dur(c.old)}</td>
                  <td>{[...c.staff].join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bucket filter */}
      <div className="bucket" role="group" aria-label="Umur sejak issued">
        {buckets.map(([k, l]) => (
          <button key={k} aria-pressed={bucket === k} onClick={() => setBucket(k)}>
            {l} ({uninvoiced.filter((r) => inBucket(r, k)).length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="filters">
        <input
          className="filter-search"
          type="search"
          placeholder="⌕  Cari perusahaan, pax, PNR…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="tk">
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Staf</th>
              <th>Penumpang / Perusahaan</th>
              <th>Produk</th>
              <th>Rute / Kode</th>
              <th className="tr">Nilai</th>
              <th>Issued</th>
              <th className="tc">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="click" onClick={() => openDetail(r.id)}>
                <td><span style={{ fontWeight: 800, fontSize: 12 }}>{r.staff}</span></td>
                <td>
                  <div className="pax-name">{r.pax[0] ?? r.company}{r.pax.length > 1 ? ` +${r.pax.length - 1}` : ""}</div>
                  <div className="pax-co">{r.company}</div>
                </td>
                <td><span className="prod-tag">{PRODUCTS[r.product]}</span></td>
                <td>
                  <div className="route-main">{r.route || "—"}</div>
                  <div className="route-sub">{r.pnr} ({r.carrier})</div>
                </td>
                <td className="tr"><span className="amt">{rp(r.amount)}</span></td>
                <td>
                  <div style={{ fontSize: 12 }}>{r.issuedAt ? fmtDateTime(r.issuedAt) : "—"}</div>
                  {r.issuedAt && <div className="route-sub">{dur(age(r))} lalu</div>}
                </td>
                <td className="tc">
                  <div className="sboxes">
                    <div className="sbox done">ISS<span className="mk">✓</span></div>
                    <div className="sbox">INV<span className="mk">—</span></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <div className="empty">
            <b>Semua sudah diinvoice</b>
            Tidak ada piutang yang tertinggal di rentang ini.
          </div>
        )}
      </div>
    </>
  );
}
