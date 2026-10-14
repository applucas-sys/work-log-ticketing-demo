"use client";

import { useState } from "react";
import { STAFF } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { matchesQuery, sortWork, stage, stuckReason } from "@/lib/workflow";
import { Empty, Legend, SearchBox, StageTag, Tabs, stop } from "../bits";
import { TeamHead, TeamRow } from "../rows";
import { useUi } from "../ui-context";

export function SpvView({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const { records, now, actions } = useStore();
  const { toast, actor } = useUi();
  const [tab, setTab] = useState<"stuck" | "all">("stuck");
  const [staff, setStaff] = useState<string>("all");

  const stuck = records
    .filter((r) => stuckReason(r, now))
    .sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.createdAt - b.createdAt);

  const team = STAFF.map((s) => {
    const m = records.filter((r) => r.staff === s && stage(r) !== "done");
    return {
      s,
      active: m.length,
      wait: m.filter((r) => stage(r) === "waitap").length,
      inv: m.filter((r) => stage(r) === "toinvoice").length,
      stuck: m.filter((r) => stuckReason(r, now)).length,
    };
  });

  let list = tab === "stuck" ? stuck : records.filter((r) => stage(r) !== "done").sort(sortWork);
  if (staff !== "all") list = list.filter((r) => r.staff === staff);
  list = list.filter((r) => matchesQuery(r, query));

  const nudge = (id: string, who: string, pnr: string) => {
    actions.log(id, actor, "Mengirim pengingat");
    toast(`Pengingat dikirim ke ${who} untuk ${pnr}.`);
  };

  return (
    <>
      <div className="head">
        <div className="grow">
          <h1>Pantauan tim ticketing</h1>
          <p>
            {stuck.length ? <><b>{stuck.length}</b> tugas nyangkut dan perlu ditindaklanjuti.</> : "Tidak ada tugas nyangkut."} Nyangkut berarti menunggu AP lebih
            dari 2 jam, sudah dibayar tapi belum issued, TTL kurang dari 3 jam, atau issued lebih dari 1 hari tanpa invoice.
          </p>
        </div>
      </div>

      <div className="panel">
        <table className="t">
          <thead>
            <tr>
              <th>Staf</th>
              <th className="num">Aktif</th>
              <th className="num">Menunggu AP</th>
              <th className="num">Belum invoice</th>
              <th className="num">Nyangkut</th>
            </tr>
          </thead>
          <tbody>
            {team.map((t) => (
              <tr
                key={t.s}
                className={"click" + (staff === t.s ? " selected" : "")}
                onClick={() => setStaff(staff === t.s ? "all" : t.s)}
              >
                <td><b>{t.s}</b></td>
                <td className="num">{t.active}</td>
                <td className="num">{t.wait}</td>
                <td className="num">{t.inv}</td>
                <td className="num">{t.stuck ? <span className="tag red">{t.stuck}</span> : <span className="faint">0</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="toolbar">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "stuck", label: "Nyangkut", count: stuck.length, hot: stuck.length > 0 },
            { id: "all", label: "Semua tugas aktif" },
          ]}
        />
        {staff !== "all" && (
          <button className="btn sm" onClick={() => setStaff("all")}>
            Filter: {staff} &times;
          </button>
        )}
        <SearchBox value={query} onChange={setQuery} placeholder="Cari di semua staf" />
      </div>

      <div className="sheet">
        <TeamHead statusLabel={tab === "stuck" ? "Kenapa nyangkut" : "Status"} />
        {list.map((r) => (
          <TeamRow
            key={r.id}
            r={r}
            extra={
              tab === "stuck" ? (
                <>
                  <div className="sub wrap reason">{stuckReason(r, now)}</div>
                  <button className="btn sm" style={{ marginTop: 6 }} onClick={(e) => { stop(e); nudge(r.id, r.staff, r.pnr); }}>
                    Ingatkan {r.staff}
                  </button>
                </>
              ) : (
                <StageTag r={r} />
              )
            }
          />
        ))}
        {list.length === 0 && <Empty title="Tidak ada yang nyangkut">Semua tugas tim berjalan sesuai waktu.</Empty>}
      </div>
      <Legend />
    </>
  );
}
