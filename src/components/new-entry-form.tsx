"use client";

import { useState } from "react";
import { CARRIERS, PRODUCTS, VENDORS, vendorsFor } from "@/lib/constants";
import { ago, D, formatNumber } from "@/lib/format";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtTtlDisplay(v: string): string {
  if (!v) return "";
  const [date, time] = v.split("T");
  const [y, m, d] = (date ?? "").split("-");
  if (!y || !m || !d) return v;
  return `${y}-${MONTHS[Number(m) - 1]}-${d.padStart(2,"0")} ${time ?? ""}`;
}
function ttlUrgency(v: string): "red" | "amber" | null {
  if (!v) return null;
  const ms = new Date(v).getTime() - Date.now();
  if (ms < 0) return "red";
  if (ms < 60 * 60 * 1000) return "red";
  if (ms < 3 * 60 * 60 * 1000) return "amber";
  return null;
}
import { useStore } from "@/lib/store";
import type { FileRef, PayMethod, Product } from "@/lib/types";
import { type AcItem, useAutocomplete } from "./autocomplete";
import { FileDrop } from "./file-drop";
import { DrawerHead } from "./ui/overlay";
import { useUi } from "./ui-context";

type Field = "company" | "pax" | "pnr" | "amount" | "invoice";

export function NewEntryForm() {
  const { companies, passengers, now, actions } = useStore();
  const { me, closeDrawer, toast } = useUi();

  const [company, setCompany] = useState("");
  const [pax, setPax] = useState<string[]>([]);
  const [paxText, setPaxText] = useState("");
  const [product, setProduct] = useState<Product>("intl");
  const [vendor, setVendor] = useState(vendorsFor("intl")[0]);
  const [carrier, setCarrier] = useState("");
  const [pnr, setPnr] = useState("");
  const [route, setRoute] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [amount, setAmount] = useState("");
  const [ttl, setTtl] = useState("");
  const [pay, setPay] = useState<PayMethod>("credit");
  const [invoice, setInvoice] = useState<FileRef | null>(null);
  const [bank, setBank] = useState(VENDORS[vendor].bank);
  const [acct, setAcct] = useState(VENDORS[vendor].acct);
  const [acctName, setAcctName] = useState(VENDORS[vendor].name);
  const [note, setNote] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [errors, setErrors] = useState<Set<Field>>(new Set());

  const clearErr = (f: Field) => setErrors((e) => { const n = new Set(e); n.delete(f); return n; });
  const bad = (f: Field) => (errors.has(f) ? " invalid" : "");

  const pickVendor = (v: string) => {
    setVendor(v);
    setBank(VENDORS[v].bank);
    setAcct(VENDORS[v].acct);
    setAcctName(VENDORS[v].name);
  };
  const pickProduct = (p: Product) => {
    setProduct(p);
    pickVendor(vendorsFor(p)[0]);
    if (p === "kai" || p === "whoosh") setCarrier(CARRIERS[p][0]);
    else if (carrier === "KAI" || carrier === "Whoosh") setCarrier("");
  };

  const addPax = (v: string) => {
    const name = v.trim().toUpperCase();
    if (name && !pax.includes(name)) setPax((p) => [...p, name]);
    setPaxText("");
    clearErr("pax");
  };

  const companyAc = useAutocomplete({
    listId: "ac-co",
    value: company,
    setValue: setCompany,
    getItems: (q) => {
      const list = q ? companies.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : companies;
      const items: AcItem[] = list.slice(0, 8).map((c) => ({ label: c.name, value: c.name, meta: c.last > now - 30 * D ? ago(c.last, now) : "" }));
      return { head: q ? "Cocok" : "Terakhir dipakai", items };
    },
    onPick: (v) => {
      setCompany(v);
      clearErr("company");
      setTimeout(() => document.getElementById("paxIn")?.focus(), 0);
    },
  });

  const paxAc = useAutocomplete({
    listId: "ac-pax",
    value: paxText,
    setValue: setPaxText,
    multi: true,
    onBackspaceEmpty: () => setPax((p) => p.slice(0, -1)),
    getItems: (q) => {
      const co = company.trim();
      let list = passengers.filter((p) => !pax.includes(p.name));
      if (q) list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
      list = [...list].sort((a, b) => Number(b.company === co) - Number(a.company === co) || b.last - a.last);
      const items: AcItem[] = list.slice(0, 8).map((p) => ({ label: p.name, meta: p.company, value: p.name }));
      if (q && !items.some((i) => i.label === q.toUpperCase())) items.push({ label: `Tambah "${q.toUpperCase()}"`, meta: "pax baru", value: q });
      return { head: q ? "Cocok" : co ? `Pax ${co} dan terbaru` : "Pax terbaru", items };
    },
    onPick: addPax,
  });

  const save = () => {
    const allPax = paxText.trim() ? [...pax, paxText.trim().toUpperCase()] : pax;
    const amt = Number(amount.replace(/\D/g, ""));
    const errs = new Set<Field>();
    if (!company.trim()) errs.add("company");
    if (allPax.length === 0) errs.add("pax");
    if (!pnr.trim()) errs.add("pnr");
    if (!(amt > 0)) errs.add("amount");
    if (pay === "ap" && !invoice) errs.add("invoice");
    setErrors(errs);
    if (errs.size) {
      document.getElementById("f-" + [...errs][0])?.scrollIntoView({ block: "center", behavior: "smooth" });
      toast("Lengkapi kolom yang ditandai merah.");
      return;
    }
    actions.create(
      {
        company: company.trim(),
        pax: allPax,
        product,
        vendor,
        carrier: carrier.trim().toUpperCase(),
        pnr: pnr.trim().toUpperCase(),
        route: route.trim().toUpperCase(),
        travel: travelDate ? new Date(travelDate).getTime() : Date.now() + 2 * D,
        ttl: ttl ? new Date(ttl).getTime() : null,
        amount: amt,
        pay,
        urgent,
        bank,
        acct,
        acctName,
        note: note.trim(),
        invoice,
      },
      me,
    );
    closeDrawer();
    toast(
      pay === "ap"
        ? `Permintaan${urgent ? " urgent" : ""} dikirim ke AP. Kamu akan lihat kotak hijau saat sudah dibayar.`
        : "Entri disimpan. Tandai issued setelah tiket keluar.",
    );
  };

  return (
    <>
      <DrawerHead eyebrow={`Work log ${me}`} title="Entri baru" labelId="d-title" onClose={closeDrawer} />
      <form className="d-body" noValidate autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <div className={"field" + bad("company")} id="f-company">
          <label htmlFor="co">Perusahaan / klien</label>
          <input className="inp" id="co" placeholder="Ketik nama perusahaan, atau Personal" data-autofocus {...companyAc.inputProps} />
          {companyAc.list}
          <div className="err">Isi nama perusahaan.</div>
        </div>

        <div className={"field" + bad("pax")} id="f-pax">
          <label htmlFor="paxIn">Nama pax</label>
          <div className="chips">
            {pax.map((p, i) => (
              <span className="chip" key={p}>
                {p}
                <button type="button" aria-label={`Hapus ${p}`} onClick={() => setPax(pax.filter((_, j) => j !== i))}>&times;</button>
              </span>
            ))}
            <input id="paxIn" placeholder="Ketik nama, Enter untuk menambah" {...paxAc.inputProps} />
          </div>
          {paxAc.list}
          <div className="err">Tambahkan minimal satu pax.</div>
        </div>

        <div className="two">
          <div className="field">
            <label htmlFor="prod">Produk</label>
            <select className="inp" id="prod" value={product} onChange={(e) => pickProduct(e.target.value as Product)}>
              {Object.entries(PRODUCTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="vend">Vendor</label>
            <select className="inp" id="vend" value={vendor} onChange={(e) => pickVendor(e.target.value)}>
              {vendorsFor(product).map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="two">
          <div className="field">
            <label htmlFor="carr">Maskapai / operator</label>
            <input className="inp" id="carr" list="carrList" placeholder="SQ" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            <datalist id="carrList">{CARRIERS[product].map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className={"field" + bad("pnr")} id="f-pnr">
            <label htmlFor="pnr">PNR / kode booking</label>
            <input className="inp code upper" id="pnr" placeholder="6 karakter" value={pnr} onChange={(e) => { setPnr(e.target.value); clearErr("pnr"); }} />
            <div className="err">Isi PNR atau kode booking.</div>
          </div>
        </div>

        <div className="two">
          <div className="field">
            <label htmlFor="route">Rute</label>
            <input className="inp upper" id="route" placeholder="CGK-SIN" value={route} onChange={(e) => setRoute(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="tdate">Tanggal berangkat</label>
            <input className="inp" id="tdate" type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
          </div>
        </div>

        <div className="two">
          <div className={"field" + bad("amount")} id="f-amount">
            <label htmlFor="amt">Nilai dari vendor (Rp)</label>
            <input
              className="inp"
              id="amt"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "");
                setAmount(d ? formatNumber(Number(d)) : "");
                clearErr("amount");
              }}
            />
            <div className="err">Isi nominal.</div>
          </div>
          <div className="field">
            <label htmlFor="ttl">Time limit (TTL)</label>
            <input className="inp" id="ttl" type="datetime-local" value={ttl} onChange={(e) => setTtl(e.target.value)} />
            {ttl && (() => {
              const urg = ttlUrgency(ttl);
              const display = fmtTtlDisplay(ttl);
              return (
                <div style={{ marginTop: 4, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="code" style={{ color: "var(--muted)" }}>{display}</span>
                  {urg === "red"   && <span style={{ background: "#e11d48", color: "#fff", fontWeight: 800, fontSize: 10, padding: "1px 6px" }}>MERAH — &lt;1 JAM</span>}
                  {urg === "amber" && <span style={{ background: "#f59e0b", color: "#fff", fontWeight: 800, fontSize: 10, padding: "1px 6px" }}>ORANGE — &lt;3 JAM</span>}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="field">
          <span className="lbl">Cara bayar ke vendor</span>
          <div className="seg">
            <label>
              <input type="radio" name="pay" value="credit" checked={pay === "credit"} onChange={() => setPay("credit")} />
              <b>Deposit / kredit vendor</b>
              <span>Bisa langsung issue, lalu buat invoice</span>
            </label>
            <label>
              <input type="radio" name="pay" value="ap" checked={pay === "ap"} onChange={() => setPay("ap")} />
              <b>Minta bayar via AP</b>
              <span>Kirim permintaan, tunggu dibayar, lalu issue</span>
            </label>
          </div>
        </div>

        {pay === "ap" && (
          <div className="box">
            <div className={"field" + bad("invoice")} id="f-invoice">
              <span className="lbl">Invoice vendor (SS atau PDF)</span>
              <FileDrop label="Pilih atau tarik file ke sini" current={invoice} onFile={(f) => { setInvoice(f); clearErr("invoice"); }} />
              <div className="err">Lampirkan invoice vendor supaya AP bisa cek nominal.</div>
            </div>
            <div className="two">
              <div className="field">
                <label htmlFor="bank">Bank / metode</label>
                <input className="inp" id="bank" value={bank} onChange={(e) => setBank(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="acct">No. rekening / VA</label>
                <input className="inp code" id="acct" value={acct} onChange={(e) => setAcct(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="acctName">Atas nama</label>
              <input className="inp" id="acctName" value={acctName} onChange={(e) => setAcctName(e.target.value)} />
              <div className="hint">Terisi otomatis dari data vendor. Ubah kalau vendor minta ke rekening lain.</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
              <span><b className="text-urgent">Urgent</b>, taruh di paling atas antrian AP</span>
            </label>
            <div style={{ height: 12 }} />
          </div>
        )}
      </form>
      <div className="d-foot">
        <button className="btn" onClick={closeDrawer}>Batal</button>
        <button className="btn primary" onClick={save}>Simpan entri</button>
      </div>
    </>
  );
}
