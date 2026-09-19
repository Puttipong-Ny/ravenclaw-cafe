"use client";

import { useEffect, useMemo, useRef } from "react";
import type { SavedOrder } from "@/lib/orders";

export type MoonbrewReceiptData = {
  number: string;
  date: string;
  time: string;
  staff: string;
  table: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  discount: number;
  taxRate: number;
  paymentMethod: string;
  status: string;
};

function receiptNo(id: string) {
  const tail = id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
  return `MB-${tail || "0000"}`;
}

export function orderToMoonbrew(order: SavedOrder): MoonbrewReceiptData {
  const d = new Date(order.at);
  return {
    number: receiptNo(order.id),
    date: d.toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("th-TH", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    staff: order.staffName?.trim() || "—",
    table: order.customerName?.trim() || "—",
    items: order.lines.map((l) => ({
      name: l.name,
      quantity: l.qty,
      unitPrice: l.price,
    })),
    discount: order.discountAmt,
    taxRate: 0,
    paymentMethod: "Sickles",
    status: order.voided ? "ยกเลิกแล้ว" : "ชำระแล้ว",
  };
}

type Props = {
  order: SavedOrder;
  onClose: () => void;
};

export default function MoonbrewReceiptView({ order, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const payload = useMemo(() => orderToMoonbrew(order), [order]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    function send() {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "moonbrew-render", payload },
        window.location.origin,
      );
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "moonbrew-boot") {
        readyRef.current = true;
        send();
      }
    }

    window.addEventListener("message", onMessage);
    if (readyRef.current) send();
    return () => window.removeEventListener("message", onMessage);
  }, [payload]);

  function printReceipt() {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "moonbrew-print" },
      window.location.origin,
    );
  }

  return (
    <div
      className="receipt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="ใบเสร็จ Moonbrew"
    >
      <div className="receipt-toolbar">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          ปิด
        </button>
        <button type="button" className="btn btn-secondary" onClick={printReceipt}>
          พิมพ์ / PDF
        </button>
      </div>
      <iframe
        ref={iframeRef}
        className="receipt-frame"
        title="ใบเสร็จ Moonbrew Magic Café"
        src="/moonbrew/embed.html"
        onLoad={() => {
          readyRef.current = true;
          iframeRef.current?.contentWindow?.postMessage(
            { type: "moonbrew-render", payload },
            window.location.origin,
          );
        }}
      />
    </div>
  );
}
