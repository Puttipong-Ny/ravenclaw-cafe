"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MENU_SETS,
  type Discount,
  type DiscountType,
  type MenuItem,
  calcDiscount,
  calcSubtotal,
  calcTotal,
  formatSickles,
} from "@/lib/menu";
import {
  bangkokDayKey,
  formatDayLabel,
  formatDayShort,
  summarizeOrders,
  type SavedOrder,
} from "@/lib/orders";

type CartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

type DaySummary = {
  day: string;
  count: number;
  total: number;
};

export default function PosApp() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = useState("");
  const [paidFlash, setPaidFlash] = useState(false);
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [staffName, setStaffName] = useState("");
  const [wipeConfirm, setWipeConfirm] = useState(false);
  const [viewDay, setViewDay] = useState(bangkokDayKey);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const today = bangkokDayKey();
  const isToday = viewDay === today;

  useEffect(() => {
    try {
      setStaffName(localStorage.getItem("ravenclaw-staff-name") ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  const refreshDays = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/days", { cache: "no-store" });
      const data = (await res.json()) as {
        days?: DaySummary[];
        error?: string;
      };
      if (!res.ok) return;
      setDaySummaries(data.days ?? []);
    } catch {
      /* keep previous list */
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?day=${encodeURIComponent(viewDay)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { orders?: SavedOrder[]; error?: string };
      if (!res.ok) {
        setError(data.error || "โหลดยอดไม่สำเร็จ");
        return;
      }
      const next = data.orders ?? [];
      setOrders((prev) => {
        if (
          prev.length === next.length &&
          prev.every(
            (o, i) => o.id === next[i]?.id && o.total === next[i]?.total,
          )
        ) {
          return prev;
        }
        return next;
      });
      setError(null);
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setReady(true);
    }
  }, [viewDay]);

  useEffect(() => {
    setWipeConfirm(false);
    setOrders([]);
    setReady(false);
  }, [viewDay]);

  useEffect(() => {
    void refreshDays();
  }, [refreshDays]);

  useEffect(() => {
    void refreshOrders();

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshOrders();
        void refreshDays();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshOrders();
        void refreshDays();
      }
    }, 30000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(timer);
    };
  }, [refreshOrders, refreshDays]);

  const discount: Discount = {
    type: discountType,
    value: Number(discountValue) || 0,
  };
  const subtotal = calcSubtotal(cart);
  const discountAmt = calcDiscount(subtotal, discount);
  const total = calcTotal(subtotal, discount);
  const day = summarizeOrders(orders);
  const allDaysTotal = daySummaries.reduce((sum, s) => sum + s.total, 0);
  const allDaysCount = daySummaries.reduce((sum, s) => sum + s.count, 0);

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
    setCustomerName("");
    setPaidFlash(false);
  }

  async function pay() {
    if (cart.length === 0 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart,
          subtotal,
          discount,
          discountAmt,
          total,
          customerName: customerName.trim() || undefined,
          staffName: staffName.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "บันทึกไม่สำเร็จ");
        return;
      }
      try {
        if (staffName.trim()) {
          localStorage.setItem("ravenclaw-staff-name", staffName.trim());
        }
      } catch {
        /* ignore */
      }
      setPaidFlash(true);
      setCart([]);
      setDiscountType("none");
      setDiscountValue("");
      setCustomerName("");
      if (!isToday) setViewDay(bangkokDayKey());
      else await refreshOrders();
      await refreshDays();
    } catch {
      setError("บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!wipeConfirm) return;
    const timer = setTimeout(() => setWipeConfirm(false), 4000);
    return () => clearTimeout(timer);
  }, [wipeConfirm]);

  async function wipeSales() {
    if (!wipeConfirm) {
      setWipeConfirm(true);
      return;
    }
    setWipeConfirm(false);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/orders?day=${encodeURIComponent(viewDay)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "ล้างไม่สำเร็จ");
        return;
      }
      setOrders([]);
      setError(null);
      await refreshDays();
    } catch {
      setError("ล้างไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  return (
    <div className="pos-shell">
      <header className="pos-header">
        <div className="brand-block">
          {/* plain img avoids Next image cache keeping an old opaque logo */}
          <img
            className="brand-logo"
            src="/ravenclaw-crest.png"
            alt="Ravenclaw"
            width={96}
            height={96}
          />
          <div>
            <p className="pos-brand">Ravenclaw Cafe</p>
            <h1 className="pos-title">Point of Sale</h1>
          </div>
        </div>
        <div className="header-actions">
          {wipeConfirm && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setWipeConfirm(false)}
              disabled={busy}
            >
              ยกเลิก
            </button>
          )}
          <button
            type="button"
            className={wipeConfirm ? "btn-ghost btn-danger" : "btn-ghost"}
            onClick={() => void wipeSales()}
            disabled={!ready || busy || orders.length === 0}
          >
            {wipeConfirm ? "ยืนยันล้างประวัติ" : "ล้างประวัติ"}
          </button>
        </div>
      </header>

      {error && (
        <p className="pos-error" role="alert">
          {error}
        </p>
      )}

      <div className="pos-grid">
        <section className="menu-panel" aria-label="เมนู">
          {MENU_SETS.map((set) => (
            <div key={set.id} className="menu-set">
              <h2 className="menu-set-title">{set.name}</h2>
              <div
                className={
                  set.id === "sets" ? "menu-grid menu-grid--sets" : "menu-grid"
                }
              >
                {set.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      set.id === "sets" ? "menu-btn menu-btn--set" : "menu-btn"
                    }
                    onClick={() => addItem(item)}
                  >
                    <span className="menu-btn-text">
                      <span className="menu-btn-name">{item.name}</span>
                      {item.detail ? (
                        <span className="menu-btn-detail">{item.detail}</span>
                      ) : null}
                    </span>
                    <span className="menu-btn-price">
                      {formatSickles(item.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="sales-log">
            <div className="sales-log-head">
              <h2 className="menu-set-title">ประวัติบิล</h2>
              {daySummaries.length > 0 ? (
                <div className="stat-pair" aria-label="สรุปรวมทุกวัน">
                  <div className="stat-chip">
                    <span className="stat-chip-label">วัน</span>
                    <strong className="stat-chip-value">{daySummaries.length}</strong>
                  </div>
                  <div className="stat-chip stat-chip--accent">
                    <span className="stat-chip-label">รวม</span>
                    <strong className="stat-chip-value">
                      {formatSickles(allDaysTotal)}
                    </strong>
                  </div>
                </div>
              ) : (
                <span className="sales-log-meta">
                  {ready ? "ยังไม่มียอด" : "…"}
                </span>
              )}
            </div>

            <div className="sales-workspace">
              <nav className="sales-day-rail" aria-label="วันที่มียอด">
                <p className="sales-day-rail-title">วันที่มียอด</p>
                <div className="sales-day-rail-list">
                  {daySummaries.length === 0 ? (
                    <p className="sales-day-rail-empty">ยังไม่มีประวัติ</p>
                  ) : (
                    daySummaries.map((s) => {
                      const active = s.day === viewDay;
                      return (
                        <button
                          key={s.day}
                          type="button"
                          className={
                            active
                              ? "sales-day-item is-active"
                              : "sales-day-item"
                          }
                          onClick={() => setViewDay(s.day)}
                        >
                          <span className="sales-day-item-when">
                            {s.day === today ? "วันนี้" : formatDayShort(s.day)}
                          </span>
                          <span className="sales-day-item-count">
                            {s.count} บิล
                          </span>
                          <span className="sales-day-item-total">
                            {formatSickles(s.total)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                {daySummaries.length > 0 && (
                  <div className="sum-card">
                    <p className="sum-card-label">ยอดรวมทั้งหมด</p>
                    <p className="sum-card-amount">
                      {formatSickles(allDaysTotal)}
                    </p>
                    <p className="sum-card-sub">{allDaysCount} บิล</p>
                  </div>
                )}
                <label className="sales-day-other">
                  <span>เลือกวันอื่น</span>
                  <input
                    type="date"
                    value={viewDay}
                    max={today}
                    onChange={(e) => {
                      if (e.target.value) setViewDay(e.target.value);
                    }}
                  />
                </label>
              </nav>

              <div className="sales-day-panel">
                <div className="sales-day-panel-head">
                  <div>
                    <p className="sales-day-panel-kicker">
                      {isToday ? "กำลังดู" : "ย้อนหลัง"}
                    </p>
                    <h3 className="sales-day-panel-title">
                      {formatDayLabel(viewDay)}
                    </h3>
                  </div>
                  <div className="sales-day-panel-actions">
                    {ready ? (
                      <div className="stat-pair" aria-label="สรุปวันที่เลือก">
                        <div className="stat-chip">
                          <span className="stat-chip-label">บิล</span>
                          <strong className="stat-chip-value">{day.count}</strong>
                        </div>
                        <div className="stat-chip stat-chip--accent">
                          <span className="stat-chip-label">ยอด</span>
                          <strong className="stat-chip-value">
                            {formatSickles(day.total)}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <span className="sales-day-panel-sum">…</span>
                    )}
                    {!isToday && (
                      <button
                        type="button"
                        className="btn-ghost btn-ghost-sm"
                        onClick={() => setViewDay(today)}
                      >
                        กลับวันนี้
                      </button>
                    )}
                  </div>
                </div>

                {!ready ? (
                  <p className="sales-empty">กำลังโหลด…</p>
                ) : day.orders.length === 0 ? (
                  <p className="sales-empty">ไม่มีบิลในวันนี้</p>
                ) : (
                  <ul className="sales-list">
                    {day.orders.map((o) => (
                      <li key={o.id} className="sales-card">
                        <div className="sales-card-top">
                          <time className="sales-time" dateTime={o.at}>
                            {new Date(o.at).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                          <strong className="sales-total">
                            {formatSickles(o.total)}
                          </strong>
                        </div>

                        {(o.customerName || o.staffName) && (
                          <div className="sales-people">
                            {o.customerName ? (
                              <span className="sales-chip sales-chip--customer">
                                <span className="sales-chip-label">ลูกค้า</span>
                                {o.customerName}
                              </span>
                            ) : null}
                            {o.staffName ? (
                              <span className="sales-chip sales-chip--staff">
                                <span className="sales-chip-label">โดย</span>
                                {o.staffName}
                              </span>
                            ) : null}
                          </div>
                        )}

                        <ul className="sales-lines">
                          {o.lines.map((l) => (
                            <li key={`${o.id}-${l.id}`}>
                              <span className="sales-line-name">{l.name}</span>
                              <span className="sales-line-qty">×{l.qty}</span>
                              <span className="sales-line-sum">
                                {formatSickles(l.price * l.qty)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {o.discountAmt > 0 && (
                          <p className="sales-discount">
                            ส่วนลด −{formatSickles(o.discountAmt)}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="cart-panel" aria-label="ตะกร้า">
          <div className="cart-head">
            <h2 className="cart-title">ออเดอร์</h2>
            <div className="cart-head-actions">
              <span className="cart-count">
                {itemCount > 0 ? `${itemCount} รายการ` : "ว่าง"}
              </span>
              <button
                type="button"
                className="btn-ghost btn-ghost-sm"
                onClick={clearOrder}
                disabled={cart.length === 0 && !customerName && discountType === "none"}
              >
                ล้างออเดอร์
              </button>
            </div>
          </div>

          <div className="name-fields">
            <label className="name-field">
              <span>
                ชื่อลูกค้า <em>(ไม่บังคับ)</em>
              </span>
              <input
                className="discount-input"
                type="text"
                autoComplete="off"
                placeholder="เช่น Harry"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </label>
            <label className="name-field">
              <span>
                ชื่อตัวเอง <em>(ไม่บังคับ)</em>
              </span>
              <input
                className="discount-input"
                type="text"
                autoComplete="nickname"
                placeholder="เช่น Luna"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />
            </label>
          </div>

          {paidFlash && (
            <p className="paid-flash" role="status">
              รับชำระแล้ว — บันทึกเรียบร้อย
            </p>
          )}

          {cart.length === 0 && !paidFlash ? (
            <p className="cart-empty">แตะเมนูทางซ้ายเพื่อเริ่มออเดอร์</p>
          ) : (
            <ul className="cart-list">
              {cart.map((line) => (
                <li key={line.id} className="cart-line">
                  <div className="cart-line-info">
                    <span className="cart-line-name">{line.name}</span>
                    <span className="cart-line-meta">
                      {formatSickles(line.price)} × {line.qty}
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
                      {formatSickles(line.price * line.qty)}
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
                  ["amount", "Sickles"],
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

          <div className="order-sum">
            <div className="order-sum-rows">
              <div className="order-sum-row">
                <span>ยอดรวม</span>
                <span>{formatSickles(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="order-sum-row is-discount">
                  <span>ส่วนลด</span>
                  <span>−{formatSickles(discountAmt)}</span>
                </div>
              )}
            </div>
            <div className="order-sum-net">
              <span className="order-sum-net-label">สุทธิ</span>
              <strong className="order-sum-net-value">
                {formatSickles(total)}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="pay-btn"
            disabled={cart.length === 0 || busy}
            onClick={() => void pay()}
          >
            รับชำระ {cart.length > 0 ? formatSickles(total) : ""}
          </button>
        </aside>
      </div>
    </div>
  );
}
