import { AuthError, requireUser } from "@/server/auth";
import { readUpload, UploadError } from "@/server/storage";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { webp: "image/webp", pdf: "application/pdf" };

/**
 * GET /api/files/2026/10/<uuid>.webp
 * Streams a stored file to a logged-in user. Files are never in /public,
 * because they contain client invoices and bank transfer proofs.
 *
 * TODO: look up the attachment row and check the user may see that reservation.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  try {
    await requireUser();
    const { key } = await params;
    const storageKey = key.join("/");
    const data = await readUpload(storageKey);
    const ext = storageKey.split(".").pop() ?? "";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: 401 });
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: 400 });
    return Response.json({ error: "File tidak ditemukan." }, { status: 404 });
  }
}
