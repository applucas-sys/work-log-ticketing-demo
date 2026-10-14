export type Role = "staff" | "spv" | "ap" | "finance";
export type Product = "intl" | "dom" | "kai" | "whoosh";
export type PayMethod = "credit" | "ap";
export type ApStatus = "waiting" | "paid" | "revise";
export type Stage = "waitap" | "revise" | "toissue" | "toinvoice" | "done";
export type PipState = "done" | "todo" | "wait" | "paid" | "revise" | "na";

/** A file attached to a record. In mock mode `url` is a browser blob URL. */
export interface FileRef {
  name: string;
  url: string | null;
}

export interface LogEntry {
  t: number;
  who: string;
  msg: string;
}

export interface PaymentRequest {
  status: ApStatus;
  requestedAt: number;
  paidAt?: number;
  bank: string;
  acct: string;
  acctName: string;
  invoice: FileRef | null;
  proof: FileRef | null;
  note: string;
  revise: string;
}

export interface Reservation {
  id: string;
  staff: string;
  company: string;
  pax: string[];
  product: Product;
  vendor: string;
  carrier: string;
  pnr: string;
  ticketNo: string;
  route: string;
  travel: number;
  ttl: number | null;
  amount: number;
  pay: PayMethod;
  urgent: boolean;
  createdAt: number;
  issuedAt: number | null;
  invoicedAt: number | null;
  invoiceNo: string;
  ap: PaymentRequest | null;
  log: LogEntry[];
}

/** What the "Entri baru" form submits. */
export interface NewReservationInput {
  company: string;
  pax: string[];
  product: Product;
  vendor: string;
  carrier: string;
  pnr: string;
  route: string;
  travel: number;
  ttl: number | null;
  amount: number;
  pay: PayMethod;
  urgent: boolean;
  bank: string;
  acct: string;
  acctName: string;
  note: string;
  invoice: FileRef | null;
}

export interface CompanyEntry {
  name: string;
  last: number;
}

export interface PassengerEntry {
  name: string;
  company: string;
  last: number;
}
