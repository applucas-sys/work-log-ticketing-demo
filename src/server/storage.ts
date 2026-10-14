import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"]);

export function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR || "./data/uploads");
}

export const maxUploadBytes = () => (Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024;

/** Vercel's filesystem is temporary, so file storage is only enabled on a real server. */
export const storageAvailable = () => !process.env.VERCEL;

export interface StoredFile {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

export class UploadError extends Error {}

/**
 * Saves an upload under UPLOAD_DIR/yyyy/mm/<uuid>.<ext>.
 * Screenshots and photos are resized to max 1600px wide and converted to WebP,
 * which usually turns a 2 to 4 MB phone screenshot into roughly 200 KB.
 * PDFs are stored as is.
 */
export async function saveUpload(file: File): Promise<StoredFile> {
  if (!ALLOWED.has(file.type)) throw new UploadError("Format tidak didukung. Gunakan JPG, PNG, WebP, HEIC, atau PDF.");
  if (file.size > maxUploadBytes()) throw new UploadError(`File terlalu besar. Maksimal ${process.env.MAX_UPLOAD_MB || 10} MB.`);

  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  let mimeType = file.type;
  let ext = "pdf";

  if (file.type.startsWith("image/")) {
    bytes = await sharp(bytes).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    mimeType = "image/webp";
    ext = "webp";
  } else if (bytes.subarray(0, 5).toString() !== "%PDF-") {
    throw new UploadError("File PDF tidak valid.");
  }

  const now = new Date();
  const rel = path.posix.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), `${randomUUID()}.${ext}`);
  const abs = path.join(uploadDir(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes, { flag: "wx" });

  return {
    storageKey: rel,
    originalName: file.name.slice(0, 255),
    mimeType,
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

/** Reads a stored file. Rejects keys that try to escape UPLOAD_DIR. */
export async function readUpload(storageKey: string): Promise<Buffer> {
  const root = uploadDir();
  const abs = path.resolve(root, storageKey);
  if (!abs.startsWith(root + path.sep)) throw new UploadError("Path tidak valid.");
  return readFile(abs);
}
