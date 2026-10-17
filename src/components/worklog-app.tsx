"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OFFICE_USER, STAFF } from "@/lib/constants";
import { StoreProvider, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { DetailPanel } from "./detail-panel";
import { ModalHost } from "./modals";
import { NewEntryForm } from "./new-entry-form";
import { Drawer, Toast } from "./ui/overlay";
import { type ModalState, UiContext, type UiValue } from "./ui-context";
import { ApView } from "./views/ap-view";
import { FinanceView } from "./views/finance-view";
import { SpvView } from "./views/spv-view";
import { StaffView } from "./views/staff-view";

type View = "staff" | "ap" | "spv" | "finance";
type DrawerContent = { kind: "detail"; id: string } | { kind: "new"; n: number };

const VIEW_ROLE: Record<View, Role> = {
  staff: "staff",
  ap: "ap",
  spv: "spv",
  finance: "finance",
};

const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default function WorkLogApp() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { ready } = useStore();
  const [view, setView] = useState<View>("staff");
  const [me, setMe] = useState<string>(STAFF[0]);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerContent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formCount = useRef(0);

  const role = VIEW_ROLE[view];

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modal) setModal(null);
      else if (drawerOpen) setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = drawerOpen || !!modal ? "hidden" : "";
    return () => document.removeEventListener("keydown", onKey);
  }, [modal, drawerOpen]);

  const switchView = (v: View) => {
    setView(v);
    setQuery("");
    setDrawerOpen(false);
    setModal(null);
  };

  const viewProps = { query, setQuery };

  return (
    <UiContext.Provider value={ui}>
      <header className="topbar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="US Travel logo" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
          US Travel
          <small>WORK LOG TICKETING</small>
        </div>

        <nav className="roles" aria-label="Role">
          <button
            className={view === "staff" ? "active" : ""}
            onClick={() => switchView("staff")}
          >
            Staff ({cap(me)})
          </button>
          <button
            className={view === "ap" ? "active" : ""}
            onClick={() => switchView("ap")}
          >
            AP
          </button>
          <button
            className={view === "spv" ? "active" : ""}
            onClick={() => switchView("spv")}
          >
            Tim / SPV
          </button>
          <button
            className={view === "finance" ? "active" : ""}
            onClick={() => switchView("finance")}
          >
            Keuangan
          </button>
        </nav>

        <button className="btn-new" onClick={ui.openNew}>
          + Entri Baru
        </button>
      </header>

      <div className="content">
        {!ready ? (
          <div className="empty" aria-busy="true"><b>Memuat work log…</b></div>
        ) : (
          <>
            {view === "staff" && <StaffView {...viewProps} me={me} setMe={setMe} />}
            {view === "ap" && <ApView {...viewProps} />}
            {view === "spv" && <SpvView {...viewProps} />}
            {view === "finance" && <FinanceView {...viewProps} />}
          </>
        )}
      </div>

      <p className="mock-note">
        Mockup interaktif — data contoh fiktif, tersimpan sementara di browser.
      </p>

      <div
        className={"scrim" + (drawerOpen || modal ? " on" : "")}
        onClick={() => (modal ? setModal(null) : setDrawerOpen(false))}
      />
      <Drawer open={drawerOpen} labelId="d-title">
        {drawer?.kind === "detail" && <DetailPanel id={drawer.id} />}
        {drawer?.kind === "new" && <NewEntryForm key={drawer.n} />}
      </Drawer>
      <ModalHost modal={modal} />
      <Toast message={toastMsg} />
    </UiContext.Provider>
  );
}
