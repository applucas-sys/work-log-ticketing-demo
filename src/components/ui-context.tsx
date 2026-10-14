"use client";

import { createContext, useContext } from "react";
import type { Role } from "@/lib/types";

export type ModalKind = "issue" | "invoice" | "pay" | "revise";
export interface ModalState {
  kind: ModalKind;
  id: string;
}

export interface UiValue {
  role: Role;
  /** Logged-in ticketing staff (used when role is "staff"). */
  me: string;
  /** Name written to the activity log for the current user. */
  actor: string;
  openDetail: (id: string) => void;
  openNew: () => void;
  closeDrawer: () => void;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  toast: (msg: string) => void;
}

export const UiContext = createContext<UiValue | null>(null);

export function useUi(): UiValue {
  const v = useContext(UiContext);
  if (!v) throw new Error("useUi must be used inside the app shell");
  return v;
}
