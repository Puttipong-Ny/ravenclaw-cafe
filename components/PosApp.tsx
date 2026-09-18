"use client";

import { useState } from "react";
import {
  MENU_SETS,
  type Discount,
  type DiscountType,
  type MenuItem,
  calcDiscount,
  calcSubtotal,
  calcTotal,
  formatBaht,
} from "@/lib/menu";

type CartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export default function PosApp() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = useState("");
  const [paidFlash, setPaidFlash] = useState(false);

  const discount: Discount = {
    type: discountType,
    value: Number(discountValue) || 0,
  };
  const subtotal = calcSubtotal(cart);
  const discountAmt = calcDiscount(subtotal, discount);
  const total = calcTotal(subtotal, discount);

  function addItem(item: MenuItem) {
    setPaidFlash(false);
    setCart((prev) => {
      const existing = prev.find((l) => l.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.id === item.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  function clearOrder() {
    setCart([]);
    setDiscountType("none");
    setDiscountValue("");
    setPaidFlash(false);
  }

  function pay() {
    if (cart.length === 0) return;
    setPaidFlash(true);
    setCart([]);
    setDiscountType("none");
    setDiscountValue("");
  }

  return (
    <div className="pos-shell">
      <header className="pos-header">
        <div>
          <p className="pos-brand">Ravenclaw Cafe</p>
          <h1 className="pos-title">POS</h1>
        </div>
        <button type="button" className="btn-ghost" onClick={clearOrder}>
          ล้างออเดอร์
        </button>
      </header>

      <div className="pos-grid">
        <section className="menu-panel" aria-label="เมนู">
          {MENU_SETS.map((set) => (
            <div key={set.id} className="menu-set">
              <h2 className="menu-set-title">{set.name}</h2>
              <div className="menu-grid">
                {set.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="menu-btn"
                    onClick={() => addItem(item)}
                  >
                    <span className="menu-btn-text">
                      <span className="menu-btn-name">{item.name}</span>
                      {item.detail ? (
                        <span className="menu-btn-detail">{item.detail}</span>
                      ) : null}
                    </span>
                    <span className="menu-btn-price">{formatBaht(item.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <aside className="cart-panel" aria-label="ตะกร้า">
          <h2 className="cart-title">ออเดอร์</h2>

          {paidFlash && (
            <p className="paid-flash" role="status">
              รับชำระแล้ว — พร้อมออเดอร์ใหม่
            </p>
          )}

          {cart.length === 0 && !paidFlash ? (
            <p className="cart-empty">แตะเมนูเพื่อเพิ่มรายการ</p>
          ) : (
            <ul className="cart-list">
              {cart.map((line) => (
                <li key={line.id} className="cart-line">
                  <div className="cart-line-info">
                    <span className="cart-line-name">{line.name}</span>
                    <span className="cart-line-meta">
                      {formatBaht(line.price)} × {line.qty}
                    </span>
                  </div>
                  <div className="cart-line-actions">
                    <button
                      type="button"
                      className="qty-btn"
                      aria-label={`ลด ${line.name}`}
                      onClick={() => changeQty(line.id, -1)}
                    >
                      −
                    </button>
                    <span className="qty-val">{line.qty}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      aria-label={`เพิ่ม ${line.name}`}
                      onClick={() => changeQty(line.id, 1)}
                    >
                      +
                    </button>
                    <span className="cart-line-sum">
                      {formatBaht(line.price * line.qty)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="discount-box">
            <p className="discount-label">ส่วนลด</p>
            <div className="discount-types">
              {(
                [
                  ["none", "ไม่มี"],
                  ["percent", "%"],
                  ["amount", "บาท"],
                ] as const
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  className={
                    discountType === type
                      ? "discount-type is-active"
                      : "discount-type"
                  }
                  onClick={() => {
                    setDiscountType(type);
                    if (type === "none") setDiscountValue("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {discountType !== "none" && (
              <input
                className="discount-input"
                type="number"
                min={0}
                max={discountType === "percent" ? 100 : undefined}
                inputMode="decimal"
                placeholder={discountType === "percent" ? "เช่น 10" : "เช่น 20"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            )}
          </div>

          <dl className="totals">
            <div className="totals-row">
              <dt>ยอดรวม</dt>
              <dd>{formatBaht(subtotal)}</dd>
            </div>
            {discountAmt > 0 && (
              <div className="totals-row is-discount">
                <dt>ส่วนลด</dt>
                <dd>−{formatBaht(discountAmt)}</dd>
              </div>
            )}
            <div className="totals-row is-total">
              <dt>สุทธิ</dt>
              <dd>{formatBaht(total)}</dd>
            </div>
          </dl>

          <button
            type="button"
            className="pay-btn"
            disabled={cart.length === 0}
            onClick={pay}
          >
            รับชำระ {cart.length > 0 ? formatBaht(total) : ""}
          </button>
        </aside>
      </div>
    </div>
  );
}
