"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OFFICE_USER, ROLES, STAFF } from "@/lib/constants";
import { StoreProvider, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { needsStaffAction, stage, stuckReason } from "@/lib/workflow";
import { Count } from "./bits";
import { DetailPanel } from "./detail-panel";
import { ModalHost } from "./modals";
import { NewEntryForm } from "./new-entry-form";
import { Drawer, Toast } from "./ui/overlay";
import { type ModalState, UiContext, type UiValue } from "./ui-context";
import { ApView } from "./views/ap-view";
import { FinanceView } from "./views/finance-view";
import { SpvView } from "./views/spv-view";
import { StaffView } from "./views/staff-view";

type DrawerContent = { kind: "detail"; id: string } | { kind: "new"; n: number };

export default function WorkLogApp() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { ready, records, now } = useStore();
  const [role, setRole] = useState<Role>("staff");
  const [me, setMe] = useState<string>(STAFF[0]);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerContent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formCount = useRef(0);

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3400);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeModal = useCallback(() => setModal(null), []);

  const ui = useMemo<UiValue>(
    () => ({
      role,
      me,
      actor: role === "staff" ? me : OFFICE_USER[role],
      openDetail: (id: string) => { setDrawer({ kind: "detail", id }); setDrawerOpen(true); },
      openNew: () => { setDrawer({ kind: "new", n: ++formCount.current }); setDrawerOpen(true); },
      closeDrawer,
      openModal: setModal,
      closeModal,
      toast,
    }),
    [role, me, closeDrawer, closeModal, toast],
  );

  // Escape closes the top-most overlay. Body scroll is locked while one is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modal) setModal(null);
      else if (drawerOpen) setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = drawerOpen || modal ? "hidden" : "";
    return () => document.removeEventListener("keydown", onKey);
  }, [modal, drawerOpen]);

  const switchRole = (r: Role) => {
    setRole(r);
    setQuery("");
    setDrawerOpen(false);
    setModal(null);
  };

  const counts = useMemo(() => {
    const apQueue = records.filter((r) => r.ap?.status === "waiting");
    return {
      staff: { n: records.filter((r) => r.staff === me && needsStaffAction(r)).length, hot: false },
      spv: { n: records.filter((r) => stuckReason(r, now)).length, hot: false },
      ap: { n: apQueue.length, hot: apQueue.some((r) => r.urgent) },
      finance: { n: records.filter((r) => stage(r) === "toinvoice").length, hot: false },
    } satisfies Record<Role, { n: number; hot: boolean }>;
  }, [records, me, now]);

  const viewProps = { query, setQuery };

  return (
    <UiContext.Provider value={ui}>
      <header className="top">
        <div className="top-in">
          <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setQuery(""); setDrawerOpen(false); }} aria-label="Work log ticketing US Travel">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span><b>Work log ticketing</b><small>US Travel back office</small></span>
          </a>
          <div className="roles" role="group" aria-label="Lihat sebagai">
            {ROLES.map((r) => (
              <button key={r.id} aria-pressed={role === r.id} onClick={() => switchRole(r.id)}>
                {r.label}
                {ready && <Count n={counts[r.id].n} hot={counts[r.id].hot} />}
              </button>
            ))}
          </div>
          <div className="who">
            {role === "staff" ? (
              <>
                <label htmlFor="me" className="muted">Masuk sebagai</label>
                <select id="me" value={me} onChange={(e) => { setMe(e.target.value); setQuery(""); }}>
                  {STAFF.map((s) => <option key={s}>{s}</option>)}
                </select>
              </>
            ) : (
              <>
                <span className="muted">Masuk sebagai</span> <b>{OFFICE_USER[role]}</b>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {!ready ? (
          <div className="sheet loading" aria-busy="true">Memuat work log...</div>
        ) : role === "staff" ? (
          <StaffView {...viewProps} />
        ) : role === "spv" ? (
          <SpvView {...viewProps} />
        ) : role === "ap" ? (
          <ApView {...viewProps} />
        ) : (
          <FinanceView {...viewProps} />
        )}
      </main>
      <p className="mock-note">
        Mockup interaktif. Data contoh fiktif, tersimpan sementara di browser dan hilang saat halaman dimuat ulang. Ganti peran di kanan atas untuk mencoba alur dari
        sisi staf, SPV, AP, dan finance.
      </p>

      <div className={"scrim" + (drawerOpen || modal ? " on" : "")} onClick={() => (modal ? setModal(null) : setDrawerOpen(false))} />
      <Drawer open={drawerOpen} labelId="d-title">
        {drawer?.kind === "detail" && <DetailPanel id={drawer.id} />}
        {drawer?.kind === "new" && <NewEntryForm key={drawer.n} />}
      </Drawer>
      <ModalHost modal={modal} />
      <Toast message={toastMsg} />
    </UiContext.Provider>
  );
}
