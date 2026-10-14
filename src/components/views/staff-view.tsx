"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { matchesQuery, needsStaffAction, sortWork, stage } from "@/lib/workflow";
import { Empty, Legend, SearchBox, Tabs } from "../bits";
import { IconPlus } from "../icons";
import { StaffHead, StaffRow } from "../rows";
import { useUi } from "../ui-context";

export function StaffView({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const { records } = useStore();
  const { me, openNew } = useUi();
  const [tab, setTab] = useState<"active" | "archive">("active");

  const mine = records.filter((r) => r.staff === me);
  const active = mine.filter((r) => stage(r) !== "done");
  const archive = mine.filter((r) => stage(r) === "done");
  const list = (tab === "active" ? [...active].sort(sortWork) : [...archive].sort((a, b) => (b.invoicedAt ?? 0) - (a.invoicedAt ?? 0))).filter((r) =>
    matchesQuery(r, query),
  );
  const need = active.filter(needsStaffAction).length;
  const wait = active.filter((r) => stage(r) === "waitap").length;
  const name = me.charAt(0) + me.slice(1).toLowerCase();

  return (
    <>
      <div className="head">
        <div className="grow">
          <h1>Work log {name}</h1>
          <p>
            {need ? <><b>{need}</b> tugas menunggu langkah kamu</> : "Tidak ada tugas yang menunggu kamu"}
            {wait > 0 && <>, <b>{wait}</b> menunggu pembayaran AP</>}. Urgent selalu di atas, sisanya urut dari yang terbaru.
          </p>
        </div>
        <button className="btn primary" onClick={openNew}>
          <IconPlus />
          Entri baru
        </button>
      </div>
      <div className="toolbar">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "active", label: "Aktif", count: active.length },
            { id: "archive", label: "Arsip", count: archive.length },
          ]}
        />
        <SearchBox value={query} onChange={setQuery} placeholder="Cari pax, perusahaan, PNR" />
      </div>
      <div className="sheet">
        <StaffHead />
        {list.map((r) => <StaffRow key={r.id} r={r} />)}
        {list.length === 0 &&
          (tab === "active" ? (
            <Empty title={query ? "Tidak ada yang cocok" : "Semua beres"}>{query ? "Coba kata kunci lain." : "Buat entri baru saat ada reservasi masuk."}</Empty>
          ) : (
            <Empty title="Arsip masih kosong">Reservasi yang sudah diinvoice pindah ke sini.</Empty>
          ))}
      </div>
      <Legend />
    </>
  );
}
