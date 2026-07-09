/* محاكاة عمليات شراء حية — نسخة توضيحية لصفحة السوق */

const SIM_BUYER_NAMES = [
  "عبدالله", "سارة", "محمد", "نورة", "خالد", "منيرة",
  "فهد", "لطيفة", "سلطان", "هند", "ماجد", "ريم", "بندر", "أمل", "تركي", "غادة",
];
const SIM_BUYER_CITIES = ["الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة", "الخبر", "أبها", "تبوك"];

function initBuyerToasts() {
  const stack = document.getElementById("buyToastStack");
  if (!stack || typeof SAFI_DATA === "undefined") return;

  const toggle = document.getElementById("simToggle");
  const countEl = document.getElementById("liveCountText");
  let running = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let count = 812;
  let timer = null;

  function setToggleLabel() {
    if (toggle) toggle.textContent = running ? "⏸ إيقاف المحاكاة" : "▶ تشغيل المحاكاة";
  }

  function updateCount() {
    if (countEl) countEl.textContent = `${count.toLocaleString("ar-SA")} عملية شراء خلال الساعة الأخيرة`;
  }

  function spawnToast() {
    const items = SAFI_DATA.products.filter((p) => p.retail.length);
    const p = items[Math.floor(Math.random() * items.length)];
    const offer = p.retail[Math.floor(Math.random() * p.retail.length)];
    const name = SIM_BUYER_NAMES[Math.floor(Math.random() * SIM_BUYER_NAMES.length)];
    const city = SIM_BUYER_CITIES[Math.floor(Math.random() * SIM_BUYER_CITIES.length)];

    const toast = document.createElement("div");
    toast.className = "buy-toast";
    toast.innerHTML = `
      <div class="t-icon">${p.icon}</div>
      <div class="t-body">
        <b>${name} من ${city}</b>
        <span>اشترى للتو ${p.name} من ${offer.store}</span>
      </div>`;
    stack.appendChild(toast);
    while (stack.children.length > 3) stack.removeChild(stack.firstChild);

    setTimeout(() => {
      toast.classList.add("leaving");
      setTimeout(() => toast.remove(), 320);
    }, 4500);

    count++;
    updateCount();
  }

  function schedule() {
    if (!running) return;
    const delay = 3200 + Math.random() * 3200;
    timer = setTimeout(() => {
      spawnToast();
      schedule();
    }, delay);
  }

  if (toggle) {
    setToggleLabel();
    toggle.addEventListener("click", () => {
      running = !running;
      setToggleLabel();
      if (running) schedule();
      else clearTimeout(timer);
    });
  }

  updateCount();
  if (running) {
    spawnToast();
    schedule();
  }
}

document.addEventListener("DOMContentLoaded", initBuyerToasts);
