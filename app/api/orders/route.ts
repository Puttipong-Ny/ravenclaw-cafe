import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  bangkokDayBounds,
  bangkokDayKey,
  isDayKey,
  type OrderLine,
  type SavedOrder,
} from "@/lib/orders";
import {
  buildTrustedLines,
  calcDiscount,
  calcTotal,
  parseDiscount,
  type Discount,
} from "@/lib/menu";

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
  voided?: boolean;
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
    voided: doc.voided || undefined,
  };
}

function dayFromRequest(request: Request): string {
  const raw = new URL(request.url).searchParams.get("day");
  if (raw && isDayKey(raw)) return raw;
  return bangkokDayKey();
}

export async function GET(request: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Missing MONGODB_URI" },
      { status: 503 },
    );
  }

  try {
    const day = dayFromRequest(request);
    const { start, end } = bangkokDayBounds(day);
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
            voided: 1,
          },
        },
      )
      .sort({ at: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({ day, orders: docs.map(toSaved) });
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
    const body = (await request.json()) as {
      lines?: unknown;
      discount?: unknown;
      customerName?: unknown;
      staffName?: unknown;
    };

    const built = buildTrustedLines(body.lines);
    if ("error" in built) {
      return NextResponse.json({ error: built.error }, { status: 400 });
    }

    const discount = parseDiscount(body.discount);
    const discountAmt = calcDiscount(built.subtotal, discount);
    const total = calcTotal(built.subtotal, discount);

    const order: OrderDoc = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date(),
      lines: built.lines,
      subtotal: built.subtotal,
      discount,
      discountAmt,
      total,
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

/**
 * DELETE ?id=xxx  → soft-void one bill
 * DELETE ?day=YYYY-MM-DD → wipe that Bangkok day
 */
export async function DELETE(request: Request) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { error: "Missing MONGODB_URI" },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const db = await getDb();

    if (id) {
      const result = await db.collection<OrderDoc>("orders").updateOne(
        { id, voided: { $ne: true } },
        { $set: { voided: true } },
      );
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, id, voided: true });
    }

    const day = dayFromRequest(request);
    const { start, end } = bangkokDayBounds(day);
    await db.collection("orders").deleteMany({ at: { $gte: start, $lte: end } });
    return NextResponse.json({ ok: true, day });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to clear orders" }, { status: 500 });
  }
}
