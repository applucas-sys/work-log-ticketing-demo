import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let db: PostgresJsDatabase<typeof schema> | null = null;

export const hasDatabase = () => !!process.env.DATABASE_URL;

/** Lazily connects, so the app still builds and runs in mock mode without a database. */
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    db = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return db;
}

export { schema };
