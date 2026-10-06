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

export const GENDER_LABEL: Record<Gender, string> = {
  f: "หญิง",
  m: "ชาย",
};

export function isStaffName(name: string): boolean {
  return STAFF.includes(name);
}

export type Role = "staff" | "cashier";

export const ROLE_LABEL: Record<Role, string> = {
  staff: "พนักงาน",
  cashier: "พนักงานแคชเชียร์",
};

export const MY_STAFF_KEY = "ravenclaw-me";
export const MY_ROLE_KEY = "ravenclaw-role";

export function readMyStaff(): string {
  try {
    const name = localStorage.getItem(MY_STAFF_KEY) ?? "";
    return isStaffName(name) ? name : "";
  } catch {
    return "";
  }
}

export function writeMyStaff(name: string) {
  try {
    if (isStaffName(name)) localStorage.setItem(MY_STAFF_KEY, name);
    else localStorage.removeItem(MY_STAFF_KEY);
  } catch {
    /* private mode */
  }
}

export function readMyRole(): Role {
  try {
    return localStorage.getItem(MY_ROLE_KEY) === "cashier" ? "cashier" : "staff";
  } catch {
    return "staff";
  }
}

export function writeMyRole(role: Role) {
  try {
    localStorage.setItem(MY_ROLE_KEY, role);
  } catch {
    /* private mode */
  }
}

/** Unknown or extra names stay off the board. Missing rows count as not free. */
export function staffBoard(
  saved: { name?: string; free?: unknown }[],
): StaffStatus[] {
  const free = new Set(
    saved
      .filter((row) => row.free === true && typeof row.name === "string")
      .map((row) => row.name as string),
  );
  return STAFF_ROSTER.map((member) => ({
    ...member,
    free: free.has(member.name),
  }));
}

export function byGender(board: StaffStatus[], gender: Gender): StaffStatus[] {
  return board.filter((row) => row.gender === gender);
}
