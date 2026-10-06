"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMyStaff } from "@/components/useMyStaff";
import { formatSickles, lineDetail } from "@/lib/menu";
import {
  bangkokDayKey,
  formatDayLabel,
  ordersForStaff,
  summarizeOrders,
  type SavedOrder,
} from "@/lib/orders";
import { staffBoard, type StaffStatus } from "@/lib/staff";

function billText(order: SavedOrder): string {
  const tick = (value: string) => value.replaceAll("`", "'");
  const who = [
    order.voided ? "**ยกเลิกแล้ว**" : null,
    order.tableNo ? `**โต๊ะ** \`${tick(order.tableNo)}\`` : null,
    order.customerName ? `**ลูกค้า** \`${tick(order.customerName)}\`` : null,
    order.staffName ? `**โดย** \`${tick(order.staffName)}\`` : null,
  ].filter((line) => line !== null);
  const items = order.lines.map((line) => {
    const detail = lineDetail(line.id);
    return detail
      ? `- **${line.name}** ×${line.qty} — ${detail}`
      : `- **${line.name}** ×${line.qty}`;
  });
  return [...who, ...(who.length && items.length ? [""] : []), ...items].join("\n");
}

export default function OrdersPage() {
  const { name, role, ready: whoReady } = useMyStaff();
  const [day, setDay] = useState(bangkokDayKey);
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffStatus[]>(() => staffBoard([]));
  const requestId = useRef(0);
  const today = bangkokDayKey();

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    if (!name) {
      setOrders([]);
      setLoaded(true);
      return;
    }
    try {
      const res = await fetch(`/api/orders?day=${encodeURIComponent(day)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { orders?: SavedOrder[]; error?: string };
      if (id !== requestId.current) return;
      if (!res.ok) {
        setError(data.error || "โหลดออเดอร์ไม่สำเร็จ");
        return;
      }
      setOrders(ordersForStaff(data.orders ?? [], name));
      setError(null);
    } catch {
      if (id !== requestId.current) return;
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      if (id === requestId.current) setLoaded(true);
    }
  }, [day, name]);

  const refreshStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff", { cache: "no-store" });
      const data = (await res.json()) as { staff?: StaffStatus[] };
      if (res.ok && data.staff) setStaff(data.staff);
    } catch {
      /* keep the last board */
    }
  }, []);

  useEffect(() => {
    setLoaded(false);
    void refresh();
    void refreshStaff();
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        void refreshStaff();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
        void refreshStaff();
      }
    }, 30000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(timer);
    };
  }, [refresh, refreshStaff]);

  async function copyBill(order: SavedOrder) {
    try {
      await navigator.clipboard.writeText(billText(order));
      setCopiedId(order.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === order.id ? null : current));
      }, 1500);
    } catch {
      setError("คัดลอกไม่สำเร็จ");
    }
  }

  async function setMyFree(free: boolean) {
    if (!name) return;
    setStaff((prev) =>
      prev.map((row) => (row.name === name ? { ...row, free } : row)),
    );
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, free }),
      });
      if (!res.ok) throw new Error("fail");
    } catch {
      setStaff((prev) =>
        prev.map((row) => (row.name === name ? { ...row, free: !free } : row)),
      );
      setError("บันทึกสถานะไม่สำเร็จ");
    }
  }

  const summary = summarizeOrders(orders);
  const iAmFree = staff.some((row) => row.name === name && row.free);

  return (
    <div className="pos-shell orders-shell">
      <header className="pos-header">
        <img
          className="brand-logo"
          src="/ravencool-whisper-haven-logo.png"
          alt="Ravencool Warmwhisper Haven"
          width={1774}
          height={887}
        />
        <div className="pos-header-bar">
          <h1 className="pos-title">ออเดอร์</h1>
          <div className="header-actions">
            <Link className="btn btn-secondary" href="/settings">
              ตั้งค่า
            </Link>
            <Link className="btn btn-secondary" href="/">
              หน้าขาย
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <p className="pos-error" role="alert">
          {error}
        </p>
      )}

      {role === "staff" && name ? (
        <section className="staff-board" aria-label="สถานะของฉัน">
          <div className="my-status">
            <p className="my-status-who">{name}</p>
            <div className="status-types">
              <button
                type="button"
                className={iAmFree ? "discount-type is-free-on" : "discount-type"}
                aria-pressed={iAmFree}
                onClick={() => void setMyFree(true)}
              >
                ว่าง รับงานได้
              </button>
              <button
                type="button"
                className={iAmFree ? "discount-type" : "discount-type is-busy-on"}
                aria-pressed={!iAmFree}
                onClick={() => void setMyFree(false)}
              >
                ไม่ว่าง
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!whoReady ? (
        <p className="sales-empty">กำลังโหลด…</p>
      ) : role === "cashier" ? (
        <section className="sales-log">
          <p className="sales-empty">
            แคชเชียร์ดูบิลที่หน้าขาย
            <Link className="btn btn-secondary orders-empty-link" href="/">
              หน้าขาย
            </Link>
          </p>
        </section>
      ) : !name ? (
        <section className="sales-log">
          <p className="sales-empty">
            ยังไม่ได้เลือกชื่อพนักงาน
            <Link className="btn btn-secondary orders-empty-link" href="/settings">
              ไปตั้งค่า
            </Link>
          </p>
        </section>
      ) : (
        <section className="sales-log">
          <div className="sales-log-head">
            <div>
              <p className="sales-day-panel-kicker">ออเดอร์ของ</p>
              <h2 className="menu-set-title">{name}</h2>
            </div>
            <div className="sales-day-panel-actions">
              {loaded ? (
                <div className="stat-pair" aria-label="สรุปออเดอร์">
                  <div className="stat-chip">
                    <span className="stat-chip-label">บิล</span>
                    <strong className="stat-chip-value">{summary.count}</strong>
                  </div>
                  <div className="stat-chip stat-chip--accent">
                    <span className="stat-chip-label">ยอด</span>
                    <strong className="stat-chip-value">
                      {formatSickles(summary.total)}
                    </strong>
                  </div>
                </div>
              ) : (
                <span className="sales-log-meta">กำลังโหลด…</span>
              )}
              <label className="orders-date">
                <span className="sr-only">วันที่</span>
                <input
                  className="orders-day-input"
                  type="date"
                  value={day}
                  max={today}
                  onChange={(event) => {
                    if (event.target.value) setDay(event.target.value);
                  }}
                />
              </label>
            </div>
          </div>

          <p className="orders-day">{formatDayLabel(day)}</p>

          {!loaded ? null : orders.length === 0 ? (
            <p className="sales-empty">ไม่มีออเดอร์ของชื่อนี้</p>
          ) : (
            <ul className="sales-list">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className={order.voided ? "sales-card is-voided" : "sales-card"}
                >
                  <div className="sales-card-top">
                    <time className="sales-time" dateTime={order.at}>
                      {new Date(order.at).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <strong className="sales-total">
                      {order.voided ? "ยกเลิกแล้ว" : formatSickles(order.total)}
                    </strong>
                  </div>
                  {(order.customerName || order.tableNo) && (
                    <div className="sales-people">
                      {order.tableNo ? (
                        <span className="sales-chip sales-chip--table">
                          <span className="sales-chip-label">โต๊ะ</span>
                          {order.tableNo}
                        </span>
                      ) : null}
                      {order.customerName ? (
                        <span className="sales-chip sales-chip--customer">
                          <span className="sales-chip-label">ลูกค้า</span>
                          {order.customerName}
                        </span>
                      ) : null}
                    </div>
                  )}
                  <ul className="sales-lines">
                    {order.lines.map((line) => {
                      const detail = lineDetail(line.id);
                      return (
                        <li key={`${order.id}-${line.id}`}>
                          <span className="sales-line-name">
                            {line.name}
                            {detail ? (
                              <span className="sales-line-detail">{detail}</span>
                            ) : null}
                          </span>
                          <span className="sales-line-qty">×{line.qty}</span>
                          <span className="sales-line-sum">
                            {formatSickles(line.price * line.qty)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {order.discountAmt > 0 && !order.voided && (
                    <p className="sales-discount">
                      ส่วนลด −{formatSickles(order.discountAmt)}
                    </p>
                  )}
                  <div className="sales-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void copyBill(order)}
                    >
                      {copiedId === order.id ? "คัดลอกแล้ว" : "คัดลอกบิล"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
