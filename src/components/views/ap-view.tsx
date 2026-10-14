"use client";

import { useState } from "react";
import { rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import { matchesQuery, sortApQueue } from "@/lib/workflow";
import { Empty, SearchBox, Tabs } from "../bits";
import { ApHead, ApRow } from "../rows";

export function ApView({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const { records } = useStore();
  const [tab, setTab] = useState<"queue" | "paid" | "back">("queue");

  const all = records.filter((r) => r.pay === "ap" && r.ap);
  const queue = all.filter((r) => r.ap!.status === "waiting").sort(sortApQueue);
  const paid = all.filter((r) => r.ap!.status === "paid").sort((a, b) => (b.ap!.paidAt ?? 0) - (a.ap!.paidAt ?? 0));
  const back = all.filter((r) => r.ap!.status === "revise");
  const list = (tab === "queue" ? queue : tab === "paid" ? paid : back).filter((r) => matchesQuery(r, query));
  const total = queue.reduce((s, r) => s + r.amount, 0);
  const urgent = queue.filter((r) => r.urgent).length;

  return (
    <>
      <div className="head">
        <div className="grow">
          <h1>Permintaan pembayaran</h1>
          <p>
            {queue.length ? (
              <>
                <b>{queue.length}</b> permintaan menunggu, total <b>{rp(total)}</b>.
                {urgent > 0 && <> <b className="text-urgent">{urgent} urgent</b> ada di paling atas.</>} Setelah bayar, unggah bukti transfer supaya staf bisa
                langsung issue.
              </>
            ) : (
              "Antrian kosong. Permintaan baru dari staf ticketing akan muncul di sini."
            )}
          </p>
        </div>
      </div>
      <div className="toolbar">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "queue", label: "Antrian", count: queue.length, hot: urgent > 0 },
            { id: "paid", label: "Sudah dibayar", count: paid.length },
            { id: "back", label: "Dikembalikan", count: back.length },
          ]}
        />
        <SearchBox value={query} onChange={setQuery} placeholder="Cari pax, vendor, PNR, staf" />
      </div>
      <div className="sheet">
        <ApHead />
        {list.map((r) => <ApRow key={r.id} r={r} />)}
        {list.length === 0 && (
          <Empty title={tab === "queue" ? "Tidak ada permintaan menunggu" : "Belum ada data"}>{tab === "queue" ? "Semua permintaan sudah dibayar." : null}</Empty>
        )}
      </div>
    </>
  );
}
