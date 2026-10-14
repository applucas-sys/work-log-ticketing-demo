/**
 * Database schema (PostgreSQL via Drizzle ORM).
 *
 *   npm run db:generate   # create SQL migration from this file
 *   npm run db:migrate    # apply it to DATABASE_URL
 *
 * Money is stored as whole rupiah in bigint. Files are NOT stored in the
 * database: `attachments` only keeps metadata, the bytes live in UPLOAD_DIR.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const roleEnum = pgEnum("role", ["staff", "spv", "ap", "finance", "admin"]);
export const productEnum = pgEnum("product", ["intl", "dom", "kai", "whoosh"]);
export const payMethodEnum = pgEnum("pay_method", ["credit", "ap"]);
export const apStatusEnum = pgEnum("ap_status", ["waiting", "paid", "revise"]);
export const attachmentKindEnum = pgEnum("attachment_kind", ["vendor_invoice", "transfer_proof", "other"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  role: roleEnum("role").notNull(),
  // Nullable until auth is wired; set when the user first gets a password.
  passwordHash: text("password_hash"),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    lastUsedAt: ts("last_used_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("companies_name_uq").on(sql`lower(${t.name})`),
    index("companies_last_used_idx").on(t.lastUsedAt),
    // Fuzzy autocomplete. Needs the pg_trgm extension (docker/init.sql creates it).
    index("companies_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
  ],
);

export const passengers = pgTable(
  "passengers",
  {
    id: serial("id").primaryKey(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    companyId: integer("company_id").references(() => companies.id),
    lastUsedAt: ts("last_used_at"),
    useCount: integer("use_count").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("passengers_name_company_uq").on(t.fullName, t.companyId),
    index("passengers_last_used_idx").on(t.lastUsedAt),
    index("passengers_name_trgm_idx").using("gin", sql`${t.fullName} gin_trgm_ops`),
  ],
);

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  products: productEnum("products").array().notNull(),
  bank: varchar("bank", { length: 60 }),
  accountNo: varchar("account_no", { length: 40 }),
  accountName: varchar("account_name", { length: 150 }),
  active: boolean("active").notNull().default(true),
});

export const reservations = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(), // e.g. TK-1861
    staffId: integer("staff_id").notNull().references(() => users.id),
    companyId: integer("company_id").notNull().references(() => companies.id),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id),
    product: productEnum("product").notNull(),
    carrier: varchar("carrier", { length: 20 }),
    pnr: varchar("pnr", { length: 20 }).notNull(),
    ticketNo: varchar("ticket_no", { length: 200 }),
    route: varchar("route", { length: 40 }),
    travelDate: date("travel_date"),
    ttlAt: ts("ttl_at"),
    amount: bigint("amount", { mode: "number" }).notNull(),
    payMethod: payMethodEnum("pay_method").notNull(),
    urgent: boolean("urgent").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    issuedAt: ts("issued_at"),
    invoicedAt: ts("invoiced_at"),
    invoiceNo: varchar("invoice_no", { length: 60 }),
  },
  (t) => [
    index("reservations_staff_idx").on(t.staffId, t.createdAt),
    index("reservations_pnr_idx").on(t.pnr),
    // Finance: issued but not invoiced
    index("reservations_uninvoiced_idx").on(t.issuedAt).where(sql`${t.invoicedAt} is null`),
  ],
);

export const reservationPassengers = pgTable(
  "reservation_passengers",
  {
    reservationId: integer("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
    passengerId: integer("passenger_id").notNull().references(() => passengers.id),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.reservationId, t.passengerId] })],
);

export const paymentRequests = pgTable(
  "payment_requests",
  {
    id: serial("id").primaryKey(),
    reservationId: integer("reservation_id").notNull().unique().references(() => reservations.id, { onDelete: "cascade" }),
    status: apStatusEnum("status").notNull().default("waiting"),
    bank: varchar("bank", { length: 60 }).notNull(),
    accountNo: varchar("account_no", { length: 40 }).notNull(),
    accountName: varchar("account_name", { length: 150 }).notNull(),
    note: text("note"),
    reviseNote: text("revise_note"),
    requestedBy: integer("requested_by").notNull().references(() => users.id),
    requestedAt: ts("requested_at").notNull().defaultNow(),
    paidBy: integer("paid_by").references(() => users.id),
    paidAt: ts("paid_at"),
  },
  (t) => [index("payment_requests_status_idx").on(t.status, t.requestedAt)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: integer("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
    kind: attachmentKindEnum("kind").notNull(),
    storageKey: text("storage_key").notNull(), // path relative to UPLOAD_DIR
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("attachments_reservation_idx").on(t.reservationId)],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    reservationId: integer("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id),
    action: varchar("action", { length: 40 }).notNull(), // created, ap_requested, ap_paid, ap_returned, issued, invoiced, nudged...
    message: text("message"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("activity_log_reservation_idx").on(t.reservationId, t.createdAt)],
);
