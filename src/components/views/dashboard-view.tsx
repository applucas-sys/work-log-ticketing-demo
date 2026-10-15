"use client";

import { rp } from "@/lib/format";
import { STAFF } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { needsStaffAction, sortWork, stage, stuckReason } from "@/lib/workflow";
import { StatCards } from "../bits";
import { IconPlus } from "../icons";
import { TeamRow, TeamHead } from "../rows";
import { useUi } from "../ui-context";
export function DashboardView({ me, onNavigate }: { me: string; onNavigate: (v: string) => void }) {
  const { records, now } = useStore();
  const { openNew } = useUi();

  const active = records.filter((r) => stage(r) !== "done");
  const urgent = active.filter((r) => r.urgent);
  const apQueue = records.filter((r) => r.ap?.status === "waiting");
  const uninvoiced = records.filter((r) => stage(r) === "toinvoice");
  const totalApPending = apQueue.reduce((s, r) => s + r.amount, 0);

  const stuck = active
    .filter((r) => stuckReason(r, now))
    .sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.createdAt - b.createdAt)
    .slice(0, 6);

  const myTasks = records.filter((r) => r.staff === me && needsStaffAction(r)).length;

  const team = STAFF.map((s) => {
    const m = records.filter((r) => r.staff === s && stage(r) !== "done");
    return {
      s,
      active: m.length,
      need: m.filter(needsStaffAction).length,
      wait: m.filter((r) => stage(r) === "waitap").length,
      inv: m.filter((r) => stage(r) === "toinvoice").length,
      stuck: m.filter((r) => stuckReason(r, now)).length,
    };
  }).filter((t) => t.active > 0 || t.stuck > 0);

  return (
    <>
      <div className="head">
        <div className="grow">
          <h1>Beranda</h1>
          <p>
            Ringkasan seluruh tim.{" "}
            {myTasks > 0 ? (
              <>
                <b className="text-urgent">{myTasks} tugas</b> menunggu tindakan kamu.{" "}
                <button className="copy" onClick={() => onNavigate("staff")}>Lihat tugas saya →</button>
              </>
            ) : (
              "Tidak ada tugas yang menunggu tindakan kamu."
            )}
          </p>
        </div>
        <button className="btn primary" onClick={openNew}>
          <IconPlus />
          Entri baru
        </button>
      </div>

      <StatCards items={[
        { n: active.length, label: "Total tugas aktif" },
        { n: urgent.length, label: "Urgent terbuka", accent: urgent.length > 0 ? "red" : undefined },
        { n: apQueue.length, label: "Antrian pembayaran AP", accent: apQueue.length > 0 ? "amber" : undefined, sub: apQueue.length > 0 ? rp(totalApPending) : undefined },
        { n: uninvoiced.length, label: "Issued belum invoice", accent: uninvoiced.length > 0 ? "blue" : undefined },
      ]} />

      {team.length > 0 && (
        <div className="panel" style={{ marginBottom: 22 }}>
          <h2>Status per staf</h2>
          <table className="t">
            <thead>
              <tr>
                <th>Staf</th>
                <th className="num">Aktif</th>
                <th className="num">Perlu tindakan</th>
                <th className="num">Menunggu AP</th>
                <th className="num">Siap invoice</th>
                <th className="num">Nyangkut</th>
              </tr>
            </thead>
            <tbody>
              {team.map((t) => (
                <tr key={t.s} className="click" onClick={() => onNavigate("staff")}>
                  <td>
                    <span className="staff-dot" style={{ background: staffColor(t.s) }} />
                    <b>{t.s}</b>
                  </td>
                  <td className="num">{t.active}</td>
                  <td className="num">{t.need > 0 ? <span className="tag blue">{t.need}</span> : <span className="faint">0</span>}</td>
                  <td className="num">{t.wait > 0 ? <span className="tag amber">{t.wait}</span> : <span className="faint">0</span>}</td>
                  <td className="num">{t.inv > 0 ? <span className="tag green">{t.inv}</span> : <span className="faint">0</span>}</td>
                  <td className="num">{t.stuck > 0 ? <span className="tag red">{t.stuck}</span> : <span className="faint">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stuck.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Tugas nyangkut</h2>
            <span className="tag red">{stuck.length}</span>
            <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => onNavigate("spv")}>
              Lihat semua →
            </button>
          </div>
          <div className="sheet">
            <TeamHead statusLabel="Kenapa nyangkut" />
            {stuck.map((r) => (
              <TeamRow
                key={r.id}
                r={r}
                extra={<div className="sub wrap reason">{stuckReason(r, now)}</div>}
              />
            ))}
          </div>
        </>
      )}

      {stuck.length === 0 && active.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Tugas aktif terbaru</h2>
            <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => onNavigate("spv")}>
              Lihat semua →
            </button>
          </div>
          <div className="sheet">
            <TeamHead statusLabel="Status" />
            {[...active].sort(sortWork).slice(0, 5).map((r) => (
              <TeamRow key={r.id} r={r} extra={null} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

const STAFF_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
function staffColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % STAFF_COLORS.length;
  return STAFF_COLORS[h];
}
