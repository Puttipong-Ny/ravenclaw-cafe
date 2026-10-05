"use client";

import { useEffect, useState } from "react";
import { formatSickles, lineDetail } from "@/lib/menu";

type Row = { name: string; qty: number };

type BillLine = { id: string; name: string; price: number; qty: number };

type Bill = {
  id: string;
  at: string;
  lines: BillLine[];
  total: number;
  discountAmt: number;
  customerName?: string;
  staffName?: string;
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
          <a className="btn btn-secondary" href="/">
            กลับหน้าขาย
          </a>
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
            <h2 className="menu-set-title">รวมทุกบิลที่ยังไม่ยกเลิก</h2>
            {data ? (
              <div className="stat-pair">
                <div className="stat-chip">
                  <span className="stat-chip-label">บิล</span>
                  <strong className="stat-chip-value">{data.bills}</strong>
                </div>
                <div className="stat-chip stat-chip--accent">
                  <span className="stat-chip-label">ยอด</span>
                  <strong className="stat-chip-value">
                    {formatSickles(data.total)}
                  </strong>
                </div>
              </div>
            ) : (
              <span className="sales-log-meta">{error ? "" : "กำลังโหลด…"}</span>
            )}
          </div>

          {data && (
            <div className="summary-grid">
              <CountTable title="สินค้าในเซ็ต" rows={data.products} empty="ยังไม่มียอด" />
              <CountTable title="เซ็ตที่ขาย" rows={data.sets} empty="ยังไม่มียอด" />
            </div>
          )}
        </section>

        <section className="sales-log">
          <div className="sales-log-head">
            <h2 className="menu-set-title">บิลทั้งหมด</h2>
          </div>
          {!data ? null : data.orders.length === 0 ? (
            <p className="sales-empty">ยังไม่มีบิล</p>
          ) : (
            <ul className="sales-list summary-bills">
              {data.orders.map((o) => (
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
                  {o.discountAmt > 0 && (
                    <p className="sales-discount">
                      ส่วนลด −{formatSickles(o.discountAmt)}
                    </p>
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
}: {
  title: string;
  rows: Row[];
  empty: string;
}) {
  return (
    <div className="summary-block">
      <h3 className="summary-block-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="sales-empty">{empty}</p>
      ) : (
        <ul className="summary-rows">
          {rows.map((row) => (
            <li key={row.name}>
              <span>{row.name}</span>
              <strong>{row.qty.toLocaleString("en-US")}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
