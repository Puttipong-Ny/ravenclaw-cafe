import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { lineContents } from "@/lib/menu";
import { bangkokDayKey } from "@/lib/orders";
import { summaryWorkbook } from "@/lib/summaryExcel";

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: "Missing MONGODB_URI" }, { status: 503 });
  }

  try {
    const db = await getDb();
    const docs = await db
      .collection<{
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

    const xml = summaryWorkbook({
      bills: docs.length,
      total,
      sets: byQty(sets),
      products: byQty(products),
      orders: docs.map((doc) => ({
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

    const day = bangkokDayKey();
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="ravencool-summary-${day}.xls"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to export summary" }, { status: 500 });
  }
}
