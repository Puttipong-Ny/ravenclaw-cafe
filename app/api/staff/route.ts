import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listDirectory } from "@/lib/peopleDirectory";
import { staffBoard, type StaffMember } from "@/lib/staff";

type StaffDoc = {
  name: string;
  free: boolean;
  at: Date;
};

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Missing MONGODB_URI" },
      { status: 503 },
    );
  }

  try {
    const db = await getDb();
    const { people } = await listDirectory(db);
    const roster: StaffMember[] = people.flatMap((person) =>
      person.role === "staff" && (person.gender === "f" || person.gender === "m")
        ? [{ name: person.name, gender: person.gender }]
        : [],
    );
    const docs = await db
      .collection<StaffDoc>("staffStatus")
      .find({}, { projection: { name: 1, free: 1 } })
      .toArray();
    return NextResponse.json({ staff: staffBoard(roster, docs) });
  } catch {
    return NextResponse.json(
      { error: "โหลดสถานะพนักงานไม่สำเร็จ" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Missing MONGODB_URI" },
      { status: 503 },
    );
  }

  let body: { name?: unknown; free?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; free?: unknown };
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || typeof body.free !== "boolean") {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const { people } = await listDirectory(db);
    const known = people.some(
      (person) => person.name === name && person.role === "staff",
    );
    if (!known) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }
    await db.collection<StaffDoc>("staffStatus").updateOne(
      { name },
      { $set: { name, free: body.free, at: new Date() } },
      { upsert: true },
    );
    return NextResponse.json({ name, free: body.free });
  } catch {
    return NextResponse.json(
      { error: "บันทึกสถานะพนักงานไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
