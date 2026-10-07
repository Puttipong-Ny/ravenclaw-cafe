export type Gender = "f" | "m";

export type StaffMember = {
  name: string;
  gender: Gender;
};

export type StaffStatus = StaffMember & {
  free: boolean;
};

/** ponytail: genders are a placeholder guess — fix the wrong ones in place. */
export const STAFF_ROSTER: StaffMember[] = [
  { name: "Adelriana Fe Ferbulma", gender: "f" },
  { name: "Amin Ramirez", gender: "m" },
  { name: "Arloid Deeney", gender: "m" },
  { name: "Celine Cayla", gender: "f" },
  { name: "Dagnis De Valence", gender: "m" },
  { name: "Deimos Lolivan", gender: "m" },
  { name: "Eric Alaric Moonnox", gender: "m" },
  { name: "Gazelle Tataros Wayne", gender: "m" },
  { name: "Gemma Velestra Winterheart", gender: "f" },
  { name: "Jaymie Maccoille", gender: "f" },
  { name: "Kazuha Bloomfield", gender: "f" },
  { name: "Lim Shinyu", gender: "m" },
  { name: "LiYin Nina Rosendahl", gender: "f" },
  { name: "Mojiko Yellowtime", gender: "f" },
  { name: "Peach Grimoire", gender: "m" },
  { name: "Rachel Kaze", gender: "f" },
  { name: "Robert Raymond", gender: "m" },
  { name: "Seralynn Musetia", gender: "f" },
  { name: "Thames Aphroditemes", gender: "m" },
  { name: "Way Whal Wayne", gender: "m" },
];

export const STAFF = STAFF_ROSTER.map((member) => member.name);

export const CASHIERS = [
  "Arias Alphebias",
  "Jenevieve Bainfeild",
  "Salacia Varentia Noxtelis",
];

export const GENDER_LABEL: Record<Gender, string> = {
  f: "หญิง",
  m: "ชาย",
};

export function isStaffName(name: string): boolean {
  return STAFF.includes(name);
}

export function isCashierName(name: string): boolean {
  return CASHIERS.includes(name);
}

export type RoleInfo = {
  id: string;
  label: string;
};

export const SEED_ROLES: RoleInfo[] = [
  { id: "staff", label: "พนักงาน" },
  { id: "cashier", label: "พนักงานแคชเชียร์" },
];

export const ROLE_LABEL: Record<string, string> = {
  staff: "พนักงาน",
  cashier: "พนักงานแคชเชียร์",
};

/** Match an existing role id or label, or treat the text as a new role. */
export function resolveRole(
  roles: readonly RoleInfo[],
  input: string,
): { id: string; label: string; isNew: boolean } | null {
  const text = input.trim().slice(0, 40);
  if (!text) return null;
  const found = roles.find((role) => role.id === text || role.label === text);
  if (found) return { id: found.id, label: found.label, isNew: false };
  return { id: text, label: text, isNew: true };
}

export const MY_STAFF_KEY = "ravenclaw-me";
export const MY_CASHIER_KEY = "ravenclaw-cashier";
export const MY_ROLE_KEY = "ravenclaw-role";

const NAMES_KEY = "ravenclaw-names";

function readNameMap(): Record<string, string> {
  const names: Record<string, string> = {};
  const raw = localStorage.getItem(NAMES_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string" && value.trim()) {
          names[key] = value.trim().slice(0, 80);
        }
      }
    }
  }
  if (!names.staff) {
    const old = localStorage.getItem(MY_STAFF_KEY)?.trim();
    if (old) names.staff = old.slice(0, 80);
  }
  if (!names.cashier) {
    const old = localStorage.getItem(MY_CASHIER_KEY)?.trim();
    if (old) names.cashier = old.slice(0, 80);
  }
  return names;
}

/** Stable string snapshot for useSyncExternalStore. */
export function readNamesJson(): string {
  try {
    return JSON.stringify(readNameMap());
  } catch {
    return "{}";
  }
}

export function writeNameForRole(role: string, name: string) {
  try {
    const names = readNameMap();
    const clean = name.trim().slice(0, 80);
    if (clean) names[role] = clean;
    else delete names[role];
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
    if (role === "staff") {
      if (clean) localStorage.setItem(MY_STAFF_KEY, clean);
      else localStorage.removeItem(MY_STAFF_KEY);
    }
    if (role === "cashier") {
      if (clean) localStorage.setItem(MY_CASHIER_KEY, clean);
      else localStorage.removeItem(MY_CASHIER_KEY);
    }
  } catch {
    /* private mode */
  }
}

export function readMyStaff(): string {
  try {
    return readNameMap().staff ?? "";
  } catch {
    return "";
  }
}

export function writeMyStaff(name: string) {
  writeNameForRole("staff", name);
}

export function readMyCashier(): string {
  try {
    return readNameMap().cashier ?? "";
  } catch {
    return "";
  }
}

export function writeMyCashier(name: string) {
  writeNameForRole("cashier", name);
}

export function readMyRole(): string {
  try {
    const role = localStorage.getItem(MY_ROLE_KEY)?.trim() ?? "";
    return role ? role.slice(0, 40) : "staff";
  } catch {
    return "staff";
  }
}

export function writeMyRole(role: string) {
  try {
    const clean = role.trim().slice(0, 40);
    if (clean) localStorage.setItem(MY_ROLE_KEY, clean);
  } catch {
    /* private mode */
  }
}

/** Roster comes from the caller. Missing rows count as not free. */
export function staffBoard(
  roster: StaffMember[],
  saved: { name?: string; free?: unknown }[],
): StaffStatus[] {
  const free = new Set(
    saved
      .filter((row) => row.free === true && typeof row.name === "string")
      .map((row) => row.name as string),
  );
  const order = new Map(STAFF_ROSTER.map((member, index) => [member.name, index]));
  return [...roster]
    .sort(
      (a, b) =>
        (order.get(a.name) ?? 1000) - (order.get(b.name) ?? 1000) ||
        a.name.localeCompare(b.name, "th"),
    )
    .map((member) => ({
      ...member,
      free: free.has(member.name),
    }));
}

export function byGender(board: StaffStatus[], gender: Gender): StaffStatus[] {
  return board.filter((row) => row.gender === gender);
}
