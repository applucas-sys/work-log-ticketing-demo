"use client";

/**
 * Mock data store. Everything lives in React state and resets on reload.
 *
 * When the backend is ready, keep this context API (records + actions) and
 * swap the reducer calls for fetch/server-action calls. The components do not
 * need to change.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { makeSeedCompanies, makeSeedRecords, SEED_START_SEQ } from "./seed";
import type { CompanyEntry, FileRef, NewReservationInput, PassengerEntry, Reservation } from "./types";

interface State {
  records: Reservation[];
  seq: number;
  baseCompanies: CompanyEntry[];
}

type Action =
  | { type: "init"; now: number }
  | { type: "create"; input: NewReservationInput; staff: string; at: number }
  | { type: "issue"; id: string; ticketNo: string; issuedAt: number; at: number }
  | { type: "invoice"; id: string; invoiceNo: string; at: number }
  | { type: "pay"; id: string; proof: FileRef; by: string; at: number }
  | { type: "revise"; id: string; note: string; by: string; at: number }
  | { type: "resubmit"; id: string; at: number }
  | { type: "replaceInvoice"; id: string; file: FileRef; at: number }
  | { type: "toggleUrgent"; id: string; at: number }
  | { type: "log"; id: string; who: string; msg: string; at: number }
  | { type: "editFields"; id: string; patch: EditPatch; who: string; postPayment: boolean; at: number };

type EditPatch = Partial<Pick<Reservation, "company" | "carrier" | "route" | "pnr" | "ttl" | "amount">>;

function update(state: State, id: string, fn: (r: Reservation) => Reservation): State {
  return { ...state, records: state.records.map((r) => (r.id === id ? fn(r) : r)) };
}

function reducer(state: State | null, a: Action): State | null {
  if (a.type === "init") {
    const records = makeSeedRecords(a.now);
    return { records, seq: SEED_START_SEQ + records.length, baseCompanies: makeSeedCompanies(a.now) };
  }
  if (!state) return state;

  switch (a.type) {
    case "create": {
      const i = a.input;
      const r: Reservation = {
        id: "TK-" + state.seq,
        staff: a.staff,
        company: i.company,
        pax: i.pax,
        product: i.product,
        vendor: i.vendor,
        carrier: i.carrier,
        pnr: i.pnr,
        ticketNo: "",
        route: i.route,
        travel: i.travel,
        ttl: i.ttl,
        amount: i.amount,
        pay: i.pay,
        urgent: i.pay === "ap" && i.urgent,
        createdAt: a.at,
        issuedAt: null,
        invoicedAt: null,
        invoiceNo: "",
        ap:
          i.pay === "ap"
            ? { status: "waiting", requestedAt: a.at, bank: i.bank, acct: i.acct, acctName: i.acctName, invoice: i.invoice, proof: null, note: i.note, revise: "" }
            : null,
        log: [{ t: a.at, who: a.staff, msg: "Membuat reservasi" }],
      };
      if (i.pay === "ap") r.log.push({ t: a.at, who: a.staff, msg: "Mengirim permintaan bayar ke AP" + (r.urgent ? " (urgent)" : "") });
      return { ...state, seq: state.seq + 1, records: [...state.records, r] };
    }
    case "issue":
      return update(state, a.id, (r) => ({ ...r, issuedAt: a.issuedAt, ticketNo: a.ticketNo, log: [...r.log, { t: a.at, who: r.staff, msg: "Tiket issued" }] }));
    case "editFields": {
      return update(state, a.id, (r) => {
        const p = a.patch;
        const parts: string[] = [];
        if (p.company !== undefined && p.company !== r.company) parts.push(`Perusahaan: "${r.company}" → "${p.company}"`);
        if (p.carrier !== undefined && p.carrier !== r.carrier) parts.push(`Operator: ${r.carrier} → ${p.carrier}`);
        if (p.route   !== undefined && p.route   !== r.route)   parts.push(`Rute: ${r.route} → ${p.route}`);
        if (p.pnr     !== undefined && p.pnr     !== r.pnr)     parts.push(`PNR: ${r.pnr} → ${p.pnr}`);
        if (p.amount  !== undefined && p.amount  !== r.amount)  parts.push(`Nilai: ${r.amount} → ${p.amount}`);
        if (p.ttl     !== undefined && p.ttl     !== r.ttl)     parts.push("TTL diperbarui");
        if (!parts.length) return r;
        const msg = (a.postPayment ? "⚠ Edit setelah pembayaran — " : "Edit: ") + parts.join("; ");
        return { ...r, ...p, log: [...r.log, { t: a.at, who: a.who, msg }] };
      });
    }
    case "invoice":
      return update(state, a.id, (r) => ({ ...r, invoicedAt: a.at, invoiceNo: a.invoiceNo, log: [...r.log, { t: a.at, who: r.staff, msg: "Invoice " + a.invoiceNo + " dibuat" }] }));
    case "pay":
      return update(state, a.id, (r) =>
        r.ap ? { ...r, ap: { ...r.ap, status: "paid", paidAt: a.at, proof: a.proof }, log: [...r.log, { t: a.at, who: a.by, msg: "Membayar, bukti transfer diunggah" }] } : r,
      );
    case "revise":
      return update(state, a.id, (r) =>
        r.ap ? { ...r, ap: { ...r.ap, status: "revise", revise: a.note }, log: [...r.log, { t: a.at, who: a.by, msg: "Mengembalikan: " + a.note }] } : r,
      );
    case "resubmit":
      return update(state, a.id, (r) =>
        r.ap ? { ...r, ap: { ...r.ap, status: "waiting", requestedAt: a.at, revise: "" }, log: [...r.log, { t: a.at, who: r.staff, msg: "Memperbaiki dan mengirim ulang ke AP" }] } : r,
      );
    case "replaceInvoice":
      return update(state, a.id, (r) => (r.ap ? { ...r, ap: { ...r.ap, invoice: a.file }, log: [...r.log, { t: a.at, who: r.staff, msg: "Mengganti invoice vendor" }] } : r));
    case "toggleUrgent":
      return update(state, a.id, (r) => ({ ...r, urgent: !r.urgent, log: [...r.log, { t: a.at, who: r.staff, msg: r.urgent ? "Menghapus tanda urgent" : "Menandai urgent" }] }));
    case "log":
      return update(state, a.id, (r) => ({ ...r, log: [...r.log, { t: a.at, who: a.who, msg: a.msg }] }));
    default:
      return state;
  }
}

export interface StoreActions {
  create: (input: NewReservationInput, staff: string) => void;
  issue: (id: string, ticketNo: string, issuedAt?: number) => void;
  invoice: (id: string, invoiceNo: string) => void;
  pay: (id: string, proof: FileRef, by: string) => void;
  revise: (id: string, note: string, by: string) => void;
  resubmit: (id: string) => void;
  replaceInvoice: (id: string, file: FileRef) => void;
  toggleUrgent: (id: string) => void;
  log: (id: string, who: string, msg: string) => void;
  editFields: (id: string, patch: Partial<Pick<Reservation, "company" | "carrier" | "route" | "pnr" | "ttl" | "amount">>, who: string, postPayment: boolean) => void;
}

interface StoreValue {
  ready: boolean;
  now: number;
  records: Reservation[];
  companies: CompanyEntry[];
  passengers: PassengerEntry[];
  get: (id: string) => Reservation | undefined;
  actions: StoreActions;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null);
  const [now, setNow] = useState(0);

  // Seed on the client only, so server and client render the same HTML.
  useEffect(() => {
    const t = Date.now();
    setNow(t);
    dispatch({ type: "init", now: t });
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const records = useMemo(() => state?.records ?? [], [state]);

  // Recent-first lookup books for autocomplete, derived from what the team actually used.
  const companies = useMemo(() => {
    const map = new Map<string, CompanyEntry>();
    for (const c of state?.baseCompanies ?? []) map.set(c.name, c);
    for (const r of records) {
      const prev = map.get(r.company);
      map.set(r.company, { name: r.company, last: Math.max(prev?.last ?? 0, r.createdAt) });
    }
    return [...map.values()].sort((a, b) => b.last - a.last);
  }, [state, records]);

  const passengers = useMemo(() => {
    const map = new Map<string, PassengerEntry>();
    for (const r of records)
      for (const p of r.pax) {
        const key = p + "|" + r.company;
        const prev = map.get(key);
        map.set(key, { name: p, company: r.company, last: Math.max(prev?.last ?? 0, r.createdAt) });
      }
    return [...map.values()].sort((a, b) => b.last - a.last);
  }, [records]);

  const get = useCallback((id: string) => records.find((r) => r.id === id), [records]);

  const actions = useMemo<StoreActions>(() => {
    const at = () => {
      const t = Date.now();
      setNow(t);
      return t;
    };
    return {
      create: (input, staff) => dispatch({ type: "create", input, staff, at: at() }),
      issue: (id, ticketNo, issuedAt) => { const t = at(); dispatch({ type: "issue", id, ticketNo, issuedAt: issuedAt ?? t, at: t }); },
      invoice: (id, invoiceNo) => dispatch({ type: "invoice", id, invoiceNo, at: at() }),
      pay: (id, proof, by) => dispatch({ type: "pay", id, proof, by, at: at() }),
      revise: (id, note, by) => dispatch({ type: "revise", id, note, by, at: at() }),
      resubmit: (id) => dispatch({ type: "resubmit", id, at: at() }),
      replaceInvoice: (id, file) => dispatch({ type: "replaceInvoice", id, file, at: at() }),
      toggleUrgent: (id) => dispatch({ type: "toggleUrgent", id, at: at() }),
      log: (id, who, msg) => dispatch({ type: "log", id, who, msg, at: at() }),
      editFields: (id, patch, who, postPayment) => dispatch({ type: "editFields", id, patch, who, postPayment, at: at() }),
    };
  }, []);

  const value: StoreValue = { ready: !!state && now > 0, now, records, companies, passengers, get, actions };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v;
}

/** Turns a browser File into a FileRef. Mock only: the URL dies on reload. */
export function fileToRef(f: File): FileRef {
  return { name: f.name, url: URL.createObjectURL(f) };
}
