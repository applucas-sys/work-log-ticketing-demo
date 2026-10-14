import type { Product, Role } from "./types";

export const STAFF = ["DAVID", "AFIA", "NENA", "RIAN", "NUY", "KEN", "BRANDON", "NIKITA"] as const;

export const ROLES: { id: Role; label: string }[] = [
  { id: "staff", label: "Staf ticketing" },
  { id: "spv", label: "SPV ticketing" },
  { id: "ap", label: "Acc. payable" },
  { id: "finance", label: "Finance" },
];

/** Who is "logged in" for non-staff roles in the mockup. */
export const OFFICE_USER: Record<Exclude<Role, "staff">, string> = {
  spv: "IKA (SPV)",
  ap: "SARI (AP)",
  finance: "MAYA (Finance)",
};

export const PRODUCTS: Record<Product, string> = {
  intl: "Pesawat internasional",
  dom: "Pesawat domestik",
  kai: "Kereta KAI",
  whoosh: "Whoosh",
};

export interface Vendor {
  products: Product[];
  bank: string;
  acct: string;
  name: string;
}

/** Vendor list mirrors the sheets in Account_Payable.xlsx. Bank details are fictional. */
export const VENDORS: Record<string, Vendor> = {
  Wisman: { products: ["intl", "dom"], bank: "BCA", acct: "5270881192", name: "PT Wisman Tour (contoh)" },
  TravelMart: { products: ["intl", "dom"], bank: "Mandiri", acct: "1220007845991", name: "PT Travelmart (contoh)" },
  Avia: { products: ["intl"], bank: "BNI", acct: "0912334551", name: "PT Avia Tour (contoh)" },
  TWC: { products: ["dom"], bank: "BCA", acct: "8704452210", name: "PT TWC Travel (contoh)" },
  "US Direct": { products: ["dom"], bank: "Virtual account", acct: "880812345678", name: "Top up deposit maskapai (contoh)" },
  Jontru: { products: ["kai"], bank: "BRI", acct: "034101000777304", name: "CV Jontru (contoh)" },
  KCIC: { products: ["whoosh"], bank: "Virtual account", acct: "7700120034", name: "KCIC Whoosh (contoh)" },
};

export const CARRIERS: Record<Product, string[]> = {
  intl: ["SQ", "CX", "CZ", "MU", "KL", "GA", "NH", "HX", "QR", "EK"],
  dom: ["GA", "QG", "ID", "IP", "JT", "IU", "8B", "SJ"],
  kai: ["KAI"],
  whoosh: ["Whoosh"],
};

export function vendorsFor(product: Product): string[] {
  return Object.entries(VENDORS)
    .filter(([, v]) => v.products.includes(product))
    .map(([k]) => k);
}

/** Thresholds the SPV "Nyangkut" list uses. Confirm these with the client. */
export const STUCK = {
  waitingApMs: 2 * 60 * 60 * 1000,
  paidNotIssuedMs: 60 * 60 * 1000,
  ttlWarnMs: 3 * 60 * 60 * 1000,
  issuedNotInvoicedMs: 24 * 60 * 60 * 1000,
};
