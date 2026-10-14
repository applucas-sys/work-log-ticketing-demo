import { STUCK } from "./constants";
import { dur } from "./format";
import type { PipState, Reservation, Stage } from "./types";

/** Where a reservation is in the flow: reserve, (pay via AP), issue, invoice. */
export function stage(r: Reservation): Stage {
  if (r.invoicedAt) return "done";
  if (r.issuedAt) return "toinvoice";
  if (r.pay === "ap" && r.ap) {
    if (r.ap.status === "waiting") return "waitap";
    if (r.ap.status === "revise") return "revise";
  }
  return "toissue";
}

/** Stages where the ticketing staff member has to do something. */
export const needsStaffAction = (r: Reservation) => ["toissue", "toinvoice", "revise"].includes(stage(r));

export const isUrgentOpen = (r: Reservation) => r.urgent && !r.issuedAt;

/** The three boxes from the client's sketch: Issued, Bayar AP, Invoice. */
export function pipStates(r: Reservation): [PipState, PipState, PipState] {
  const issued: PipState = r.issuedAt ? "done" : "todo";
  let ap: PipState = "na";
  if (r.pay === "ap" && r.ap) ap = r.ap.status === "waiting" ? "wait" : r.ap.status === "paid" ? "paid" : "revise";
  const invoiced: PipState = r.invoicedAt ? "done" : "todo";
  return [issued, ap, invoiced];
}

export function apLabel(r: Reservation): string {
  if (r.pay !== "ap" || !r.ap) return "Bayar pakai deposit vendor";
  return { waiting: "Menunggu AP", paid: "Dibayar AP", revise: "Dikembalikan AP" }[r.ap.status];
}

/** Returns a human reason when SPV should look at this record, or "" if it is fine. */
export function stuckReason(r: Reservation, now: number): string {
  const s = stage(r);
  if (s === "waitap" && r.ap) {
    const waited = now - r.ap.requestedAt;
    if (r.urgent) return "Urgent, belum dibayar AP " + dur(waited);
    if (waited > STUCK.waitingApMs) return "Menunggu AP " + dur(waited);
  }
  if (s === "revise") return "Dikembalikan AP, belum diperbaiki";
  if (s === "toissue" && r.pay === "ap" && r.ap?.paidAt && now - r.ap.paidAt > STUCK.paidNotIssuedMs)
    return "Sudah dibayar " + dur(now - r.ap.paidAt) + ", belum issued";
  if (s === "toissue" && r.ttl && r.ttl - now < STUCK.ttlWarnMs) return "TTL tinggal " + dur(r.ttl - now) + ", belum issued";
  if (s === "toinvoice" && r.issuedAt && now - r.issuedAt > STUCK.issuedNotInvoicedMs)
    return "Issued " + dur(now - r.issuedAt) + ", belum invoice";
  return "";
}

/** Work log order: open urgent items first, then newest first. */
export function sortWork(a: Reservation, b: Reservation): number {
  const au = isUrgentOpen(a) ? 1 : 0;
  const bu = isUrgentOpen(b) ? 1 : 0;
  if (au !== bu) return bu - au;
  return b.createdAt - a.createdAt;
}

/** AP queue order: urgent, then nearest TTL, then oldest request. */
export function sortApQueue(a: Reservation, b: Reservation): number {
  return (
    Number(b.urgent) - Number(a.urgent) ||
    (a.ttl ?? Number.MAX_SAFE_INTEGER) - (b.ttl ?? Number.MAX_SAFE_INTEGER) ||
    (a.ap?.requestedAt ?? 0) - (b.ap?.requestedAt ?? 0)
  );
}

export function matchesQuery(r: Reservation, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [r.id, r.company, r.pnr, r.ticketNo, r.vendor, r.route, r.staff, ...r.pax].join(" ").toLowerCase().includes(s);
}
