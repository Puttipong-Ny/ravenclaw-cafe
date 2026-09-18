import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  bangkokDayBounds,
  type OrderLine,
  type SavedOrder,
} from "@/lib/orders";
import type { Discount } from "@/lib/menu";

type OrderDoc = {
  id: string;
  at: Date;
  lines: OrderLine[];
  subtotal: number;
  discount: Discount;
  discountAmt: number;
  total: number;
  customerName?: string;
  staffName?: string;
};

function cleanName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : undefined;
}

function toSaved(doc: OrderDoc): SavedOrder {
  return {
    id: doc.id,
    at: new Date(doc.at).toISOString(),
    lines: doc.lines,
    subtotal: doc.subtotal,
    discount: doc.discount,
    discountAmt: doc.discountAmt,
    total: doc.total,
    customerName: doc.customerName,
    staffName: doc.staffName,
  };
}

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Missing MONGODB_URI" },
      { status: 503 },
    );
  }

  try {
    const { start, end } = bangkokDayBounds();
    const db = await getDb();
    const docs = await db
      .collection<OrderDoc>("orders")
      .find(
        { at: { $gte: start, $lte: end } },
        {
          projection: {
            id: 1,
            at: 1,
            lines: 1,
            subtotal: 1,
            discount: 1,
            discountAmt: 1,
            total: 1,
            customerName: 1,
            staffName: 1,
          },
        },
      )
      .sort({ at: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({ orders: docs.map(toSaved) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Missing MONGODB_URI" },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as Partial<SavedOrder>;
    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json({ error: "Empty order" }, { status: 400 });
    }
    if (typeof body.total !== "number" || typeof body.subtotal !== "number") {
      return NextResponse.json({ error: "Invalid totals" }, { status: 400 });
    }

    const order: OrderDoc = {
      id: body.id || `${Date.now()}`,
      at: new Date(),
      lines: body.lines,
      subtotal: body.subtotal,
      discount: body.discount ?? { type: "none", value: 0 },
      discountAmt: body.discountAmt ?? 0,
      total: body.total,
      customerName: cleanName(body.customerName),
      staffName: cleanName(body.staffName),
    };

    const db = await getDb();
    await db.collection<OrderDoc>("orders").insertOne(order);
    return NextResponse.json({ order: toSaved(order) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
  }
}

/** Clears today's orders (Bangkok day). */
export async function DELETE() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Missing MONGODB_URI" },
      { status: 503 },
    );
  }

  try {
    const { start, end } = bangkokDayBounds();
    const db = await getDb();
    await db.collection("orders").deleteMany({ at: { $gte: start, $lte: end } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to clear orders" }, { status: 500 });
  }
}
