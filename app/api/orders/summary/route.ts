import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { lineContents } from "@/lib/menu";

type Line = { id: string; name: string; qty: number };

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: "Missing MONGODB_URI" }, { status: 503 });
  }

  try {
    const db = await getDb();
    const docs = await db
      .collection<{ lines: Line[]; total: number; voided?: boolean }>("orders")
      .find(
        { voided: { $ne: true } },
        { projection: { lines: 1, total: 1 } },
      )
      .toArray();

    const products = new Map<string, number>();
    const sets = new Map<string, number>();
    let total = 0;

    for (const doc of docs) {
      total += doc.total || 0;
      for (const line of doc.lines ?? []) {
        const qty = line.qty || 0;
        if (qty <= 0) continue;
        sets.set(line.name, (sets.get(line.name) ?? 0) + qty);
        for (const part of lineContents(line.id, line.name)) {
          products.set(part, (products.get(part) ?? 0) + qty);
        }
      }
    }

    const byQty = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));

    return NextResponse.json({
      bills: docs.length,
      total,
      sets: byQty(sets),
      products: byQty(products),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
