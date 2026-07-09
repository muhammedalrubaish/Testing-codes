/* لوحة التحكم التوضيحية — بيانات تجريبية */

const DASH_DATA = {
  sales7d: [
    { day: "السبت", value: 8200 },
    { day: "الأحد", value: 9750 },
    { day: "الاثنين", value: 7400 },
    { day: "الثلاثاء", value: 11200 },
    { day: "الأربعاء", value: 10100 },
    { day: "الخميس", value: 13900 },
    { day: "الجمعة", value: 12450 },
  ],
  orders: [
    { id: "#10482", product: "آيفون 17 برو 256GB", amount: 5199, status: "new" },
    { id: "#10481", product: "سماعة إيربودز برو 3", amount: 949, status: "prep" },
    { id: "#10480", product: "شاحن سريع 65W GaN", amount: 155, status: "shipped" },
    { id: "#10479", product: "ساعة آبل ووتش سيريس 11", amount: 1749, status: "shipped" },
    { id: "#10478", product: "جهاز بلايستيشن 5 برو", amount: 3099, status: "done" },
    { id: "#10477", product: "لابتوب ماك بوك إير M4", amount: 4820, status: "done" },
  ],
  stock: [
    { name: "آيفون 17 برو 256GB", price: 5199, qty: 24, min: 10 },
    { name: "هاتف جالكسي S25 ألترا", price: 4399, qty: 6, min: 10 },
    { name: "سماعة إيربودز برو 3", price: 949, qty: 48, min: 20 },
    { name: "ساعة آبل ووتش سيريس 11", price: 1749, qty: 4, min: 8 },
    { name: "شاحن سريع 65W GaN", price: 155, qty: 120, min: 40 },
    { name: "جهاز بلايستيشن 5 برو", price: 3099, qty: 3, min: 5 },
  ],
};

const STATUS_LABELS = {
  new: { label: "جديد", cls: "new" },
  prep: { label: "قيد التجهيز", cls: "prep" },
  shipped: { label: "تم الشحن", cls: "shipped" },
  done: { label: "مكتمل", cls: "done" },
};

const fmt = (n) => n.toLocaleString("ar-SA");

/* ---------- مخطط المبيعات (SVG) ---------- */
function renderSalesChart() {
  const box = document.getElementById("salesChart");
  if (!box) return;

  const data = DASH_DATA.sales7d;
  const W = 560, H = 260;
  const pad = { top: 24, left: 14, bottom: 34, right: 52 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const max = Math.ceil(Math.max(...data.map((d) => d.value)) / 5000) * 5000;
  const barW = Math.min(40, (plotW / data.length) * 0.62);
  const step = plotW / data.length;
  const maxIdx = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0);

  // خطوط الشبكة وقيم المحور (خفيفة كي لا تنافس الأعمدة)
  let grid = "";
  for (let v = 0; v <= max; v += 5000) {
    const y = pad.top + plotH - (v / max) * plotH;
    grid += `<line x1="${pad.left}" x2="${pad.left + plotW}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
    grid += `<text x="${W - pad.right + 8}" y="${y + 4}" font-size="10" fill="var(--ink-soft)">${v / 1000}k</text>`;
  }

  let bars = "";
  data.forEach((d, i) => {
    const h = (d.value / max) * plotH;
    const x = pad.left + i * step + (step - barW) / 2;
    const y = pad.top + plotH - h;
    // أعمدة بنهايات علوية مستديرة وقاعدة مستقيمة على خط الأساس
    bars += `
      <path class="bar" data-i="${i}"
            d="M${x} ${y + 4} q0 -4 4 -4 h${barW - 8} q4 0 4 4 V${pad.top + plotH} H${x} Z"
            fill="var(--blue-600)"/>`;
    // تسمية مباشرة انتقائية: أعلى يوم فقط
    if (i === maxIdx) {
      bars += `<text x="${x + barW / 2}" y="${y - 8}" font-size="11" font-weight="700" text-anchor="middle" fill="var(--ink)">${fmt(d.value)}</text>`;
    }
    bars += `<text x="${x + barW / 2}" y="${H - 12}" font-size="10" text-anchor="middle" fill="var(--ink-soft)">${d.day}</text>`;
  });

  box.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="مخطط مبيعات آخر سبعة أيام">${grid}${bars}</svg>
    <div class="chart-tip" id="chartTip"></div>`;

  const tip = document.getElementById("chartTip");
  box.querySelectorAll(".bar").forEach((bar) => {
    bar.addEventListener("mousemove", (e) => {
      const d = data[+bar.dataset.i];
      const rect = box.getBoundingClientRect();
      tip.textContent = `${d.day}: ${fmt(d.value)} ر.س`;
      tip.style.left = e.clientX - rect.left + "px";
      tip.style.top = e.clientY - rect.top + "px";
      tip.classList.add("show");
    });
    bar.addEventListener("mouseleave", () => tip.classList.remove("show"));
  });
}

/* ---------- جدول الطلبات ---------- */
function renderOrders() {
  const tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;
  tbody.innerHTML = DASH_DATA.orders
    .map((o) => {
      const s = STATUS_LABELS[o.status];
      return `<tr>
        <td dir="ltr">${o.id}</td>
        <td>${o.product}</td>
        <td>${fmt(o.amount)} ر.س</td>
        <td><span class="pill ${s.cls}">${s.label}</span></td>
      </tr>`;
    })
    .join("");
}

/* ---------- جدول المخزون ---------- */
function renderStock() {
  const tbody = document.querySelector("#stockTable tbody");
  if (!tbody) return;
  tbody.innerHTML = DASH_DATA.stock
    .map((s) => {
      const low = s.qty < s.min;
      const pct = Math.min(100, Math.round((s.qty / (s.min * 4)) * 100));
      return `<tr>
        <td>${s.name}</td>
        <td>${fmt(s.price)} ر.س</td>
        <td>${fmt(s.qty)} قطعة</td>
        <td><div class="stock-bar"><i class="${low ? "low" : ""}" style="width:${pct}%"></i></div></td>
        <td><span class="pill ${low ? "low" : "ok"}">${low ? "منخفض" : "متوفر"}</span></td>
        <td>${low ? `<button class="btn btn-primary btn-sm" onclick="alert('نسخة توضيحية — سيتم هنا فتح عروض تجار الجملة لإعادة الطلب.')">اطلب من الجملة</button>` : ""}</td>
      </tr>`;
    })
    .join("");
}

/* ---------- محاكاة الطلبات الواردة (نسخة توضيحية) ---------- */
const dashState = { sales: 12450, newOrders: 23 };
let orderSeq = 10483;
let liveRunning = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let liveTimer = null;

function updateKpis() {
  const salesEl = document.getElementById("kpiSalesValue");
  const ordersEl = document.getElementById("kpiNewOrders");
  const lowStockEl = document.getElementById("kpiLowStock");
  if (salesEl) salesEl.textContent = fmt(dashState.sales);
  if (ordersEl) ordersEl.textContent = fmt(dashState.newOrders);
  if (lowStockEl) lowStockEl.textContent = fmt(DASH_DATA.stock.filter((s) => s.qty < s.min).length);
}

function spawnLiveOrder() {
  const candidates = DASH_DATA.stock.filter((s) => s.qty > 0);
  if (!candidates.length) return;
  const item = candidates[Math.floor(Math.random() * candidates.length)];
  item.qty = Math.max(0, item.qty - 1);

  const status = Math.random() < 0.5 ? "new" : "prep";
  DASH_DATA.orders.unshift({ id: `#${orderSeq++}`, product: item.name, amount: item.price, status });
  DASH_DATA.orders = DASH_DATA.orders.slice(0, 8);

  dashState.sales += item.price;
  dashState.newOrders += 1;

  renderOrders();
  renderStock();
  updateKpis();

  const firstRow = document.querySelector("#ordersTable tbody tr");
  if (firstRow) firstRow.classList.add("row-flash");
}

function scheduleLiveOrder(first) {
  if (!liveRunning) return;
  const delay = first ? 2200 + Math.random() * 1500 : 5000 + Math.random() * 5000;
  liveTimer = setTimeout(() => {
    spawnLiveOrder();
    scheduleLiveOrder(false);
  }, delay);
}

function initLiveOrders() {
  const toggle = document.getElementById("liveToggle");
  if (toggle) {
    toggle.textContent = liveRunning ? "⏸ إيقاف البث المباشر" : "▶ تشغيل البث المباشر";
    toggle.addEventListener("click", () => {
      liveRunning = !liveRunning;
      toggle.textContent = liveRunning ? "⏸ إيقاف البث المباشر" : "▶ تشغيل البث المباشر";
      if (liveRunning) scheduleLiveOrder(true);
      else clearTimeout(liveTimer);
    });
  }
  if (liveRunning) scheduleLiveOrder(true);
}

document.addEventListener("DOMContentLoaded", () => {
  renderSalesChart();
  renderOrders();
  renderStock();
  updateKpis();
  initLiveOrders();
});
