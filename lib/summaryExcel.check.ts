import assert from "node:assert/strict";
import { summaryWorkbook } from "./summaryExcel";

const xml = summaryWorkbook({
  bills: 1,
  total: 300,
  products: [{ name: "Cupcake & Tea", qty: 2 }],
  sets: [{ name: "Set A", qty: 1 }],
  orders: [
    {
      at: "2026-10-05T14:21:00.000Z",
      tableNo: "1",
      customerName: "Pil",
      staffName: "Deimos Lolivan",
      discountAmt: 0,
      total: 300,
      lines: [{ id: "set-a", name: "Set A", price: 300, qty: 1 }],
    },
  ],
});

assert.match(xml, /ss:Name="สรุป"/);
assert.match(xml, /ss:Name="บิล"/);
assert.match(xml, /ss:Name="รายการ"/);
assert.match(xml, /Cupcake &amp; Tea/);
assert.match(xml, /ss:Type="Number">300</);
assert.match(xml, /Cupcake \+ Charm Tea/);
assert.match(xml, /Deimos Lolivan/);
assert.equal(xml.includes("<script"), false);

console.log("summary excel ok");
