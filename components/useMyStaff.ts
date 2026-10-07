"use client";

import { useSyncExternalStore } from "react";
import {
  MY_CASHIER_KEY,
  MY_ROLE_KEY,
  MY_STAFF_KEY,
  readMyRole,
  readNamesJson,
  writeMyRole,
  writeNameForRole,
} from "@/lib/staff";

/** Same-tab writes don't fire `storage`, so saves announce themselves. */
const CHANGED = "ravenclaw-me-changed";

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === MY_STAFF_KEY ||
      event.key === MY_CASHIER_KEY ||
      event.key === MY_ROLE_KEY ||
      event.key === "ravenclaw-names"
    ) {
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED, onChange);
  };
}

function announce() {
  window.dispatchEvent(new Event(CHANGED));
}

/** `null` until the browser store is readable, so callers can hold off rendering. */
export function useMyStaff() {
  const namesJson = useSyncExternalStore(subscribe, readNamesJson, () => null);
  const storedRole = useSyncExternalStore(subscribe, readMyRole, () => null);
  const role = storedRole ?? "staff";
  const names = (namesJson ? JSON.parse(namesJson) : {}) as Record<string, string>;

  function save(next: string) {
    writeNameForRole(role, next);
    announce();
  }

  function saveRole(next: string) {
    writeMyRole(next);
    announce();
  }

  return {
    name: names[role] ?? "",
    cashier: names.cashier ?? "",
    role,
    ready: namesJson !== null && storedRole !== null,
    save,
    saveRole,
  };
}
