"use client";

import { useState } from "react";
import { PRODUCTS } from "@/lib/constants";
import { D, dur, fmtDateTime, rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Reservation } from "@/lib/types";
import { matchesQuery, stage } from "@/lib/workflow";
import { Empty, SearchBox, StatCards } from "../bits";
import { IconDownload } from "../icons";
import { TeamHead, TeamRow } from "../rows";
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
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = "belum-invoice.csv";
  a.click();
}

export function FinanceView({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const { records, now } = useStore();
  const { toast } = useUi();
  const [bucket, setBucket] = useState<Bucket>("all");

  const age = (r: Reservation) => now - (r.issuedAt ?? now);
  const inBucket = (r: Reservation, b: Bucket) => {
    const a = age(r);
    return b === "all" || (b === "0" && a < D) || (b === "1" && a >= D && a < 3 * D) || (b === "3" && a >= 3 * D);
  };

  const uninvoiced = records.filter((r) => stage(r) === "toinvoice");
  const list = uninvoiced.filter((r) => inBucket(r, bucket) && matchesQuery(r, query)).sort((a, b) => (a.issuedAt ?? 0) - (b.issuedAt ?? 0));
  const total = uninvoiced.reduce((s, r) => s + r.amount, 0);
  const oldest = uninvoiced.length ? Math.max(...uninvoiced.map(age)) : 0;

  const byCompany = new Map<string, { n: number; sum: number; old: number; staff: Set<string> }>();
  for (const r of list) {
    const c = byCompany.get(r.company) ?? { n: 0, sum: 0, old: 0, staff: new Set<string>() };
    c.n++;
    c.sum += r.amount;
    c.old = Math.max(c.old, age(r));
    c.staff.add(r.staff);
    byCompany.set(r.company, c);
  }
  const companies = [...byCompany.entries()].sort((a, b) => b[1].sum - a[1].sum);

  const paidThisWeek = records.filter((r) => r.ap?.status === "paid" && r.ap.paidAt && now - r.ap.paidAt < 7 * D).reduce((s, r) => s + r.amount, 0);
  const apInProgress = records.filter((r) => r.ap && r.ap.status !== "paid" && !r.issuedAt).reduce((s, r) => s + r.amount, 0);

  const buckets: [Bucket, string][] = [
    ["all", "Semua"],
    ["0", "Kurang dari 1 hari"],
    ["1", "1 sampai 3 hari"],
    ["3", "Lebih dari 3 hari"],
  ];

  return (
    <>
      <div className="head">
        <div className="grow">
          <h1>Tiket issued belum diinvoice</h1>
          <p>
            <b>{uninvoiced.length}</b> reservasi senilai <b>{rp(total)}</b> sudah issued tapi belum ditagihkan ke customer
            {uninvoiced.length > 0 && <>, paling lama {dur(oldest)}</>}. Minggu ini AP sudah membayar <b>{rp(paidThisWeek)}</b> ke vendor, dan{" "}
            <b>{rp(apInProgress)}</b> masih dalam proses.
          </p>
        </div>
        <button
          className="btn"
          onClick={() => {
            downloadCsv(uninvoiced);
            toast("CSV belum invoice diunduh.");
          }}
        >
          <IconDownload />
          Unduh CSV
        </button>
      </div>
      <StatCards items={[
        { n: uninvoiced.length, label: "Belum diinvoice", accent: uninvoiced.length > 0 ? "red" : undefined },
        { n: rp(total), label: "Total piutang aktif", accent: total > 0 ? "amber" : undefined },
        { n: rp(paidThisWeek), label: "AP dibayar minggu ini", accent: "green" },
        { n: rp(apInProgress), label: "AP sedang dalam proses", accent: apInProgress > 0 ? "blue" : undefined },
      ]} />

      <div className="bucket" role="group" aria-label="Umur sejak issued">
        {buckets.map(([k, l]) => (
          <button key={k} aria-pressed={bucket === k} onClick={() => setBucket(k)}>
            {l} ({uninvoiced.filter((r) => inBucket(r, k)).length})
          </button>
        ))}
      </div>

      <div className="panel">
        <h2>Per perusahaan</h2>
        <table className="t">
          <thead>
            <tr>
              <th>Perusahaan</th>
              <th className="num">Reservasi</th>
              <th className="num">Nilai</th>
              <th className="num">Paling lama</th>
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
            {companies.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">Tidak ada data di rentang ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Cari perusahaan, pax, PNR" />
      </div>
      <div className="sheet">
        <TeamHead statusLabel="Issued" timeLabel="" />
        {list.map((r) => (
          <TeamRow
            key={r.id}
            r={r}
            showAge={false}
            extra={
              <>
                <div>{r.issuedAt ? fmtDateTime(r.issuedAt) : ""}</div>
                <div className="sub">{dur(age(r))} lalu</div>
              </>
            }
          />
        ))}
        {list.length === 0 && <Empty title="Semua sudah diinvoice">Tidak ada piutang yang tertinggal di rentang ini.</Empty>}
      </div>
    </>
  );
}
