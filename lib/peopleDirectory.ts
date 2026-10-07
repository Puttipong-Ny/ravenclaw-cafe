import type { Db } from "mongodb";
import {
  CASHIERS,
  SEED_ROLES,
  STAFF_ROSTER,
  type Gender,
  type RoleInfo,
} from "@/lib/staff";

export type PersonDoc = {
  name: string;
  role: string;
  gender?: Gender;
};

let pending: Promise<void> | null = null;

/** Inserts the built-in roster once per process. Existing rows are left alone. */
export function ensureDirectory(db: Db): Promise<void> {
  if (!pending) {
    pending = seed(db).catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

async function seed(db: Db) {
  const roles = db.collection<RoleInfo>("roles");
  const people = db.collection<PersonDoc>("people");
  await roles.bulkWrite(
    SEED_ROLES.map((role) => ({
      updateOne: {
        filter: { id: role.id },
        update: { $setOnInsert: role },
        upsert: true,
      },
    })),
  );
  const docs: PersonDoc[] = [
    ...STAFF_ROSTER.map((member) => ({
      name: member.name,
      role: "staff",
      gender: member.gender,
    })),
    ...CASHIERS.map((name) => ({ name, role: "cashier" })),
  ];
  await people.bulkWrite(
    docs.map((person) => ({
      updateOne: {
        filter: { name: person.name },
        update: { $setOnInsert: person },
        upsert: true,
      },
    })),
  );
}

export async function listDirectory(db: Db): Promise<{
  roles: RoleInfo[];
  people: PersonDoc[];
}> {
  await ensureDirectory(db);
  const [roles, people] = await Promise.all([
    db
      .collection<RoleInfo>("roles")
      .find({}, { projection: { _id: 0, id: 1, label: 1 } })
      .toArray(),
    db
      .collection<PersonDoc>("people")
      .find({}, { projection: { _id: 0, name: 1, role: 1, gender: 1 } })
      .toArray(),
  ]);
  const rank = (id: string) => (id === "staff" ? 0 : id === "cashier" ? 1 : 2);
  roles.sort(
    (a, b) => rank(a.id) - rank(b.id) || a.label.localeCompare(b.label, "th"),
  );
  people.sort((a, b) => a.name.localeCompare(b.name, "th"));
  return { roles, people };
}
