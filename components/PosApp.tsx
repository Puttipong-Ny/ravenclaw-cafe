"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MENU_SETS,
  type Discount,
  type DiscountType,
  type MenuItem,
  formatSickles,
  lineDetail,
  tallyOrder,
} from "@/lib/menu";
import {
  bangkokDayKey,
  formatDayLabel,
  formatDayShort,
  summarizeOrders,
  type SavedOrder,
} from "@/lib/orders";
// import MoonbrewReceiptView from "@/components/MoonbrewReceiptView";
import RecipientSelect from "@/components/RecipientSelect";
import { useMyStaff } from "@/components/useMyStaff";
import {
  byGender,
  GENDER_LABEL,
  staffBoard,
  type Gender,
  type StaffStatus,
} from "@/lib/staff";

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
  const { name: me, role } = useMyStaff();
  const [staff, setStaff] = useState<StaffStatus[]>(() => staffBoard([]));
  const [tableNo, setTableNo] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [billPopup, setBillPopup] = useState<string | null>(null);
  const [popupCopied, setPopupCopied] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState(false);
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);
  const [viewDay, setViewDay] = useState(bangkokDayKey);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  // const [receiptOrder, setReceiptOrder] = useState<SavedOrder | null>(null);
  const refreshStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff", { cache: "no-store" });
      const data = (await res.json()) as { staff?: StaffStatus[] };
      if (!res.ok || !data.staff) return;
      setStaff(data.staff);
    } catch {
      /* keep the last board */
    }
  }, []);

  const today = bangkokDayKey();
  const isToday = viewDay === today;

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
            (o, i) =>
              o.id === next[i]?.id &&
              o.total === next[i]?.total &&
              !!o.voided === !!next[i]?.voided,
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
    setVoidConfirmId(null);
    setOrders([]);
    setReady(false);
  }, [viewDay]);

  useEffect(() => {
    if (!voidConfirmId) return;
    const timer = setTimeout(() => setVoidConfirmId(null), 4000);
    return () => clearTimeout(timer);
  }, [voidConfirmId]);

  useEffect(() => {
    if (role === "cashier") {
      setStaffName("");
      return;
    }
    if (me) setStaffName((current) => current || me);
  }, [me, role]);

  useEffect(() => {
    void refreshDays();
    void refreshStaff();
  }, [refreshDays, refreshStaff]);

  useEffect(() => {
    void refreshOrders();

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshOrders();
        void refreshDays();
        void refreshStaff();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshOrders();
        void refreshDays();
        void refreshStaff();
      }
    }, 30000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(timer);
    };
  }, [refreshOrders, refreshDays, refreshStaff]);

  const discount: Discount = {
    type: discountType,
    value: Number(discountValue) || 0,
  };
  const { subtotal, promo, extra, total } = tallyOrder(cart, discount);
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

  function billText(o: {
    voided?: boolean;
    tableNo?: string;
    customerName?: string;
    staffName?: string;
    lines: { id: string; name: string; qty: number }[];
  }): string {
    const tick = (value: string) => value.replaceAll("`", "'");
    const who = [
      o.voided ? "**ยกเลิกแล้ว**" : null,
      o.tableNo ? `**โต๊ะ** \`${tick(o.tableNo)}\`` : null,
      o.customerName ? `**ลูกค้า** \`${tick(o.customerName)}\`` : null,
      o.staffName ? `**โดย** \`${tick(o.staffName)}\`` : null,
    ].filter((line) => line !== null);
    const items = o.lines.map((l) => {
      const detail = lineDetail(l.id);
      return detail
        ? `- **${l.name}** ×${l.qty} — ${detail}`
        : `- **${l.name}** ×${l.qty}`;
    });
    return [...who, ...(who.length && items.length ? [""] : []), ...items].join("\n");
  }

  async function copyBill(o: SavedOrder) {
    try {
      await navigator.clipboard.writeText(billText(o));
      setCopiedId(o.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === o.id ? null : current));
      }, 1500);
    } catch {
      setError("คัดลอกไม่สำเร็จ");
    }
  }

  async function copyPopup() {
    if (!billPopup) return;
    try {
      await navigator.clipboard.writeText(billPopup);
      setPopupCopied(true);
    } catch {
      setError("คัดลอกไม่สำเร็จ");
    }
  }

  useEffect(() => {
    if (!billPopup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBillPopup(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [billPopup]);

  function clearOrder() {
    setCart([]);
    setDiscountType("none");
    setDiscountValue("");
    setCustomerName("");
    setTableNo("");
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
          lines: cart.map((l) => ({ id: l.id, qty: l.qty })),
          discount,
          customerName: customerName.trim() || undefined,
          staffName: billedName || undefined,
          tableNo: tableNo.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "บันทึกไม่สำเร็จ");
        return;
      }
      setBillPopup(
        billText({
          tableNo: tableNo.trim() || undefined,
          customerName: customerName.trim() || undefined,
          staffName: billedName || undefined,
          lines: cart,
        }),
      );
      setPopupCopied(false);
      setPaidFlash(true);
      setCart([]);
      setDiscountType("none");
      setDiscountValue("");
      setCustomerName("");
      setTableNo("");
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

  async function voidOrder(orderId: string) {
    if (voidConfirmId !== orderId) {
      setVoidConfirmId(orderId);
      return;
    }
    setVoidConfirmId(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/orders?id=${encodeURIComponent(orderId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "ยกเลิกบิลไม่สำเร็จ");
        return;
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, voided: true } : o)),
      );
      await refreshDays();
      setError(null);
    } catch {
      setError("ยกเลิกบิลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const billedName = staffName.trim();
  const freeCount = staff.filter((row) => row.free).length;

  return (
    <>
    <div className="pos-shell">
      <div className="pos-grid">
        <aside className="staff-rail" aria-label="ใครว่างอยู่">
          <div className="staff-board-head">
            <h2 className="staff-board-title">ใครว่างอยู่</h2>
            <span className="staff-board-count">{freeCount} ว่าง</span>
          </div>
          <div className="staff-groups staff-rail-body">
            {(["f", "m"] as Gender[]).map((gender) => {
              const rows = [...byGender(staff, gender)].sort(
                (a, b) => Number(b.free) - Number(a.free),
              );
              return (
                <div key={gender} className="staff-group">
                  <p className="staff-group-title">
                    {GENDER_LABEL[gender]}
                    <span className="staff-group-count">
                      {rows.filter((row) => row.free).length}
                    </span>
                  </p>
                  <ul className="staff-board-list">
                    {rows.map((row) => (
                      <li key={row.name}>
                        <span
                          className={
                            row.free ? "staff-chip is-free" : "staff-chip"
                          }
                          title={row.name}
                        >
                          <span className="staff-dot" aria-hidden="true" />
                          <span className="staff-name">{row.name}</span>
                          <span className="sr-only">
                            {row.free ? " ว่าง" : " ไม่ว่าง"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </aside>
        <div className="pos-main">
      <header className="pos-header">
        <img
          className="brand-logo"
          src="/ravencool-whisper-haven-logo.png"
          alt="Ravencool Warmwhisper Haven"
          width={1774}
          height={887}
        />
        <div className="pos-header-bar">
          <h1 className="pos-title">Point of Sale</h1>
          <div className="header-actions">
            <a className="btn btn-secondary" href="/orders">
              ออเดอร์
            </a>
            <a className="btn btn-secondary" href="/summary">
              สรุปสินค้า
            </a>
            {wipeConfirm ? (
              <div className="confirm-pair">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setWipeConfirm(false)}
                  disabled={busy}
                >
                  ไม่ล้าง
                </button>
                <button
                  type="button"
                  className="btn btn-danger-solid"
                  onClick={() => void wipeSales()}
                  disabled={busy}
                >
                  ยืนยัน
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void wipeSales()}
                disabled={!ready || busy || orders.length === 0}
              >
                ล้างประวัติ
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <p className="pos-error" role="alert">
          {error}
        </p>
      )}

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
                          <span className="sales-day-item-top">
                            <span className="sales-day-item-when">
                              {s.day === today ? "วันนี้" : formatDayShort(s.day)}
                            </span>
                            <span className="sales-day-item-count">
                              {s.count} บิล
                            </span>
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
                  <span className="sales-day-other-text">เลือกวันอื่น</span>
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
                        className="btn btn-secondary btn-sm"
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
                      <li
                        key={o.id}
                        className={o.voided ? "sales-card is-voided" : "sales-card"}
                      >
                        <div className="sales-card-top">
                          <time className="sales-time" dateTime={o.at}>
                            {new Date(o.at).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                          <strong className="sales-total">
                            {o.voided ? "ยกเลิกแล้ว" : formatSickles(o.total)}
                          </strong>
                        </div>

                        {(o.customerName || o.staffName || o.tableNo) && (
                          <div className="sales-people">
                            {o.tableNo ? (
                              <span className="sales-chip sales-chip--table">
                                <span className="sales-chip-label">โต๊ะ</span>
                                {o.tableNo}
                              </span>
                            ) : null}
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
                          {o.lines.map((l) => {
                            const detail = lineDetail(l.id);
                            return (
                              <li key={`${o.id}-${l.id}`}>
                                <span className="sales-line-name">
                                  {l.name}
                                  {detail ? (
                                    <span className="sales-line-detail">{detail}</span>
                                  ) : null}
                                </span>
                                <span className="sales-line-qty">×{l.qty}</span>
                                <span className="sales-line-sum">
                                  {formatSickles(l.price * l.qty)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>

                        {o.discountAmt > 0 && !o.voided && (
                          <p className="sales-discount">
                            ส่วนลด −{formatSickles(o.discountAmt)}
                          </p>
                        )}

                        <div className="sales-card-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => void copyBill(o)}
                          >
                            {copiedId === o.id ? "คัดลอกแล้ว" : "คัดลอกบิล"}
                          </button>
                          {/* <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setReceiptOrder(o)}
                          >
                            ใบเสร็จ
                          </button> */}
                          {!o.voided &&
                            (voidConfirmId === o.id ? (
                              <div className="confirm-pair">
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  disabled={busy}
                                  onClick={() => setVoidConfirmId(null)}
                                >
                                  ไม่ยกเลิก
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger-solid"
                                  disabled={busy}
                                  onClick={() => void voidOrder(o.id)}
                                >
                                  ยืนยัน
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-danger-soft"
                                disabled={busy}
                                onClick={() => void voidOrder(o.id)}
                              >
                                ยกเลิกบิล
                              </button>
                            ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
        </div>

        <aside className="cart-panel" aria-label="ตะกร้า">
          <div className="cart-head">
            <h2 className="cart-title">ออเดอร์</h2>
            <div className="cart-head-actions">
              <span className="cart-count">{itemCount} รายการ</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={clearOrder}
                disabled={
                  cart.length === 0 &&
                  !customerName &&
                  !tableNo &&
                  discountType === "none"
                }
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
                ชื่อพนักงาน <em>(ไม่บังคับ)</em>
              </span>
              <RecipientSelect
                value={staffName}
                onChange={setStaffName}
                freeNames={
                  new Set(staff.filter((row) => row.free).map((row) => row.name))
                }
              />
            </label>
            <label className="name-field">
              <span>
                เลขโต๊ะ <em>(ไม่บังคับ)</em>
              </span>
              <input
                className="discount-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="เช่น 7"
                maxLength={12}
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
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
              {promo > 0 && (
                <div className="order-sum-row is-discount">
                  <span>ส่วนลด 3 Set Special</span>
                  <span>−{formatSickles(promo)}</span>
                </div>
              )}
              {extra > 0 && (
                <div className="order-sum-row is-discount">
                  <span>ส่วนลด</span>
                  <span>−{formatSickles(extra)}</span>
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
    {billPopup && (
      <div className="bill-pop" onClick={() => setBillPopup(null)}>
        <div
          className="bill-pop-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bill-pop-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="bill-pop-title" className="bill-pop-title">
            คัดลอกบิล
          </h2>
          <pre className="bill-pop-text">{billPopup}</pre>
          <div className="bill-pop-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setBillPopup(null)}
            >
              ปิด
            </button>
            <button
              type="button"
              className="btn bill-pop-copy"
              autoFocus
              onClick={() => void copyPopup()}
            >
              {popupCopied ? "คัดลอกแล้ว" : "คัดลอก"}
            </button>
          </div>
        </div>
      </div>
    )}
    {/* {receiptOrder ? (
      <MoonbrewReceiptView
        order={receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />
    ) : null} */}
    </>
  );
}
