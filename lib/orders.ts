import type { Discount } from "./menu";

export type OrderLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type SavedOrder = {
  id: string;
  at: string; // ISO
  lines: OrderLine[];
  subtotal: number;
  discount: Discount;
  discountAmt: number;
  /** Optional — tip added on top of the discounted total */
  tip?: Discount;
  tipAmt?: number;
  total: number;
  /** Optional — customer name */
  customerName?: string;
  /** Optional — who served */
  staffName?: string;
  /** Optional — who took payment */
  cashierName?: string;
  /** Optional — table number */
  tableNo?: string;
  /** Soft-cancelled bill */
  voided?: boolean;
};

/** Bangkok calendar day YYYY-MM-DD */
export function bangkokDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: string): boolean {
  if (!DAY_RE.test(value)) return false;
  const t = Date.parse(`${value}T12:00:00+07:00`);
  return !Number.isNaN(t);
}

export function bangkokDayBounds(day = bangkokDayKey()) {
  const key = isDayKey(day) ? day : bangkokDayKey();
  return {
    day: key,
    start: new Date(`${key}T00:00:00+07:00`),
    end: new Date(`${key}T23:59:59.999+07:00`),
  };
}

/** Shift a YYYY-MM-DD Bangkok day by ±n calendar days. */
export function shiftBangkokDay(day: string, delta: number): string {
  const base = isDayKey(day) ? day : bangkokDayKey();
  const d = new Date(`${base}T12:00:00+07:00`);
  d.setTime(d.getTime() + delta * 24 * 60 * 60 * 1000);
  return bangkokDayKey(d);
}

export function formatDayLabel(day: string): string {
  const key = isDayKey(day) ? day : bangkokDayKey();
  const d = new Date(`${key}T12:00:00+07:00`);
  return d.toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Compact label e.g. "19 ก.ย." */
export function formatDayShort(day: string): string {
  const key = isDayKey(day) ? day : bangkokDayKey();
  const d = new Date(`${key}T12:00:00+07:00`);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

export function ordersForStaff(orders: SavedOrder[], staffName: string): SavedOrder[] {
  const name = staffName.trim();
  if (!name) return [];
  return orders.filter((order) => order.staffName === name);
}

export function summarizeOrders(orders: SavedOrder[]) {
  const active = orders.filter((o) => !o.voided);
  return {
    count: active.length,
    total: active.reduce((sum, o) => sum + o.total, 0),
    orders,
  };
}
