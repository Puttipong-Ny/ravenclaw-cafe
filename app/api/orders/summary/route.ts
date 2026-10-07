import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { lineContents } from "@/lib/menu";

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: "Missing MONGODB_URI" }, { status: 503 });
  }

  try {
    const db = await getDb();
    const docs = await db
      .collection<{
        id: string;
        at: Date;
        lines: { id: string; name: string; price: number; qty: number }[];
        total: number;
        discountAmt?: number;
        tipAmt?: number;
        customerName?: string;
        staffName?: string;
        cashierName?: string;
        tableNo?: string;
      }>("orders")
      .find(
        { voided: { $ne: true } },
        {
          projection: {
            id: 1,
            at: 1,
            lines: 1,
            total: 1,
            discountAmt: 1,
            tipAmt: 1,
            customerName: 1,
            staffName: 1,
            cashierName: 1,
            tableNo: 1,
          },
        },
      )
      .sort({ at: -1 })
      .limit(400)
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
      orders: docs.map((doc) => ({
        id: doc.id,
        at: new Date(doc.at).toISOString(),
        lines: doc.lines ?? [],
        total: doc.total || 0,
        discountAmt: doc.discountAmt || 0,
        tipAmt: doc.tipAmt || 0,
        customerName: doc.customerName,
        staffName: doc.staffName,
        cashierName: doc.cashierName,
        tableNo: doc.tableNo,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
