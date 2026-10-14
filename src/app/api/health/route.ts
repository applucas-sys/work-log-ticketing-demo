import { sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/server/db";
import { storageAvailable } from "@/server/storage";

export const dynamic = "force-dynamic";

/** GET /api/health : used by Docker healthcheck and to confirm which mode is running. */
export async function GET() {
  const mode = hasDatabase() ? "database" : "mock";
  let database: "ok" | "error" | "not-configured" = "not-configured";
  if (hasDatabase()) {
    try {
      await getDb().execute(sql`select 1`);
      database = "ok";
    } catch {
      database = "error";
    }
  }
  const ok = database !== "error";
  return Response.json({ ok, mode, database, fileStorage: storageAvailable() }, { status: ok ? 200 : 503 });
}
