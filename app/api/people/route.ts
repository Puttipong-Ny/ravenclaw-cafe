import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listDirectory, type PersonDoc } from "@/lib/peopleDirectory";
import { resolveRole, type Gender } from "@/lib/staff";

function unavailable() {
  return NextResponse.json({ error: "Missing MONGODB_URI" }, { status: 503 });
}

export async function GET() {
  if (!process.env.MONGODB_URI) return unavailable();
  try {
    const db = await getDb();
    return NextResponse.json(await listDirectory(db));
  } catch {
    return NextResponse.json({ error: "โหลดรายชื่อไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!process.env.MONGODB_URI) return unavailable();

  let body: { name?: unknown; role?: unknown; gender?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const roleText = typeof body.role === "string" ? body.role : "";
  if (!name) {
    return NextResponse.json({ error: "กรอกชื่อ" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const directory = await listDirectory(db);
    const role = resolveRole(directory.roles, roleText);
    if (!role) {
      return NextResponse.json({ error: "กรอกบทบาท" }, { status: 400 });
    }
    if (directory.people.some((person) => person.name === name)) {
      return NextResponse.json({ error: "มีชื่อนี้อยู่แล้ว" }, { status: 409 });
    }

    const doc: PersonDoc = { name, role: role.id };
    if (role.id === "staff") {
      if (body.gender !== "f" && body.gender !== "m") {
        return NextResponse.json({ error: "เลือกเพศ" }, { status: 400 });
      }
      doc.gender = body.gender as Gender;
    }

    if (role.isNew) {
      await db.collection("roles").insertOne({ id: role.id, label: role.label });
    }
    await db.collection<PersonDoc>("people").insertOne(doc);
    return NextResponse.json(await listDirectory(db), { status: 201 });
  } catch {
    return NextResponse.json({ error: "เพิ่มชื่อไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!process.env.MONGODB_URI) return unavailable();

  const name = new URL(request.url).searchParams.get("name")?.trim().slice(0, 80) ?? "";
  if (!name) {
    return NextResponse.json({ error: "ไม่พบชื่อ" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const people = db.collection<PersonDoc>("people");
    const existing = await people.findOne({ name });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบชื่อ" }, { status: 404 });
    }
    await people.deleteOne({ name });
    await db.collection("staffStatus").deleteOne({ name });
    const left = await people.countDocuments({ role: existing.role });
    if (left === 0 && existing.role !== "staff" && existing.role !== "cashier") {
      await db.collection("roles").deleteOne({ id: existing.role });
    }
    return NextResponse.json(await listDirectory(db));
  } catch {
    return NextResponse.json({ error: "เอาชื่อออกไม่สำเร็จ" }, { status: 500 });
  }
}
