import { lineDetail } from "./menu";

type Row = { name: string; qty: number };

type BillLine = { id: string; name: string; price: number; qty: number };

export type SummaryExport = {
  bills: number;
  total: number;
  sets: Row[];
  products: Row[];
  orders: {
    at: string;
    lines: BillLine[];
    total: number;
    discountAmt: number;
    customerName?: string;
    staffName?: string;
    tableNo?: string;
  }[];
};

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cell(value: string | number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${esc(String(value))}</Data></Cell>`;
}

function sheet(name: string, rows: (string | number)[][]) {
  const body = rows
    .map((values) => `<Row>${values.map(cell).join("")}</Row>`)
    .join("");
  return `<Worksheet ss:Name="${esc(name)}"><Table>${body}</Table></Worksheet>`;
}

function when(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lineLabel(line: BillLine) {
  const detail = lineDetail(line.id);
  return detail ? `${line.name} ×${line.qty} (${detail})` : `${line.name} ×${line.qty}`;
}

/** Excel 2003 XML. Opens in Excel without an extra library. */
export function summaryWorkbook(data: SummaryExport) {
  const summary: (string | number)[][] = [
    ["จำนวนบิล", data.bills],
    ["ยอดรวม", data.total],
    [],
    ["สินค้าในเซ็ต", "จำนวน"],
    ...data.products.map((row) => [row.name, row.qty] as (string | number)[]),
    [],
    ["เซ็ตที่ขาย", "จำนวน"],
    ...data.sets.map((row) => [row.name, row.qty] as (string | number)[]),
  ];

  const bills: (string | number)[][] = [
    ["เวลา", "โต๊ะ", "ลูกค้า", "พนักงาน", "รายการ", "ส่วนลด", "ยอดสุทธิ"],
    ...data.orders.map((order) => [
      when(order.at),
      order.tableNo ?? "",
      order.customerName ?? "",
      order.staffName ?? "",
      order.lines.map(lineLabel).join(", "),
      order.discountAmt,
      order.total,
    ]),
  ];

  const lines: (string | number)[][] = [
    ["เวลา", "โต๊ะ", "ลูกค้า", "พนักงาน", "สินค้า", "รายละเอียด", "จำนวน", "ราคา", "รวม"],
    ...data.orders.flatMap((order) =>
      order.lines.map((line) => [
        when(order.at),
        order.tableNo ?? "",
        order.customerName ?? "",
        order.staffName ?? "",
        line.name,
        lineDetail(line.id) ?? "",
        line.qty,
        line.price,
        line.price * line.qty,
      ]),
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheet("สรุป", summary)}
${sheet("บิล", bills)}
${sheet("รายการ", lines)}
</Workbook>`;
}
