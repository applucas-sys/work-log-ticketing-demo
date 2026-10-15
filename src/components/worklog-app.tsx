"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OFFICE_USER, STAFF } from "@/lib/constants";
import { StoreProvider, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { needsStaffAction, stage, stuckReason } from "@/lib/workflow";
import { DetailPanel } from "./detail-panel";
import { IconChart, IconChevronLeft, IconHome, IconList, IconMoon, IconPayment, IconSun, IconTeam } from "./icons";
import { ModalHost } from "./modals";
import { NewEntryForm } from "./new-entry-form";
import { Drawer, Toast } from "./ui/overlay";
import { type ModalState, UiContext, type UiValue } from "./ui-context";
import { ApView } from "./views/ap-view";
import { DashboardView } from "./views/dashboard-view";
import { FinanceView } from "./views/finance-view";
import { SpvView } from "./views/spv-view";
import { StaffView } from "./views/staff-view";

type View = "dashboard" | "staff" | "ap" | "spv" | "finance";
type DrawerContent = { kind: "detail"; id: string } | { kind: "new"; n: number };

const VIEW_ROLE: Record<View, Role> = {
  dashboard: "spv",
  staff: "staff",
  ap: "ap",
  spv: "spv",
  finance: "finance",
};

export default function WorkLogApp() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { ready, records, now } = useStore();
  const [view, setView] = useState<View>("dashboard");
  const [me, setMe] = useState<string>(STAFF[0]);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerContent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formCount = useRef(0);

  const role = VIEW_ROLE[view];

  // Sync with system theme on mount, then allow manual override
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDarkMode(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply manual theme override
  useEffect(() => {
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

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

  const counts = useMemo(() => {
    const apQueue = records.filter((r) => r.ap?.status === "waiting");
    return {
      dashboard: 0,
      staff: records.filter((r) => r.staff === me && needsStaffAction(r)).length,
      ap: apQueue.length,
      apHot: apQueue.some((r) => r.urgent),
      spv: records.filter((r) => stuckReason(r, now)).length,
      finance: records.filter((r) => stage(r) === "toinvoice").length,
    };
  }, [records, me, now]);

  const viewProps = { query, setQuery };

  const navItems: { id: View; label: string; icon: React.ReactNode; count: number; hot?: boolean }[] = [
    { id: "dashboard", label: "Beranda", icon: <IconHome />, count: 0 },
    { id: "staff",    label: "Tugas",   icon: <IconList />, count: counts.staff },
    { id: "ap",       label: "Pembayaran", icon: <IconPayment />, count: counts.ap, hot: counts.apHot },
    { id: "spv",      label: "Tim",     icon: <IconTeam />, count: counts.spv },
    { id: "finance",  label: "Keuangan", icon: <IconChart />, count: counts.finance },
  ];

  return (
    <UiContext.Provider value={ui}>
      <div className="app-shell">
        {/* ── Sidebar ── */}
        <aside className="sb">
          <a className="sb-logo" href="#" onClick={(e) => { e.preventDefault(); switchView("dashboard"); }}>
            <span className="sb-logo-mark">US</span>
            <span className="sb-logo-text">
              <b>US Travel</b>
              <small>Work log · Back office</small>
            </span>
          </a>

          <nav className="sb-nav" aria-label="Navigasi utama">
            <div className="sb-sec">Menu</div>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={"sb-item" + (view === item.id ? " active" : "")}
                onClick={() => switchView(item.id)}
                aria-current={view === item.id ? "page" : undefined}
              >
                {item.icon}
                {item.label}
                {ready && item.count > 0 && (
                  <span className={"sb-badge" + (view === item.id ? " active" : "") + (item.hot ? " hot" : "")}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="sb-footer">
            <div className="sb-staff-lbl">Masuk sebagai</div>
            <select
              className="sb-staff-sel"
              value={me}
              onChange={(e) => { setMe(e.target.value); setQuery(""); }}
              aria-label="Pilih staf"
            >
              {STAFF.map((s) => <option key={s}>{s}</option>)}
            </select>
            <div className="sb-theme" role="group" aria-label="Tema">
              <button className={!darkMode ? "on" : ""} onClick={() => setDarkMode(false)}>
                <IconSun /> Terang
              </button>
              <button className={darkMode ? "on" : ""} onClick={() => setDarkMode(true)}>
                <IconMoon /> Gelap
              </button>
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="content-wrap">
          <main>
            {!ready ? (
              <div className="sheet loading" aria-busy="true">Memuat work log...</div>
            ) : view === "dashboard" ? (
              <DashboardView me={me} onNavigate={(v) => switchView(v as View)} />
            ) : view === "staff" ? (
              <StaffView {...viewProps} />
            ) : view === "spv" ? (
              <SpvView {...viewProps} />
            ) : view === "ap" ? (
              <ApView {...viewProps} />
            ) : (
              <FinanceView {...viewProps} />
            )}
          </main>
          <p className="mock-note">
            Mockup interaktif — data contoh fiktif, tersimpan sementara di browser.{" "}
            <button className="copy" onClick={() => switchView("dashboard")}>
              <IconChevronLeft size={13} /> Beranda
            </button>
          </p>
        </div>
      </div>

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
