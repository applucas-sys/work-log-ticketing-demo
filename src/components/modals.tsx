"use client";

import { useState } from "react";
import { rp } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { FileRef } from "@/lib/types";
import { FileDrop } from "./file-drop";
import { Modal } from "./ui/overlay";
import { type ModalState, useUi } from "./ui-context";

export function ModalHost({ modal }: { modal: ModalState | null }) {
  if (!modal) return null;
  // key resets each modal's local state when a different record opens
  const key = modal.kind + modal.id;
  switch (modal.kind) {
    case "issue":
      return <IssueModal key={key} id={modal.id} />;
    case "invoice":
      return <InvoiceModal key={key} id={modal.id} />;
    case "pay":
      return <PayModal key={key} id={modal.id} />;
    case "revise":
      return <ReviseModal key={key} id={modal.id} />;
  }
}

function IssueModal({ id }: { id: string }) {
  const { get, actions } = useStore();
  const { closeModal, toast } = useUi();
  const [ticket, setTicket] = useState("");
  const r = get(id);
  if (!r) return null;
  const needsTicket = r.product !== "kai" && r.product !== "whoosh";
  const ok = () => {
    actions.issue(id, ticket.trim());
    closeModal();
    toast("Ditandai issued. Langkah berikutnya: buat invoice ke customer.");
  };
  return (
    <Modal
      title="Tandai issued"
      onClose={closeModal}
      footer={<><button className="btn" onClick={closeModal}>Batal</button><button className="btn primary" onClick={ok}>Tandai issued</button></>}
    >
      <p className="muted mt4">{r.pax.join(", ")}, PNR <span className="code">{r.pnr}</span></p>
      {needsTicket && (
        <div className="field">
          <label htmlFor="tk">No. tiket</label>
          <input className="inp code" id="tk" placeholder="Boleh dikosongkan untuk LCC" value={ticket} onChange={(e) => setTicket(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ok()} />
          <div className="hint">Untuk beberapa pax, pisahkan dengan koma.</div>
        </div>
      )}
    </Modal>
  );
}

function InvoiceModal({ id }: { id: string }) {
  const { get, actions } = useStore();
  const { closeModal, toast } = useUi();
  const [no, setNo] = useState(() => {
    const d = new Date();
    return `INV/US/${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}/`;
  });
  const r = get(id);
  if (!r) return null;
  const ok = () => {
    actions.invoice(id, no.trim());
    closeModal();
    toast("Ditandai sudah invoice dan dipindah ke arsip.");
  };
  return (
    <Modal
      title="Tandai sudah invoice"
      onClose={closeModal}
      footer={<><button className="btn" onClick={closeModal}>Batal</button><button className="btn primary" onClick={ok}>Tandai sudah invoice</button></>}
    >
      <p className="muted mt4">{r.company}, {rp(r.amount)}. Setelah ini reservasi pindah ke arsip.</p>
      <div className="field">
        <label htmlFor="inv">No. invoice</label>
        <input className="inp code" id="inv" value={no} onChange={(e) => setNo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ok()} />
      </div>
    </Modal>
  );
}

function PayModal({ id }: { id: string }) {
  const { get, actions } = useStore();
  const { closeModal, toast, actor } = useUi();
  const [proof, setProof] = useState<FileRef | null>(null);
  const [err, setErr] = useState(false);
  const r = get(id);
  if (!r || !r.ap) return null;
  const ok = () => {
    if (!proof) return setErr(true);
    actions.pay(id, proof, actor);
    closeModal();
    toast(`Ditandai dibayar. ${r.staff} sekarang melihat kotak hijau dan bisa issue.`);
  };
  return (
    <Modal
      title="Tandai dibayar"
      onClose={closeModal}
      footer={<><button className="btn" onClick={closeModal}>Batal</button><button className="btn green" onClick={ok}>Tandai dibayar</button></>}
    >
      <dl className="kv mb14">
        <dt>Nominal</dt><dd className="amt">{rp(r.amount)}</dd>
        <dt>Ke</dt><dd>{r.ap.bank} <span className="code">{r.ap.acct}</span><br /><span className="sub">{r.ap.acctName}</span></dd>
        <dt>Berita</dt><dd className="code">{r.pnr} {r.pax[0]}</dd>
      </dl>
      <div className={"field" + (err ? " invalid" : "")}>
        <span className="lbl">Bukti transfer</span>
        <FileDrop label="Pilih SS bukti transfer" current={proof} onFile={(f) => { setProof(f); setErr(false); }} />
        <div className="err">Unggah bukti transfer dulu.</div>
      </div>
    </Modal>
  );
}

function ReviseModal({ id }: { id: string }) {
  const { get, actions } = useStore();
  const { closeModal, toast, actor } = useUi();
  const [note, setNote] = useState("");
  const [err, setErr] = useState(false);
  const r = get(id);
  if (!r) return null;
  const ok = () => {
    if (!note.trim()) return setErr(true);
    actions.revise(id, note.trim(), actor);
    closeModal();
    toast(`Dikembalikan ke ${r.staff}.`);
  };
  return (
    <Modal
      title={`Kembalikan ke ${r.staff}`}
      onClose={closeModal}
      footer={<><button className="btn" onClick={closeModal}>Batal</button><button className="btn danger" onClick={ok}>Kembalikan</button></>}
    >
      <div className={"field" + (err ? " invalid" : "")}>
        <label htmlFor="rv">Apa yang perlu diperbaiki?</label>
        <textarea className="inp" id="rv" rows={3} placeholder="Misal: nominal di invoice beda dengan permintaan" value={note} onChange={(e) => { setNote(e.target.value); setErr(false); }} />
        <div className="err">Tulis alasannya supaya staf tahu harus memperbaiki apa.</div>
      </div>
    </Modal>
  );
}
