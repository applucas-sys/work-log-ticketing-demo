import { AuthError, requireUser } from "@/server/auth";
import { saveUpload, storageAvailable, UploadError } from "@/server/storage";

export const dynamic = "force-dynamic";

/**
 * POST /api/uploads  (multipart/form-data, field "file")
 * Saves the file to UPLOAD_DIR and returns its metadata.
 *
 * TODO when the backend is wired: also take reservationId + kind, insert a row
 * into `attachments`, and write an `activity_log` entry in the same transaction.
 */
export async function POST(req: Request) {
  try {
    await requireUser();
    if (!storageAvailable()) {
      return Response.json({ error: "Penyimpanan file tidak aktif di Vercel. Jalankan di server internal." }, { status: 501 });
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Field 'file' wajib diisi." }, { status: 400 });
    const stored = await saveUpload(file);
    return Response.json(stored, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: 401 });
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: 400 });
    console.error("upload failed", e);
    return Response.json({ error: "Upload gagal." }, { status: 500 });
  }
}
