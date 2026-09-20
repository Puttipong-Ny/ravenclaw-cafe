export type MenuItem = {
  id: string;
  name: string;
  price: number;
  /** Short line under the name, e.g. set contents */
  detail?: string;
};

export type MenuSet = {
  id: string;
  name: string;
  items: MenuItem[];
};

export const MENU_SETS: MenuSet[] = [
  {
    id: "sets",
    name: "เซ็ต",
    items: [
      {
        id: "set-a",
        name: "Set A",
        price: 300,
        detail: "Cupcake + Charm Tea",
      },
      {
        id: "set-b",
        name: "Set B",
        price: 300,
        detail: "Pudding + Fairy Tea",
      },
      {
        id: "set-special",
        name: "Set Special",
        price: 3500,
        detail: "Moon cake + Butter Beer · ซื้อ 3 = 10,000",
      },
    ],
  },
];

const MENU_BY_ID = new Map(
  MENU_SETS.flatMap((set) => set.items.map((item) => [item.id, item] as const)),
);

export function getMenuItem(id: string): MenuItem | undefined {
  return MENU_BY_ID.get(id);
}

export type DiscountType = "none" | "percent" | "amount";

export type Discount = {
  type: DiscountType;
  value: number;
};

export function parseDiscount(raw: unknown): Discount {
  if (!raw || typeof raw !== "object") return { type: "none", value: 0 };
  const obj = raw as { type?: unknown; value?: unknown };
  const type =
    obj.type === "percent" || obj.type === "amount" || obj.type === "none"
      ? obj.type
      : "none";
  const value =
    typeof obj.value === "number" && Number.isFinite(obj.value)
      ? Math.max(0, obj.value)
      : 0;
  return { type, value };
}

export function calcSubtotal(lines: { price: number; qty: number }[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.qty, 0);
}

/** Discount never exceeds subtotal; percent clamped 0–100. */
export function calcDiscount(subtotal: number, discount: Discount): number {
  if (subtotal <= 0 || discount.type === "none" || discount.value <= 0) return 0;
  if (discount.type === "percent") {
    const pct = Math.min(100, discount.value);
    return Math.min(subtotal, Math.round((subtotal * pct) / 100));
  }
  return Math.min(subtotal, Math.round(discount.value));
}

export function calcTotal(subtotal: number, discount: Discount): number {
  return Math.max(0, subtotal - calcDiscount(subtotal, discount));
}

export const SPECIAL_SET_ID = "set-special";
const SPECIAL_BUNDLE_QTY = 3;
const SPECIAL_BUNDLE_PRICE = 10000;

/** 500 off per 3 Set Special (3 × 3500 → 10000). */
export function calcSetPromo(lines: { id: string; qty: number }[]): number {
  const item = getMenuItem(SPECIAL_SET_ID);
  if (!item) return 0;
  const qty = lines.reduce(
    (n, line) => (line.id === SPECIAL_SET_ID ? n + line.qty : n),
    0,
  );
  const bundles = Math.floor(qty / SPECIAL_BUNDLE_QTY);
  return bundles * (item.price * SPECIAL_BUNDLE_QTY - SPECIAL_BUNDLE_PRICE);
}

export function tallyOrder(
  lines: { id: string; price: number; qty: number }[],
  discount: Discount,
) {
  const subtotal = calcSubtotal(lines);
  const promo = calcSetPromo(lines);
  const extra = calcDiscount(subtotal - promo, discount);
  const discountAmt = promo + extra;
  return { subtotal, promo, extra, discountAmt, total: subtotal - discountAmt };
}

/** Build order lines + totals from menu catalog (server-trusted). */
export function buildTrustedLines(rawLines: unknown):
  | {
      lines: { id: string; name: string; price: number; qty: number }[];
      subtotal: number;
    }
  | { error: string } {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return { error: "Empty order" };
  }

  const merged = new Map<string, number>();
  for (const raw of rawLines) {
    if (!raw || typeof raw !== "object") continue;
    const id = (raw as { id?: unknown }).id;
    const qty = (raw as { qty?: unknown }).qty;
    if (typeof id !== "string" || !getMenuItem(id)) {
      return { error: `Unknown item: ${String(id)}` };
    }
    const n =
      typeof qty === "number" && Number.isFinite(qty) ? Math.floor(qty) : 0;
    if (n <= 0 || n > 99) return { error: "Invalid quantity" };
    merged.set(id, (merged.get(id) ?? 0) + n);
  }

  if (merged.size === 0) return { error: "Empty order" };

  const lines = [...merged.entries()].map(([id, qty]) => {
    const item = getMenuItem(id)!;
    return { id: item.id, name: item.name, price: item.price, qty };
  });

  return { lines, subtotal: calcSubtotal(lines) };
}

export function formatSickles(n: number): string {
  return `${n.toLocaleString("en-US")} Sickles`;
}
