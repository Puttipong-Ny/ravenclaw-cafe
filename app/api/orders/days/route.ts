import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export type DaySummary = {
  day: string;
  count: number;
  total: number;
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
    const rows = await db
      .collection("orders")
      .aggregate<{ _id: string; count: number; total: number }>([
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$at",
                timezone: "Asia/Bangkok",
              },
            },
            count: { $sum: 1 },
            total: { $sum: "$total" },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 120 },
      ])
      .toArray();

    const days: DaySummary[] = rows.map((r) => ({
      day: r._id,
      count: r.count,
      total: r.total,
    }));

    return NextResponse.json({ days });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load days" }, { status: 500 });
  }
}
