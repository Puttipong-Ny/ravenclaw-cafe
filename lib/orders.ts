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
  total: number;
  /** Optional — customer name */
  customerName?: string;
  /** Optional — cashier / staff name */
  staffName?: string;
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

export function bangkokDayBounds(day = bangkokDayKey()) {
  return {
    day,
    start: new Date(`${day}T00:00:00+07:00`),
    end: new Date(`${day}T23:59:59.999+07:00`),
  };
}

export function summarizeOrders(orders: SavedOrder[]) {
  return {
    count: orders.length,
    total: orders.reduce((sum, o) => sum + o.total, 0),
    orders,
  };
}
