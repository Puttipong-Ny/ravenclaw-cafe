import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isStaffName, staffBoard } from "@/lib/staff";

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
    const docs = await db
      .collection<StaffDoc>("staffStatus")
      .find({}, { projection: { name: 1, free: 1 } })
      .toArray();
    return NextResponse.json({ staff: staffBoard(docs) });
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
  if (!isStaffName(name) || typeof body.free !== "boolean") {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const db = await getDb();
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
