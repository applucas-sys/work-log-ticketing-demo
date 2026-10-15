"use client";

import { useState } from "react";
import { STAFF } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { needsStaffAction, sortWork, stage, stuckReason } from "@/lib/workflow";
import type { Reservation } from "@/lib/types";
import { StatCards } from "../bits";
import { IconCheck, IconClock, IconPlus } from "../icons";
import { useUi } from "../ui-context";

const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function DashboardView({ me, onNavigate }: { me: string; onNavigate: (v: string) => void }) {
  const { records, now } = useStore();
  const { openNew, openDetail } = useUi();
  const [staffFilter, setStaffFilter] = useState<string>("all");

  // today's midnight in local time
  const todayMs = new Date(now).setHours(0, 0, 0, 0);

  // Visible rows: all active + today's completed (for same-day visibility before archive)
  const visible = records.filter((r) => {
    const s = stage(r);
    if (s !== "done") return true;
    return r.invoicedAt != null && r.invoicedAt >= todayMs;
  });

  const active = records.filter((r) => stage(r) !== "done");
  const waitap = active.filter((r) => stage(r) === "waitap");
  const toissue = active.filter((r) => stage(r) === "toissue");
  const toinvoice = active.filter((r) => stage(r) === "toinvoice");
  const doneToday = visible.filter((r) => stage(r) === "done");

  const myTasks = records.filter((r) => r.staff === me && needsStaffAction(r)).length;

  // Staff tabs: only staff who have visible records
  const staffCounts = STAFF.map((s) => ({
    s,
    count: visible.filter((r) => r.staff === s).length,
  })).filter((x) => x.count > 0);

  const filtered = staffFilter === "all" ? visible : visible.filter((r) => r.staff === staffFilter);
  const sorted = [...filtered].sort(sortWork);

  return (
    <>
      <div className="head">
        <div className="grow">
          <h1>Beranda</h1>
          {myTasks > 0 && (
            <p>
              <b className="text-urgent">{myTasks} tugas</b> menunggu tindakan kamu.{" "}
              <button className="copy" onClick={() => onNavigate("staff")}>Lihat tugas saya →</button>
            </p>
          )}
        </div>
        <button className="btn primary" onClick={openNew}>
          <IconPlus />
          Entri baru
        </button>
      </div>

      <StatCards items={[
        { n: waitap.length,    label: "Waiting for AP",        accent: waitap.length > 0    ? "amber" : undefined },
        { n: toissue.length,   label: "Ready to issue",        accent: toissue.length > 0   ? "blue"  : undefined },
        { n: toinvoice.length, label: "Issued, not invoiced",  accent: toinvoice.length > 0 ? "green" : undefined },
        { n: doneToday.length, label: "Done today" },
      ]} />

      {/* Staff filter pills */}
      <div className="dash-tabs">
        <button
          className={"dash-tab" + (staffFilter === "all" ? " active" : "")}
          onClick={() => setStaffFilter("all")}
        >
          All staff ({visible.length})
        </button>
        {staffCounts.map(({ s, count }) => (
          <button
            key={s}
            className={"dash-tab" + (staffFilter === s ? " active" : "")}
            onClick={() => setStaffFilter(staffFilter === s ? "all" : s)}
          >
            {cap(s)} ({count})
          </button>
        ))}
      </div>

      {/* Main status table */}
      <div className="dash-table-wrap">
        {sorted.length === 0 ? (
          <div className="empty"><b>Tidak ada data</b>Semua tugas sudah selesai hari ini.</div>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Reservation and next step</th>
                <th>Staff</th>
                <th>Bayar AP</th>
                <th>Issued</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <DashRow key={r.id} r={r} now={now} onClick={() => openDetail(r.id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function DashRow({ r, now, onClick }: { r: Reservation; now: number; onClick: () => void }) {
  const s = stage(r);
  const isDone = s === "done";
  const stuck = !isDone ? stuckReason(r, now) : "";

  let nextText = "";
  let nextCls = "";
  if (isDone) {
    nextText = "Done, moved to archive";
    nextCls = "next-done";
  } else if (stuck) {
    nextText = stuck;
    nextCls = "next-stuck";
  } else if (s === "waitap") {
    nextText = "Next: AP transfers to vendor";
    nextCls = "next-wait";
  } else if (s === "revise") {
    nextText = "Next: Staff updates AP request";
    nextCls = "next-stuck";
  } else if (s === "toissue") {
    nextText = "Next: Staff issues ticket";
    nextCls = "next-action";
  } else if (s === "toinvoice") {
    nextText = "Next: Staff invoices customer";
    nextCls = "next-action";
  }

  const paxName = r.pax[0] ?? r.company;
  const extraPax = r.pax.length > 1 ? ` +${r.pax.length - 1}` : "";

  let apCell: React.ReactNode;
  if (r.pay !== "ap" || !r.ap) {
    apCell = <span className="dash-na">— Deposit</span>;
  } else if (r.ap.status === "waiting") {
    apCell = <span className="dash-waiting"><IconClock /> Waiting</span>;
  } else if (r.ap.status === "paid") {
    apCell = <span className="dash-paid"><IconCheck /> Paid</span>;
  } else {
    apCell = <span className="dash-revise"><IconClock /> Revise</span>;
  }

  return (
    <tr
      className={"dash-row" + (r.urgent && !isDone ? " urgent" : "") + (isDone ? " done" : "")}
      onClick={onClick}
    >
      <td className="col-res">
        <div className="dash-pax">
          <b>{paxName}{extraPax}</b>
          {r.urgent && !isDone && <span className="urgent-badge">Urgent</span>}
        </div>
        <div className="dash-sub">{r.company} · {r.carrier} {r.route} · {r.pnr}</div>
        <div className={"dash-next " + nextCls}>{nextText}</div>
      </td>
      <td className="col-staff"><b>{r.staff}</b></td>
      <td className="col-status">{apCell}</td>
      <td className="col-status">
        {r.issuedAt
          ? <span className="dash-paid"><IconCheck /> Issued</span>
          : <span className="dash-notyet">Not yet</span>}
      </td>
      <td className="col-status">
        {r.invoicedAt
          ? <span className="dash-paid"><IconCheck /> Invoiced</span>
          : <span className="dash-notyet">Not yet</span>}
      </td>
    </tr>
  );
}
