/* منطق واجهة منصة صافي */

/* ---------- قائمة الجوال ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
  }

  if (document.getElementById("productsGrid")) initMarket();
  if (document.getElementById("joinCards")) initJoin();
});

const formatPrice = (n) => n.toLocaleString("ar-SA");

/* ============================================================
   صفحة السوق
   ============================================================ */
let marketMode = "retail"; // retail = أسعار للمستهلك، wholesale = أسعار الجملة للتجار

function initMarket() {
  const catSelect = document.getElementById("categoryFilter");
  SAFI_DATA.categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.label}`;
    catSelect.appendChild(opt);
  });

  document.getElementById("searchInput").addEventListener("input", renderProducts);
  catSelect.addEventListener("change", renderProducts);
  document.getElementById("sortSelect").addEventListener("change", renderProducts);

  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".mode-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      marketMode = tab.dataset.mode;
      document.getElementById("marketNote").textContent =
        marketMode === "retail"
          ? "تعرض الأسعار أدناه أفضل عروض متاجر التجزئة للعملاء النهائيين."
          : "أسعار الجملة موجّهة لتجار التجزئة المسجّلين، وتُعرض مع الحد الأدنى للكمية.";
      renderProducts();
    });
  });

  document.getElementById("modalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  renderProducts();
}

function offersOf(product) {
  return marketMode === "retail" ? product.retail : product.wholesale;
}

function bestPrice(product) {
  return Math.min(...offersOf(product).map((o) => o.price));
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const q = document.getElementById("searchInput").value.trim();
  const cat = document.getElementById("categoryFilter").value;
  const sort = document.getElementById("sortSelect").value;

  let items = SAFI_DATA.products.filter((p) => offersOf(p).length > 0);
  if (cat) items = items.filter((p) => p.category === cat);
  if (q) items = items.filter((p) => (p.name + " " + p.brand).includes(q));

  if (sort === "priceAsc") items.sort((a, b) => bestPrice(a) - bestPrice(b));
  if (sort === "priceDesc") items.sort((a, b) => bestPrice(b) - bestPrice(a));

  if (!items.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="e-icon">🔍</div>
        <p>لا توجد منتجات مطابقة لبحثك، جرّب كلمة أخرى أو تصنيفًا مختلفًا.</p>
      </div>`;
    return;
  }

  grid.innerHTML = items
    .map((p) => {
      const catLabel = SAFI_DATA.categories.find((c) => c.id === p.category)?.label ?? "";
      const offers = offersOf(p);
      return `
      <article class="product-card">
        <div class="product-thumb">${p.icon}</div>
        <div class="product-body">
          <span class="cat">${catLabel} • ${p.brand}</span>
          <h3>${p.name}</h3>
          <div class="price-row">
            <span class="from">يبدأ من</span>
            <span class="amount">${formatPrice(bestPrice(p))}</span>
            <span class="currency">ر.س</span>
          </div>
          <span class="offers-count">${offers.length} ${marketMode === "retail" ? "متجر تجزئة" : "مورد جملة"} متاح</span>
          <button class="btn btn-primary btn-sm" onclick="openCompare(${p.id})">قارن الأسعار</button>
        </div>
      </article>`;
    })
    .join("");
}

function openCompare(id) {
  const p = SAFI_DATA.products.find((x) => x.id === id);
  if (!p) return;
  const offers = [...offersOf(p)].sort((a, b) => a.price - b.price);
  const best = offers[0].price;

  document.getElementById("modalThumb").textContent = p.icon;
  document.getElementById("modalTitle").textContent = p.name;
  document.getElementById("modalHint").textContent =
    marketMode === "retail"
      ? "قارن بين عروض متاجر التجزئة واختر الأفضل سعرًا وتقييمًا."
      : "عروض تجار الجملة مع الحد الأدنى لكمية الطلب والمخزون المتاح.";

  document.getElementById("modalOffers").innerHTML = offers
    .map((o) => {
      const isBest = o.price === best;
      const meta =
        marketMode === "retail"
          ? `⭐ ${o.rating} • ${o.city} • ${o.delivery}`
          : `الحد الأدنى: ${o.minQty} قطعة • المخزون: ${formatPrice(o.stock)} قطعة`;
      return `
      <div class="offer-row ${isBest ? "best" : ""}">
        <div class="offer-store">
          <b>${o.store} ${isBest ? '<span class="best-badge">أفضل سعر</span>' : ""}</b>
          <span class="meta">${meta}</span>
        </div>
        <div class="offer-price">${formatPrice(o.price)} <small>ر.س${marketMode === "wholesale" ? " / قطعة" : ""}</small></div>
        <button class="btn btn-primary btn-sm" onclick="alert('هذه نسخة تجريبية للعرض — سلة الشراء والدفع الإلكتروني ضمن المرحلة القادمة.')">
          ${marketMode === "retail" ? "اشترِ الآن" : "اطلب بالجملة"}
        </button>
      </div>`;
    })
    .join("");

  document.getElementById("modalBackdrop").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.remove("open");
  document.body.style.overflow = "";
}

/* ============================================================
   صفحة الانضمام
   ============================================================ */
const JOIN_ROLES = {
  wholesale: {
    title: "تسجيل تاجر جملة",
    fields: ["اسم المنشأة", "رقم السجل التجاري"],
  },
  retail: {
    title: "تسجيل تاجر تجزئة",
    fields: ["اسم المتجر", "رقم السجل التجاري (اختياري)"],
  },
  customer: {
    title: "تسجيل عميل",
    fields: [],
  },
};

function initJoin() {
  const cards = document.querySelectorAll(".join-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => selectRole(card.dataset.role));
  });

  document.getElementById("joinForm").addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("formSuccess").classList.add("show");
    e.target.reset();
  });

  // اختيار الدور من رابط الصفحة إن وجد، مثل join.html?role=retail
  const roleParam = new URLSearchParams(location.search).get("role");
  selectRole(JOIN_ROLES[roleParam] ? roleParam : "customer");
}

function selectRole(role) {
  document.querySelectorAll(".join-card").forEach((c) => {
    c.classList.toggle("selected", c.dataset.role === role);
  });

  const conf = JOIN_ROLES[role];
  document.getElementById("formTitle").textContent = conf.title;
  document.getElementById("formSuccess").classList.remove("show");

  const extra = document.getElementById("extraFields");
  extra.innerHTML = conf.fields
    .map(
      (label, i) => `
      <div class="form-field">
        <label for="extra${i}">${label}</label>
        <input id="extra${i}" type="text" ${label.includes("اختياري") ? "" : "required"} />
      </div>`
    )
    .join("");
}
