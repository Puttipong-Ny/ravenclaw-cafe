/* Moonbrew receipt: all order values are live HTML. Prices use integer satang internally. */
(() => {
  "use strict";
  const sample = {
    number: "MB-0724",
    date: "19/09/2026",
    time: "10:45",
    staff: "Luna",
    table: "07",
    items: [
      { name: "Butterbrew Latte", quantity: 1, unitPrice: 95 },
      { name: "Moon Scone", quantity: 2, unitPrice: 60 },
      { name: "Stardust Cake", quantity: 1, unitPrice: 145 },
      { name: "Crystal Tea", quantity: 1, unitPrice: 85 },
    ],
    discount: 20,
    taxRate: 7,
    paymentMethod: "Galleon Card",
    status: "ชำระแล้ว",
  };
  const copy = (x) => JSON.parse(JSON.stringify(x));
  let current = copy(sample);
  const pages = document.getElementById("pages");
  const embed = document.body.classList.contains("embed");
  const money = (n) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: n % 100 ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(n / 100);

  function validate(d) {
    for (const key of [
      "number",
      "date",
      "time",
      "staff",
      "table",
      "paymentMethod",
      "status",
    ])
      if (typeof d[key] !== "string" || d[key].length > 120)
        throw new Error("ตรวจสอบข้อมูล " + key);
    if (!Array.isArray(d.items) || !d.items.length || d.items.length > 200)
      throw new Error("กรุณาใส่สินค้า 1–200 รายการ");
    let sub = 0;
    for (const i of d.items) {
      if (
        typeof i.name !== "string" ||
        !i.name.trim() ||
        i.name.length > 240 ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > 9999 ||
        !Number.isFinite(i.unitPrice) ||
        i.unitPrice < 0 ||
        i.unitPrice > 99999999
      )
        throw new Error("ตรวจสอบชื่อสินค้า จำนวนเต็ม และราคาต่อหน่วย");
      sub += Math.round(i.unitPrice * 100) * i.quantity;
    }
    if (
      !Number.isFinite(d.discount) ||
      d.discount < 0 ||
      Math.round(d.discount * 100) > sub
    )
      throw new Error("ส่วนลดต้องไม่เกินยอดรวม");
    if (!Number.isFinite(d.taxRate) || d.taxRate < 0 || d.taxRate > 100)
      throw new Error("อัตราภาษีต้องอยู่ระหว่าง 0–100");
    const discount = Math.round(d.discount * 100);
    const tax = Math.round(((sub - discount) * d.taxRate) / 100);
    return { sub, discount, tax, total: sub - discount + tax };
  }

  function text(root, value, x, y, w, cls = "") {
    const e = document.createElement("div");
    e.className = "text " + cls;
    e.style.cssText = `left:${x}px;top:${y}px;width:${w}px`;
    e.textContent = value;
    root.append(e);
    return e;
  }

  function patch(root, x, y, w, h) {
    const e = document.createElement("div");
    e.className = "patch";
    e.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
    const img = document.createElement("img");
    img.src = "assets/receipt-background.png";
    img.alt = "";
    img.style.left = -x + "px";
    img.style.top = -y + "px";
    e.append(img);
    root.append(e);
  }

  function fit(e, max) {
    e.dataset.max = max;
  }

  function fitAll() {
    document.querySelectorAll(".text[data-max]").forEach((e) => {
      e.style.fontSize = "";
      let size = parseFloat(getComputedStyle(e).fontSize);
      while (e.scrollWidth > Number(e.dataset.max) && size > 12) {
        size -= 0.5;
        e.style.fontSize = size + "px";
      }
    });
  }

  function viewportWidth() {
    const vv = window.visualViewport;
    return Math.max(
      160,
      Math.min(
        window.innerWidth || 941,
        document.documentElement.clientWidth || 941,
        vv ? vv.width : 941,
      ),
    );
  }

  function resize() {
    const gutter = window.matchMedia("(max-width: 650px)").matches ? 12 : 20;
    const s = Math.min(760, viewportWidth() - gutter) / 941;
    document.querySelectorAll(".sheet").forEach((e) => {
      e.style.width = 941 * s + "px";
      e.style.height = 1672 * s + "px";
      const child = e.firstElementChild;
      if (child) child.style.transform = `scale(${s})`;
    });
  }

  function render(d) {
    const amounts = validate(d);
    current = copy(d);
    pages.replaceChildren();
    const count = Math.ceil(d.items.length / 4);
    for (let p = 0; p < count; p++) {
      const sheet = document.createElement("section");
      sheet.className = "sheet";
      sheet.setAttribute(
        "aria-label",
        `ใบเสร็จ ${d.number} หน้า ${p + 1} จาก ${count}`,
      );
      const root = document.createElement("article");
      root.className = "receipt";
      const art = document.createElement("img");
      art.className = "art";
      art.src = "assets/receipt-original.png";
      art.alt = "Moonbrew Magic Café — ใบเสร็จรับเงิน";
      root.append(art);
      sheet.append(root);
      pages.append(sheet);
      [
        [172, 616, 351, 191],
        [176, 846, 595, 39],
        [176, 902, 595, 153],
        [457, 1076, 315, 120],
        [456, 1210, 317, 46],
        [175, 1308, 341, 94],
      ].forEach((a) => patch(root, ...a));
      const labels = ["เลขที่ใบเสร็จ:", "วันที่:", "เวลา:", "พนักงาน:", "โต๊ะ:"];
      const vals = [d.number, d.date, d.time, d.staff, d.table];
      const ys = [621, 658, 694, 730, 766];
      labels.forEach((v, i) => text(root, v, 178, ys[i], 155, "thai"));
      vals.forEach((v, i) => fit(text(root, v, 334, ys[i] + 5, 186), 186));
      text(root, "รายการ", 184, 848, 300, "thai");
      text(root, "จำนวน", 525, 848, 90, "thai");
      text(root, "ราคา", 688, 848, 76, "thai number");
      d.items.slice(p * 4, p * 4 + 4).forEach((i, j) => {
        const y = 905 + j * 39;
        fit(text(root, i.name, 185, y, 349, "item-name"), 349);
        text(root, String(i.quantity), 536, y, 57, "number").style.textAlign =
          "center";
        fit(
          text(
            root,
            money(Math.round(i.unitPrice * 100) * i.quantity),
            648,
            y,
            116,
            "number",
          ),
          116,
        );
      });
      const last = p === count - 1;
      ["ยอดรวม", "ส่วนลด", `ภาษี ${d.taxRate}%`].forEach((v, i) =>
        text(root, v, 462, 1078 + i * 41, 197, "thai"),
      );
      [amounts.sub, amounts.discount, amounts.tax].forEach((v, i) =>
        fit(
          text(root, last ? money(v) : "—", 645, 1080 + i * 41, 119, "number"),
          119,
        ),
      );
      text(root, "ยอดสุทธิ", 462, 1211, 195, "thai grand");
      fit(
        text(
          root,
          last ? money(amounts.total) : "—",
          644,
          1213,
          120,
          "number grand",
        ),
        120,
      );
      text(root, "ชำระโดย:", 180, 1314, 119, "thai");
      fit(
        text(root, last ? d.paymentMethod : "ดูหน้าสุดท้าย", 299, 1320, 212),
        212,
      );
      text(root, "สถานะ:", 180, 1355, 118, "thai");
      const status = text(
        root,
        last ? d.status : "รายการต่อหน้าถัดไป",
        299,
        1355,
        216,
        "thai",
      );
      status.style.fontWeight = "600";
      fit(status, 216);
      if (count > 1) {
        const indicator = document.createElement("div");
        indicator.className = "page-indicator";
        indicator.textContent = `${p + 1} / ${count}`;
        root.append(indicator);
      }
    }
    resize();
    document.fonts.ready.then(fitAll);
    return amounts;
  }

  window.MoonbrewReceipt = {
    render,
    getData: () => copy(current),
    sample: copy(sample),
    print: async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((i) => i.decode().catch(() => {})),
      );
      window.print();
    },
  };

  const editor = document.getElementById("editor");
  const form = document.getElementById("receipt-form");
  const itemBody = document.getElementById("item-inputs");

  if (editor && form && itemBody) {
    function row(i) {
      const tr = document.createElement("tr");
      [
        ["name", "text", i.name],
        ["quantity", "number", i.quantity],
        ["unitPrice", "number", i.unitPrice],
      ].forEach(([k, type, v]) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.name = k;
        input.type = type;
        input.value = v;
        input.required = true;
        input.setAttribute(
          "aria-label",
          { name: "ชื่อสินค้า", quantity: "จำนวน", unitPrice: "ราคาต่อหน่วย" }[k],
        );
        if (type === "number") {
          input.min = k === "quantity" ? "1" : "0";
          input.step = k === "quantity" ? "1" : "0.01";
        }
        td.append(input);
        tr.append(td);
      });
      const td = document.createElement("td");
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "ลบ";
      b.setAttribute("aria-label", "ลบรายการสินค้า");
      b.onclick = () => tr.remove();
      td.append(b);
      tr.append(td);
      itemBody.append(tr);
    }
    function fill() {
      for (const k of [
        "number",
        "date",
        "time",
        "staff",
        "table",
        "discount",
        "taxRate",
        "paymentMethod",
        "status",
      ])
        form.elements[k].value = current[k];
      itemBody.replaceChildren();
      current.items.forEach(row);
    }
    document.getElementById("edit").onclick = () => {
      editor.hidden = !editor.hidden;
      if (!editor.hidden) {
        fill();
        editor.scrollIntoView({ behavior: "smooth" });
      }
    };
    document.getElementById("add").onclick = () =>
      row({ name: "", quantity: 1, unitPrice: 0 });
    document.getElementById("print").onclick = window.MoonbrewReceipt.print;
    document.getElementById("reset").onclick = () => {
      render(copy(sample));
      fill();
      document.getElementById("error").textContent = "";
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      try {
        const d = {};
        for (const k of [
          "number",
          "date",
          "time",
          "staff",
          "table",
          "paymentMethod",
          "status",
        ])
          d[k] = form.elements[k].value;
        d.discount = Number(form.elements.discount.value);
        d.taxRate = Number(form.elements.taxRate.value);
        d.items = [...itemBody.rows].map((tr) => ({
          name: tr.querySelector("[name=name]").value,
          quantity: Number(tr.querySelector("[name=quantity]").value),
          unitPrice: Number(tr.querySelector("[name=unitPrice]").value),
        }));
        render(d);
        document.getElementById("error").textContent = "";
        editor.hidden = true;
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        document.getElementById("error").textContent = err.message;
      }
    };
  }

  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 80));

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "moonbrew-render" && data.payload) {
      try {
        const amounts = render(data.payload);
        event.source?.postMessage({ type: "moonbrew-ready", amounts }, event.origin);
      } catch (err) {
        event.source?.postMessage(
          {
            type: "moonbrew-error",
            message: err instanceof Error ? err.message : String(err),
          },
          event.origin,
        );
      }
    }
    if (data.type === "moonbrew-print") void window.MoonbrewReceipt.print();
  });

  if (embed && window.parent !== window) {
    window.parent.postMessage({ type: "moonbrew-boot" }, window.location.origin);
  } else {
    render(current);
  }
})();
