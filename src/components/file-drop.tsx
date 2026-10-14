"use client";

import { useState } from "react";
import { fileToRef } from "@/lib/store";
import type { FileRef } from "@/lib/types";
import { IconFile } from "./icons";

/** File picker with drag and drop. Accepts screenshots and PDFs. */
export function FileDrop({ label, onFile, current }: { label: string; onFile: (f: FileRef) => void; current?: FileRef | null }) {
  const [hover, setHover] = useState(false);
  const take = (f?: File | null) => f && onFile(fileToRef(f));
  return (
    <>
      <label
        className="drop"
        style={hover ? { borderColor: "var(--brand)" } : undefined}
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => { e.preventDefault(); setHover(false); take(e.dataTransfer.files[0]); }}
      >
        <IconFile /> {label}
        <input type="file" accept="image/*,.pdf" onChange={(e) => take(e.target.files?.[0])} />
      </label>
      {current && <div className="hint">Terlampir: {current.name}</div>}
    </>
  );
}
