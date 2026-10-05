"use client";

import { useEffect, useState } from "react";
import { formatSickles } from "@/lib/menu";

type Row = { name: string; qty: number };

type Summary = {
  bills: number;
  total: number;
  sets: Row[];
  products: Row[];
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
