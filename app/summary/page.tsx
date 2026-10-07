"use client";

import { useEffect, useMemo, useState } from "react";
import { formatSickles, lineContents, lineDetail, lineMatchesQuery } from "@/lib/menu";

type Row = { name: string; qty: number };

type BillLine = { id: string; name: string; price: number; qty: number };

type Bill = {
  id: string;
  at: string;
  lines: BillLine[];
  total: number;
  discountAmt: number;
  tipAmt?: number;
  customerName?: string;
  staffName?: string;
  cashierName?: string;
  tableNo?: string;
};

type Summary = {
  bills: number;
  total: number;
  sets: Row[];
  products: Row[];
  orders: Bill[];
};

export default function SummaryPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/orders/summary", { cache: "no-store" });
        const body = (await res.json()) as Summary & { error?: string };
        if (cancel) return;
        if (!res.ok) {
          setError(body.error || "โหลดสรุปไม่สำเร็จ");
          return;
        }
        setData(body);
      } catch {
        if (!cancel) setError("โหลดสรุปไม่สำเร็จ");
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const view = useMemo(() => {
    if (!data) return null;
    if (!q) return data;
    const orders = data.orders.filter((order) =>
      order.lines.some((line) => lineMatchesQuery(line, q)),
    );
    return {
      ...data,
      bills: orders.length,
      total: orders.reduce((sum, order) => sum + order.total, 0),
      sets: data.sets.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          orders.some((order) =>
            order.lines.some(
              (line) => line.name === row.name && lineMatchesQuery(line, q),
            ),
          ),
      ),
      products: data.products.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          orders.some((order) =>
            order.lines.some(
              (line) =>
                lineMatchesQuery(line, q) &&
                lineContents(line.id, line.name).includes(row.name),
            ),
          ),
      ),
      orders,
    };
  }, [data, q]);

  return (
    <div className="pos-shell summary-shell">
      <header className="pos-header">
        <img
          className="brand-logo"
          src="/ravencool-whisper-haven-logo.png"
          alt="Ravencool Warmwhisper Haven"
          width={1774}
          height={887}
        />
        <div className="pos-header-bar">
          <h1 className="pos-title">สรุปสินค้า</h1>
          <div className="header-actions">
            <a className="btn btn-secondary" href="/api/orders/summary/export">
              ส่งออก Excel
            </a>
            <a className="btn btn-secondary" href="/">
              กลับหน้าขาย
            </a>
          </div>
        </div>
      </header>

      {error && (
        <p className="pos-error" role="alert">
          {error}
        </p>
      )}

      <div className="summary-layout">
        <section className="sales-log summary-page">
          <div className="sales-log-head">
            <h2 className="menu-set-title">
              {q ? "รายการที่ตรงกับคำค้น" : "รวมทุกบิลที่ยังไม่ยกเลิก"}
            </h2>
            {view ? (
              <div className="stat-pair">
                <div className="stat-chip">
                  <span className="stat-chip-label">บิล</span>
                  <strong className="stat-chip-value">{view.bills}</strong>
                </div>
                <div className="stat-chip stat-chip--accent">
                  <span className="stat-chip-label">ยอด</span>
                  <strong className="stat-chip-value">
                    {formatSickles(view.total)}
                  </strong>
                </div>
              </div>
            ) : (
              <span className="sales-log-meta">{error ? "" : "กำลังโหลด…"}</span>
            )}
          </div>

          {view && (
            <>
              <div className="summary-filter">
                <input
                  className="orders-day-input summary-filter-input"
                  type="search"
                  placeholder="ค้นหาเซ็ตหรือสินค้า เช่น Set A, Cupcake"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="ค้นหาเซ็ตหรือสินค้า"
                />
                {q ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setQuery("")}
                  >
                    ล้าง
                  </button>
                ) : null}
              </div>
              <div className="summary-grid">
                <CountTable
                  title="สินค้าในเซ็ต"
                  rows={view.products}
                  empty={q ? "ไม่พบสินค้า" : "ยังไม่มียอด"}
                  query={query}
                  onPick={setQuery}
                />
                <CountTable
                  title="เซ็ตที่ขาย"
                  rows={view.sets}
                  empty={q ? "ไม่พบเซ็ต" : "ยังไม่มียอด"}
                  query={query}
                  onPick={setQuery}
                />
              </div>
            </>
          )}
        </section>

        <section className="sales-log">
          <div className="sales-log-head">
            <h2 className="menu-set-title">{q ? "บิลที่ตรงกัน" : "บิลทั้งหมด"}</h2>
          </div>
          {!view ? null : view.orders.length === 0 ? (
            <p className="sales-empty">{q ? "ไม่พบบิลที่ตรงกัน" : "ยังไม่มีบิล"}</p>
          ) : (
            <ul className="sales-list summary-bills">
              {view.orders.map((o) => (
                <li key={o.id} className="sales-card">
                  <div className="sales-card-top">
                    <time className="sales-time" dateTime={o.at}>
                      {new Date(o.at).toLocaleString("th-TH", {
                        timeZone: "Asia/Bangkok",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <strong className="sales-total">{formatSickles(o.total)}</strong>
                  </div>
                  {(o.customerName || o.staffName || o.cashierName || o.tableNo) && (
                    <div className="sales-people">
                      {o.tableNo ? (
                        <span className="sales-chip sales-chip--table">
                          <span className="sales-chip-label">โต๊ะ</span>
                          {o.tableNo}
                        </span>
                      ) : null}
                      {o.customerName ? (
                        <span className="sales-chip sales-chip--customer">
                          <span className="sales-chip-label">แขก</span>
                          {o.customerName}
                        </span>
                      ) : null}
                      {o.staffName ? (
                        <span className="sales-chip sales-chip--staff">
                          <span className="sales-chip-label">ผู้เสิร์ฟ</span>
                          {o.staffName}
                        </span>
                      ) : null}
                      {o.cashierName ? (
                        <span className="sales-chip sales-chip--pay">
                          <span className="sales-chip-label">ผู้คิดเงิน</span>
                          {o.cashierName}
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
                  {o.discountAmt > 0 && (
                    <p className="sales-discount">
                      ส่วนลด −{formatSickles(o.discountAmt)}
                    </p>
                  )}
                  {(o.tipAmt ?? 0) > 0 && (
                    <p className="sales-tip">ทิป +{formatSickles(o.tipAmt ?? 0)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function CountTable({
  title,
  rows,
  empty,
  query,
  onPick,
}: {
  title: string;
  rows: Row[];
  empty: string;
  query: string;
  onPick: (name: string) => void;
}) {
  const picked = query.trim().toLowerCase();
  return (
    <div className="summary-block">
      <h3 className="summary-block-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="sales-empty">{empty}</p>
      ) : (
        <ul className="summary-rows">
          {rows.map((row) => {
            const on = picked === row.name.toLowerCase();
            return (
              <li key={row.name}>
                <button
                  type="button"
                  className={on ? "is-on" : undefined}
                  aria-pressed={on}
                  onClick={() => onPick(on ? "" : row.name)}
                >
                  <span>{row.name}</span>
                  <strong>{row.qty.toLocaleString("en-US")}</strong>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
