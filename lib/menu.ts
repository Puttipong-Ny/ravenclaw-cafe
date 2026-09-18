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
        id: "set-espresso-sandwich",
        name: "Espresso + Sandwich",
        detail: "เครื่องดื่ม + อาหาร",
        price: 140,
      },
      {
        id: "set-latte-cookie",
        name: "Latte + Cookie",
        detail: "เครื่องดื่ม + ของหวาน",
        price: 110,
      },
    ],
  },
  {
    id: "drinks",
    name: "เครื่องดื่ม",
    items: [
      { id: "espresso", name: "Espresso", price: 55 },
      { id: "americano", name: "Americano", price: 60 },
      { id: "latte", name: "Latte", price: 75 },
      { id: "matcha", name: "Matcha Latte", price: 85 },
    ],
  },
  {
    id: "food",
    name: "อาหาร",
    items: [
      { id: "croissant", name: "Croissant", price: 65 },
      { id: "sandwich", name: "Sandwich", price: 95 },
      { id: "brownie", name: "Brownie", price: 55 },
      { id: "cookie", name: "Cookie", price: 45 },
    ],
  },
];

export type DiscountType = "none" | "percent" | "amount";

export type Discount = {
  type: DiscountType;
  value: number;
};

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

export function formatBaht(n: number): string {
  return `฿${n.toLocaleString("th-TH")}`;
}
