"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  MY_ROLE_KEY,
  MY_STAFF_KEY,
  readMyRole,
  readMyStaff,
  writeMyRole,
  writeMyStaff,
  type Role,
} from "@/lib/staff";

/** Same-tab writes don't fire `storage`, so saves announce themselves. */
const CHANGED = "ravenclaw-me-changed";

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === MY_STAFF_KEY || event.key === MY_ROLE_KEY) onChange();
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
  const storedName = useSyncExternalStore(subscribe, readMyStaff, () => null);
  const storedRole = useSyncExternalStore(subscribe, readMyRole, () => null);

  function save(next: string) {
    writeMyStaff(next);
    announce();
  }

  function saveRole(next: Role) {
    writeMyRole(next);
    if (next === "cashier") writeMyStaff("");
    announce();
  }

  useEffect(() => {
    if (storedRole === "cashier" && storedName) {
      writeMyStaff("");
      announce();
    }
  }, [storedRole, storedName]);

  return {
    name: storedName ?? "",
    role: (storedRole ?? "staff") as Role,
    ready: storedName !== null,
    save,
    saveRole,
  };
}
