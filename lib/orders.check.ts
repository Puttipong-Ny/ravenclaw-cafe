import assert from "node:assert/strict";
import {
  bangkokDayBounds,
  bangkokDayKey,
  formatDayLabel,
  formatDayShort,
  isDayKey,
  shiftBangkokDay,
  summarizeOrders,
} from "./orders";

const day = bangkokDayKey(new Date("2026-09-18T10:00:00+07:00"));
assert.equal(day, "2026-09-18");
assert.equal(isDayKey("2026-09-18"), true);
assert.equal(isDayKey("nope"), false);
assert.equal(shiftBangkokDay("2026-09-18", -1), "2026-09-17");
assert.equal(shiftBangkokDay("2026-09-18", 1), "2026-09-19");
assert.ok(formatDayLabel("2026-09-18").length > 0);
assert.ok(formatDayShort("2026-09-18").length > 0);

const { start, end } = bangkokDayBounds("2026-09-18");
assert.equal(start.toISOString(), "2026-09-17T17:00:00.000Z");
assert.ok(end > start);

const summary = summarizeOrders([
  {
    id: "1",
    at: "2026-09-18T03:00:00.000Z",
    lines: [{ id: "latte", name: "Latte", price: 75, qty: 1 }],
    subtotal: 75,
    discount: { type: "none", value: 0 },
    discountAmt: 0,
    total: 75,
  },
]);
assert.equal(summary.count, 1);
assert.equal(summary.total, 75);

console.log("orders helper ok");
