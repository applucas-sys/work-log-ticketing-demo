/**
 * Fictional demo data for mock mode. Formats follow Account_Payable.xlsx,
 * but every name, PNR and ticket number here is made up.
 */
import { VENDORS } from "./constants";
import { D, H, M } from "./format";
import type { CompanyEntry, Product, Reservation } from "./types";

interface SeedSpec {
  staff: string;
  co: string;
  pax: string[];
  p: Product;
  v: string;
  c: string;
  pnr: string;
  route: string;
  amt: number;
  pay: "credit" | "ap";
  age: number;
  urgent?: boolean;
  ttl?: number;
  travelIn?: number;
  note?: string;
  apPaid?: number;
  revise?: string;
  reviseAge?: number;
  issued?: number;
  inv?: number;
}

const AP_USER = "AP (SARI)";

function autoTicket(r: Reservation): string {
  if (r.product === "kai" || r.product === "whoosh") return "";
  const n = (r.pnr.charCodeAt(0) * 7919 + r.pnr.charCodeAt(2) * 104729) % 9e9;
  return (r.product === "intl" ? "618" : "126") + String(Math.floor(1e9 + n));
}

function build(o: SeedSpec, id: string, now: number): Reservation {
  const created = now - o.age;
  const r: Reservation = {
    id,
    staff: o.staff,
    company: o.co,
    pax: o.pax,
    product: o.p,
    vendor: o.v,
    carrier: o.c,
    pnr: o.pnr,
    ticketNo: "",
    route: o.route,
    travel: now + (o.travelIn ?? 3 * D),
    ttl: o.ttl != null ? now + o.ttl : null,
    amount: o.amt,
    pay: o.pay,
    urgent: !!o.urgent,
    createdAt: created,
    issuedAt: null,
    invoicedAt: null,
    invoiceNo: "",
    ap: null,
    log: [{ t: created, who: o.staff, msg: "Membuat reservasi" }],
  };
  if (o.pay === "ap") {
    const v = VENDORS[o.v];
    r.ap = {
      status: "waiting",
      requestedAt: created + 2 * M,
      bank: v.bank,
      acct: v.acct,
      acctName: v.name,
      invoice: { name: `invoice-${o.v.toLowerCase().replace(/\s/g, "")}-${o.pnr}.pdf`, url: null },
      proof: null,
      note: o.note ?? "",
      revise: "",
    };
    r.log.push({ t: created + 2 * M, who: o.staff, msg: "Mengirim permintaan bayar ke AP" + (o.urgent ? " (urgent)" : "") });
    if (o.apPaid != null) {
      r.ap.status = "paid";
      r.ap.paidAt = now - o.apPaid;
      r.ap.proof = { name: `bukti-trf-${o.pnr}.jpg`, url: null };
      r.log.push({ t: r.ap.paidAt, who: AP_USER, msg: "Membayar, bukti transfer diunggah" });
    }
    if (o.revise) {
      r.ap.status = "revise";
      r.ap.revise = o.revise;
      r.log.push({ t: now - (o.reviseAge ?? H), who: AP_USER, msg: "Mengembalikan: " + o.revise });
    }
  }
  if (o.issued != null) {
    r.issuedAt = now - o.issued;
    r.ticketNo = autoTicket(r);
    r.log.push({ t: r.issuedAt, who: o.staff, msg: "Tiket issued" });
  }
  if (o.inv != null) {
    r.invoicedAt = now - o.inv;
    r.invoiceNo = "INV/US/2610/" + (400 + Number(id.slice(3)) % 97);
    r.log.push({ t: r.invoicedAt, who: o.staff, msg: "Invoice " + r.invoiceNo + " dibuat" });
  }
  return r;
}

const SPECS: SeedSpec[] = [
  { staff: "DAVID", co: "PT Sinar Palma Lestari", pax: ["ANDI PRASETYO", "RINA KARTIKA"], p: "intl", v: "Wisman", c: "SQ", pnr: "7KQXMB", route: "CGK-SIN", amt: 14850000, pay: "ap", urgent: true, age: 25 * M, ttl: 2 * H, travelIn: 2 * D, note: "TTL jam 14.00, mohon didahulukan" },
  { staff: "DAVID", co: "Bank Nusantara Persada", pax: ["HENDRA WIBOWO"], p: "dom", v: "Wisman", c: "GA", pnr: "4TRZLP", route: "CGK-DPS", amt: 3420000, pay: "credit", age: 6 * H, issued: 5 * H },
  { staff: "DAVID", co: "PT Arka Mandiri", pax: ["YOGA PRATAMA", "DEWI LESTARI", "FAJAR NUGROHO"], p: "dom", v: "US Direct", c: "QG", pnr: "XWPLNA", route: "CGK-KNO", amt: 4275000, pay: "ap", age: 3 * H, ttl: 9 * H, apPaid: 40 * M },
  { staff: "DAVID", co: "PT Seraya Energi", pax: ["MARIA SIMANJUNTAK"], p: "intl", v: "Avia", c: "NH", pnr: "JC7H2Q", route: "CGK-HND", amt: 21300000, pay: "credit", age: 2 * D + 3 * H, issued: 2 * D },
  { staff: "DAVID", co: "PT Arka Mandiri", pax: ["BAMBANG SUTRISNO"], p: "dom", v: "Wisman", c: "GA", pnr: "5NJQKR", route: "CGK-JOG", amt: 1890000, pay: "credit", age: 3 * D, issued: 3 * D - H, inv: 2 * D },
  { staff: "DAVID", co: "Yayasan Cahaya Bangsa", pax: ["DITA AYUNINGTYAS"], p: "intl", v: "Wisman", c: "CZ", pnr: "JCRMTL", route: "CGK-CAN", amt: 8760000, pay: "ap", age: 4 * D, apPaid: 4 * D - 2 * H, issued: 4 * D - 3 * H, inv: 3 * D },
  { staff: "AFIA", co: "PT Mitra Tambang Utama", pax: ["BAGUS SETIAWAN", "LINDA HARTONO"], p: "intl", v: "Wisman", c: "CX", pnr: "JBM4QX", route: "CGK-HKG", amt: 18640000, pay: "ap", age: 3.6 * H, ttl: 20 * H },
  { staff: "AFIA", co: "Yayasan Cahaya Bangsa", pax: ["SITI NURHALIZA"], p: "intl", v: "TravelMart", c: "KL", pnr: "JB8WNQ", route: "CGK-AMS", amt: 16900000, pay: "ap", urgent: true, age: 50 * M, ttl: 4 * H },
  { staff: "AFIA", co: "PT Kirana Logistik", pax: ["RUDI HARTANTO"], p: "dom", v: "Wisman", c: "IP", pnr: "LYKQMA", route: "CGK-SUB", amt: 1980000, pay: "credit", age: 40 * M, ttl: 5 * H },
  { staff: "AFIA", co: "PT Sinar Palma Lestari", pax: ["GREGORIUS HENDRA"], p: "intl", v: "Wisman", c: "SQ", pnr: "EDMQYW", route: "CGK-SIN", amt: 7420000, pay: "ap", age: 5 * D, apPaid: 5 * D - H, issued: 5 * D - 2 * H, inv: 4 * D },
  { staff: "NENA", co: "PT Sinar Palma Lestari", pax: ["IWAN GUNAWAN", "AGUS SALIM"], p: "dom", v: "Wisman", c: "GA", pnr: "5MHQUR", route: "CGK-PKU", amt: 5840000, pay: "credit", age: 1.6 * D, issued: 1.5 * D },
  { staff: "NENA", co: "PT Sinar Palma Lestari", pax: ["TAUFIK HIDAYAT"], p: "dom", v: "US Direct", c: "JT", pnr: "ORPQYH", route: "CGK-BTH", amt: 1250000, pay: "ap", age: 2.5 * H, ttl: 7 * H, revise: "Screenshot invoice terpotong, nominal tidak terbaca", reviseAge: 1.5 * H },
  { staff: "NENA", co: "Personal", pax: ["NABILA PUTRI"], p: "dom", v: "Wisman", c: "GA", pnr: "5OQN4Z", route: "CGK-YIA", amt: 1640000, pay: "credit", age: 2 * D, issued: 2 * D - H, inv: 1 * D },
  { staff: "RIAN", co: "PT Arka Mandiri", pax: ["WAWAN INDRAWAN"], p: "dom", v: "TWC", c: "QG", pnr: "NMBQYX", route: "HLP-LOP", amt: 1780000, pay: "ap", age: 15 * M, ttl: 23 * H },
  { staff: "RIAN", co: "Bank Nusantara Persada", pax: ["KEVIN TANUWIJAYA"], p: "intl", v: "Wisman", c: "CZ", pnr: "JCRQKL", route: "CGK-CAN", amt: 9760000, pay: "credit", age: 4 * H, issued: 3 * H },
  { staff: "KEN", co: "PT Kirana Logistik", pax: ["MUHAMMAD HAMKA", "GINANJAR RAGA"], p: "kai", v: "Jontru", c: "KAI", pnr: "4719QSB", route: "GMR-YK", amt: 1120000, pay: "credit", age: 2 * H, issued: 1 * H },
  { staff: "KEN", co: "PT Seraya Energi", pax: ["EKO SUSANTO"], p: "whoosh", v: "KCIC", c: "Whoosh", pnr: "GA45971", route: "HLM-TGL", amt: 600000, pay: "credit", age: 2 * D, issued: 2 * D, inv: 1.5 * D },
  { staff: "BRANDON", co: "PT Mitra Tambang Utama", pax: ["RADI SUHENDRA", "SUPRIYANTO"], p: "dom", v: "TWC", c: "QG", pnr: "SWEQKR", route: "CGK-BPN", amt: 4150000, pay: "ap", age: 4 * H, ttl: 6 * H, apPaid: 2 * H },
  { staff: "NIKITA", co: "Yayasan Cahaya Bangsa", pax: ["JOHAN SATRIA"], p: "dom", v: "US Direct", c: "JT", pnr: "GFQFKJ", route: "CGK-UPG", amt: 2340000, pay: "ap", urgent: true, age: 1.1 * H, ttl: 1.5 * H },
  { staff: "NUY", co: "PT Arka Mandiri", pax: ["RYAN ARIFIN"], p: "dom", v: "Wisman", c: "GA", pnr: "EFJ7QL", route: "CGK-KOE", amt: 3980000, pay: "credit", age: 4.2 * D, issued: 4 * D },
  { staff: "NUY", co: "PT Kirana Logistik", pax: ["PRAMUDYA SAPUTRO"], p: "dom", v: "Wisman", c: "QG", pnr: "ZKPQKA", route: "CGK-PDG", amt: 1560000, pay: "credit", age: 3 * D, issued: 3 * D, inv: 2.5 * D },
  { staff: "RIAN", co: "PT Mitra Tambang Utama", pax: ["BUDI SANTOSO", "TEGUH WALUYO"], p: "kai", v: "Jontru", c: "KAI", pnr: "8823QKA", route: "GMR-SDT", amt: 1840000, pay: "ap", age: 3 * H, ttl: 8 * H },
  { staff: "KEN", co: "PT Seraya Energi", pax: ["RANI PUSPITA"], p: "whoosh", v: "KCIC", c: "Whoosh", pnr: "WH10047", route: "HLM-TGL", amt: 450000, pay: "ap", urgent: true, age: 45 * M, ttl: 2 * H, note: "Berangkat sore ini, mohon segera diproses" },
];

export const SEED_START_SEQ = 1860;

export function makeSeedRecords(now: number): Reservation[] {
  return SPECS.map((s, i) => build(s, "TK-" + (SEED_START_SEQ + i), now));
}

/** Companies the team used a while ago, so autocomplete has a few hundred-style entries. */
const OLDER_COMPANIES = [
  "PT Bumi Sentosa Abadi", "PT Garuda Kencana", "PT Hutama Karsa", "PT Indo Rekayasa", "PT Jaya Samudra Niaga",
  "PT Lintas Nusa Energi", "PT Mega Prima Farma", "PT Nirwana Properti", "PT Prima Agro Lestari", "PT Sejahtera Bersama",
  "PT Tirta Makmur", "Kedutaan Contoh", "Universitas Contoh",
];

export function makeSeedCompanies(now: number): CompanyEntry[] {
  return OLDER_COMPANIES.map((name, i) => ({ name, last: now - (40 + i * 9) * D }));
}
