/* ============================================================
   تطبيق تحصيل الديون — يعمل محليًا بالكامل (localStorage)
   ============================================================ */
'use strict';

const KEY = 'debtapp.v1';
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- النصوص الافتراضية للرسائل ---------- */
const DEFAULT_TPL = {
  welcome: {
    name: 'الترحيب بالعميل',
    text:
`السلام عليكم ورحمة الله وبركاته
أهلاً وسهلاً بك أستاذ/ة {الاسم} 🌿

معك {المحصل}، وسيتم متابعة ملفك المالي من خلال هذه القناة بإذن الله.

بيانات ملفك:
• الاسم: {الاسم}
• رقم الهوية: {الهوية}
• إجمالي المديونية: {المبلغ} ريال
• المتبقي حاليًا: {المتبقي} ريال

يسعدنا خدمتك وتقديم أي توضيح تحتاجه، ونحن مستعدون لترتيب جدولة سداد مناسبة لظروفك.
وتقبل تحياتنا 🌿`
  },
  reminder: {
    name: 'تذكير بسداد الدفعة',
    text:
`السلام عليكم ورحمة الله وبركاته
أستاذ/ة {الاسم} حفظك الله 🌿

تذكير ودّي بموعد استحقاق الدفعة القادمة:
• المبلغ المستحق: {المبلغ} ريال
• تاريخ الاستحقاق: {تاريخ_الاستحقاق}
• المتبقي من أصل المديونية: {المتبقي} ريال

نرجو التكرم بالسداد في موعده، وفي حال تم السداد مسبقًا نرجو تزويدنا بصورة الإيصال ليتم تحديث ملفك فورًا.

شاكرين لك حسن تعاونك
{المحصل}`
  },
  overdue: {
    name: 'تذكير بدفعة متأخرة',
    text:
`السلام عليكم ورحمة الله وبركاته
أستاذ/ة {الاسم}

نفيدكم بأن الدفعة المستحقة بتاريخ {تاريخ_الاستحقاق} بمبلغ {المبلغ} ريال لم يتم سدادها حتى تاريخه {اليوم}.
المتبقي من إجمالي المديونية: {المتبقي} ريال.

نأمل المبادرة بالسداد أو التواصل معنا لترتيب جدولة مناسبة خلال مدة أقصاها ٥ أيام، حرصًا على إغلاق الملف وديًا.

{المحصل}`
  },
  receipt: {
    name: 'إثبات السداد (مع الإيصال)',
    text:
`السلام عليكم ورحمة الله وبركاته
أستاذ/ة {الاسم} 🌿

نشكر لك سدادك، ونفيدك باستلام مبلغ ({المسدد} ريال) بتاريخ {اليوم}.
• رقم السند: {رقم_السند}
• المتبقي من المديونية: {المتبقي} ريال

مرفق لكم سند القبض إثباتًا لذلك ✅

{المحصل}`
  },
  statement: {
    name: 'كشف حساب',
    text:
`السلام عليكم ورحمة الله وبركاته
أستاذ/ة {الاسم}

إليك ملخص حسابك حتى تاريخ {اليوم}:
• إجمالي المديونية: {المبلغ} ريال
• إجمالي المسدد: {المسدد} ريال
• المتبقي: {المتبقي} ريال

مرفق كشف الحساب التفصيلي 📄
لأي استفسار نحن في خدمتك.

{المحصل}`
  },
  settled: {
    name: 'إخلاء طرف / إقفال الملف',
    text:
`السلام عليكم ورحمة الله وبركاته
أستاذ/ة {الاسم} 🌿

يسعدنا إفادتك بأنه تم سداد كامل المديونية البالغة {المبلغ} ريال، وتم إقفال ملفك بتاريخ {اليوم} ولا يوجد أي مبالغ مستحقة عليك.

مرفق لكم إشعار إخلاء الطرف ✅
شاكرين لك التزامك وحسن تعاملك.

{المحصل}`
  }
};

/* ---------- الحالة ---------- */
const blank = () => ({
  settings: { name: 'ربى الوكيل القانوني', sub: 'لتحصيل الديون', phone: '', cc: '966', cur: 'ريال', theme: 'light' },
  clients: [], debts: [], payments: [], tpl: {}, seq: 1000
});

let S = load();
let currentClient = null;
let currentView = 'home';

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (!d) return blank();
    return Object.assign(blank(), d, { settings: Object.assign(blank().settings, d.settings || {}) });
  } catch { return blank(); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- أدوات مساعدة ---------- */
const num = v => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
const money = v => num(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' });
};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const daysTo = d => Math.ceil((new Date(d + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(t._t); t._t = setTimeout(() => t.hidden = true, 2600);
}

/* تحويل الجوال إلى صيغة دولية صالحة لرابط واتساب */
function waPhone(raw) {
  let p = String(raw || '').replace(/[^\d+]/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  p = p.replace(/\+/g, '');
  const cc = String(S.settings.cc || '966').replace(/\D/g, '');
  if (p.startsWith('0')) p = cc + p.slice(1);
  else if (!p.startsWith(cc) && p.length <= 10) p = cc + p;
  return p;
}

/* ---------- الحسابات ---------- */
const clientDebts = id => S.debts.filter(d => d.clientId === id);
const clientPays  = id => S.payments.filter(p => p.clientId === id);
function totals(id) {
  const total = clientDebts(id).reduce((s, d) => s + num(d.amount), 0);
  const paid  = clientPays(id).reduce((s, p) => s + num(p.amount), 0);
  return { total, paid, bal: Math.max(0, total - paid) };
}
/* أقرب دفعة مستحقة (غير مسددة) */
function nextDue(id) {
  const open = clientDebts(id).filter(d => !d.done && d.due).sort((a, b) => a.due.localeCompare(b.due));
  return open[0] || clientDebts(id).find(d => !d.done) || null;
}
function isLate(d) { return d && !d.done && d.due && daysTo(d.due) < 0; }

/* ============================================================
   التنقّل
   ============================================================ */
function go(view, clientId) {
  currentView = view;
  if (clientId) currentClient = clientId;
  $$('.view').forEach(v => v.hidden = true);
  $('#view-' + view).hidden = false;
  $$('.tab').forEach(t => t.classList.toggle('is-on', t.dataset.go === view));
  $('#btnBack').hidden = (view !== 'client');
  window.scrollTo(0, 0);
  ({ home: renderHome, clients: renderClients, client: renderClient, templates: renderTemplates, settings: renderSettings }[view] || (() => {}))();
}

/* ============================================================
   الشاشات
   ============================================================ */
function renderHome() {
  let out = 0, paid = 0, late = 0;
  S.clients.forEach(c => { const t = totals(c.id); out += t.bal; paid += t.paid; });
  S.debts.forEach(d => { if (isLate(d)) late++; });
  $('#stOut').textContent = money(out);
  $('#stPaid').textContent = money(paid);
  $('#stClients').textContent = S.clients.length;
  $('#stLate').textContent = late;

  const rows = S.debts
    .filter(d => !d.done && d.due && daysTo(d.due) <= 7)
    .sort((a, b) => a.due.localeCompare(b.due));

  $('#dueList').innerHTML = rows.length ? rows.map(d => {
    const c = S.clients.find(x => x.id === d.clientId); if (!c) return '';
    const n = daysTo(d.due);
    const badge = n < 0 ? `<span class="badge b-bad">متأخرة ${Math.abs(n)} يوم</span>`
      : n === 0 ? '<span class="badge b-warn">تستحق اليوم</span>'
      : `<span class="badge b-warn">بعد ${n} يوم</span>`;
    return `<button class="item" data-open="${c.id}">
      <div class="ava-sm">${esc(c.name[0] || '؟')}</div>
      <div class="item-main">
        <div class="item-t">${esc(c.name)}</div>
        <div class="item-s">${badge}<span>${fmtDate(d.due)}</span></div>
      </div>
      <div class="item-e"><div class="amt">${money(d.amount)}</div><div class="item-s">${esc(S.settings.cur)}</div></div>
    </button>`;
  }).join('') : '<div class="empty">لا توجد مستحقات خلال الأسبوع القادم ✅</div>';
}

function renderClients() {
  const q = $('#q').value.trim();
  const list = S.clients
    .filter(c => !q || (c.name + c.nid + c.phone).includes(q))
    .sort((a, b) => totals(b.id).bal - totals(a.id).bal);

  $('#clientList').innerHTML = list.length ? list.map(c => {
    const t = totals(c.id), nd = nextDue(c.id);
    const badge = t.bal <= 0 ? '<span class="badge b-ok">مسدّد بالكامل</span>'
      : isLate(nd) ? '<span class="badge b-bad">متأخر</span>'
      : '<span class="badge b-mut">قائم</span>';
    return `<button class="item" data-open="${c.id}">
      <div class="ava-sm">${esc(c.name[0] || '؟')}</div>
      <div class="item-main">
        <div class="item-t">${esc(c.name)}</div>
        <div class="item-s">${badge}<span dir="ltr">${esc(c.phone)}</span></div>
      </div>
      <div class="item-e"><div class="amt">${money(t.bal)}</div><div class="item-s">متبقٍ</div></div>
    </button>`;
  }).join('') : `<div class="empty">${q ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء بعد — أضف أول عميل ✨'}</div>`;
}

function renderClient() {
  const c = S.clients.find(x => x.id === currentClient);
  if (!c) return go('clients');
  const t = totals(c.id);
  $('#cAvatar').textContent = c.name[0] || '؟';
  $('#cName').textContent = c.name;
  $('#cId').textContent = 'هوية: ' + (c.nid || '—');
  $('#cPhone').textContent = c.phone || '—';
  $('#cBal').textContent = money(t.bal);
  $('#cTotal').textContent = money(t.total);
  $('#cPaid').textContent = money(t.paid);
  $('#cProg').style.width = (t.total ? Math.min(100, t.paid / t.total * 100) : 0) + '%';

  const ds = clientDebts(c.id);
  $('#debtList').innerHTML = ds.length ? ds.map(d => {
    const b = d.done ? '<span class="badge b-ok">مسدّدة</span>'
      : isLate(d) ? '<span class="badge b-bad">متأخرة</span>' : '<span class="badge b-mut">قائمة</span>';
    return `<button class="item" data-debt="${d.id}">
      <div class="item-main">
        <div class="item-t">${esc(d.desc || 'مديونية')}</div>
        <div class="item-s">${b}<span>استحقاق: ${fmtDate(d.due)}</span></div>
      </div>
      <div class="item-e"><div class="amt">${money(d.amount)}</div><div class="item-s">${esc(S.settings.cur)}</div></div>
    </button>`;
  }).join('') : '<div class="empty">لا توجد مديونيات مسجّلة</div>';

  const ps = clientPays(c.id).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  $('#payList').innerHTML = ps.length ? ps.map(p => `
    <button class="item" data-pay="${p.id}">
      <div class="item-main">
        <div class="item-t">سند رقم ${esc(p.no)}</div>
        <div class="item-s"><span>${fmtDate(p.date)}</span><span>${esc(p.method || 'تحويل')}</span></div>
      </div>
      <div class="item-e"><div class="amt" dir="ltr" style="color:var(--ok)">+${money(p.amount)}</div><div class="item-s">إيصال 🧾</div></div>
    </button>`).join('') : '<div class="empty">لا توجد دفعات مسجّلة</div>';
}

function renderTemplates() {
  $('#tplList').innerHTML = Object.entries(DEFAULT_TPL).map(([k, v]) => `
    <div class="tpl-card">
      <b>${esc(v.name)}</b>
      <textarea data-tpl-edit="${k}">${esc(S.tpl[k] ?? v.text)}</textarea>
    </div>`).join('');
  $$('[data-tpl-edit]').forEach(ta => ta.addEventListener('change', () => {
    S.tpl[ta.dataset.tplEdit] = ta.value; save(); toast('تم حفظ النص');
  }));
}

function renderSettings() {
  const s = S.settings;
  $('#setName').value = s.name; $('#setSub').value = s.sub;
  $('#setPhone').value = s.phone; $('#setCc').value = s.cc; $('#setCur').value = s.cur;
  $$('#themeSeg button').forEach(b => b.classList.toggle('on', b.dataset.theme === s.theme));
}

/* ============================================================
   المظهر (فاتح / داكن / تلقائي)
   ============================================================ */
function applyTheme() {
  const t = S.settings.theme;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = $('meta[name=theme-color]');
  if (meta) meta.content = dark ? '#232819' : '#8A9A6B';
}
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { if (S.settings.theme === 'auto') applyTheme(); });

/* ============================================================
   النوافذ المنبثقة
   ============================================================ */
function sheet(title, html, after) {
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false;
  after && after();
}
const closeSheet = () => { $('#sheet').hidden = true; };

function clientForm(c) {
  const e = c || { name: '', nid: '', phone: '', note: '' };
  sheet(c ? 'تعديل بيانات العميل' : 'عميل جديد', `
    <label>اسم العميل *<input id="f_name" value="${esc(e.name)}" placeholder="الاسم الرباعي"></label>
    <label>رقم الهوية / الإقامة *<input id="f_nid" dir="ltr" inputmode="numeric" value="${esc(e.nid)}" placeholder="1xxxxxxxxx"></label>
    <label>رقم الجوال (واتساب) *<input id="f_phone" dir="ltr" inputmode="tel" value="${esc(e.phone)}" placeholder="05xxxxxxxx"></label>
    <label>ملاحظات<textarea id="f_note" style="min-height:70px">${esc(e.note)}</textarea></label>
    <button class="btn btn-primary" id="f_save">حفظ</button>`, () => {
    $('#f_save').onclick = () => {
      const name = $('#f_name').value.trim(), nid = $('#f_nid').value.trim(), phone = $('#f_phone').value.trim();
      if (!name || !phone) return toast('الاسم ورقم الجوال مطلوبان');
      if (c) Object.assign(c, { name, nid, phone, note: $('#f_note').value.trim() });
      else {
        const n = { id: uid(), name, nid, phone, note: $('#f_note').value.trim(), createdAt: today() };
        S.clients.push(n); currentClient = n.id;
      }
      save(); closeSheet(); toast('تم الحفظ ✅');
      go(c ? 'client' : 'client');
    };
  });
}

function debtForm() {
  sheet('إضافة مديونية', `
    <label>وصف المديونية<input id="d_desc" placeholder="مثال: قرض شخصي / دفعة أولى"></label>
    <div class="grid2">
      <label>المبلغ *<input id="d_amt" dir="ltr" inputmode="decimal" placeholder="0"></label>
      <label>تاريخ الاستحقاق<input id="d_due" type="date" value="${today()}"></label>
    </div>
    <button class="btn btn-primary" id="d_save">إضافة</button>`, () => {
    $('#d_save').onclick = () => {
      const amount = num($('#d_amt').value);
      if (amount <= 0) return toast('أدخل مبلغًا صحيحًا');
      S.debts.push({ id: uid(), clientId: currentClient, desc: $('#d_desc').value.trim(), amount, due: $('#d_due').value, done: false });
      save(); closeSheet(); renderClient(); toast('تمت إضافة المديونية ✅');
    };
  });
}

function debtSheet(d) {
  sheet(d.desc || 'مديونية', `
    <div class="card"><div class="item-s"><span>المبلغ: <b>${money(d.amount)} ${esc(S.settings.cur)}</b></span></div>
    <div class="item-s"><span>الاستحقاق: ${fmtDate(d.due)}</span></div></div>
    <button class="btn btn-primary" id="x_toggle">${d.done ? 'إرجاعها كمديونية قائمة' : 'تعليمها كمسدّدة'}</button>
    <div style="height:8px"></div>
    <button class="btn btn-danger" id="x_del">حذف المديونية</button>`, () => {
    $('#x_toggle').onclick = () => { d.done = !d.done; save(); closeSheet(); renderClient(); };
    $('#x_del').onclick = () => {
      S.debts = S.debts.filter(x => x.id !== d.id); save(); closeSheet(); renderClient(); toast('تم الحذف');
    };
  });
}

function paymentForm() {
  const t = totals(currentClient);
  sheet('تسجيل دفعة', `
    <p class="hint">المتبقي حاليًا: <b>${money(t.bal)} ${esc(S.settings.cur)}</b></p>
    <div class="grid2">
      <label>المبلغ المستلم *<input id="p_amt" dir="ltr" inputmode="decimal" placeholder="0"></label>
      <label>التاريخ<input id="p_date" type="date" value="${today()}"></label>
    </div>
    <label>طريقة السداد
      <select id="p_method">
        <option>تحويل بنكي</option><option>نقدًا</option><option>شبكة / مدى</option><option>شيك</option><option>أخرى</option>
      </select>
    </label>
    <label>ملاحظة<input id="p_note" placeholder="اختياري"></label>
    <button class="btn btn-primary" id="p_save">حفظ وإنشاء سند القبض</button>`, () => {
    $('#p_save').onclick = () => {
      const amount = num($('#p_amt').value);
      if (amount <= 0) return toast('أدخل مبلغًا صحيحًا');
      const p = {
        id: uid(), clientId: currentClient, amount, date: $('#p_date').value || today(),
        method: $('#p_method').value, note: $('#p_note').value.trim(), no: 'R-' + (++S.seq)
      };
      S.payments.push(p); save(); closeSheet(); renderClient();
      toast('تم تسجيل الدفعة ✅');
      setTimeout(() => receiptSheet(p), 350);
    };
  });
}

/* ============================================================
   الرسائل + واتساب
   ============================================================ */
function fillVars(text, c, extra = {}) {
  const t = totals(c.id), nd = nextDue(c.id);
  const map = {
    'الاسم': c.name, 'الهوية': c.nid || '—', 'الجوال': c.phone,
    'المبلغ': money(extra.amount ?? (nd ? nd.amount : t.total)),
    'المتبقي': money(t.bal), 'المسدد': money(extra.paid ?? t.paid),
    'تاريخ_الاستحقاق': fmtDate(extra.due ?? (nd ? nd.due : '')),
    'المحصل': S.settings.name + (S.settings.sub ? ' — ' + S.settings.sub : '') + (S.settings.phone ? '\n' + S.settings.phone : ''),
    'اليوم': fmtDate(today()), 'رقم_السند': extra.no || '—'
  };
  return text.replace(/\{([^}]+)\}/g, (m, k) => (k in map ? map[k] : m));
}

const tplText = k => S.tpl[k] ?? DEFAULT_TPL[k].text;

function openWA(phone, text) {
  const url = 'https://wa.me/' + waPhone(phone) + '?text=' + encodeURIComponent(text);
  window.open(url, '_blank', 'noopener');
}

/* معاينة الرسالة قبل الإرسال */
function messageSheet(key) {
  const c = S.clients.find(x => x.id === currentClient); if (!c) return;
  const lastPay = clientPays(c.id).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  const extra = key === 'receipt' && lastPay ? { paid: lastPay.amount, no: lastPay.no } : {};
  const body = fillVars(tplText(key), c, extra);
  const needsFile = ['receipt', 'statement', 'settled'].includes(key);

  sheet(DEFAULT_TPL[key].name, `
    <label>نص الرسالة (يمكنك تعديله قبل الإرسال)
      <textarea id="m_text">${esc(body)}</textarea>
    </label>
    <p class="hint">سيتم فتح واتساب الشخصي على الرقم <b dir="ltr">+${waPhone(c.phone)}</b>.</p>
    ${needsFile ? `<button class="btn btn-ghost" id="m_file" style="margin-bottom:8px">📎 إنشاء ${key === 'statement' ? 'كشف الحساب' : key === 'settled' ? 'إشعار إخلاء الطرف' : 'سند القبض'} وإرفاقه</button>` : ''}
    <button class="btn btn-primary" id="m_send">فتح واتساب وإرسال الرسالة</button>`, () => {
    $('#m_send').onclick = () => { openWA(c.phone, $('#m_text').value); closeSheet(); };
    if (needsFile) $('#m_file').onclick = () => {
      const doc = key === 'statement' ? makeStatement(c) : makeReceipt(c, lastPay, key === 'settled');
      shareImage(doc.canvas, doc.file, $('#m_text').value);
    };
  });
}

/* ============================================================
   المستندات (صور PNG) — سند قبض / كشف حساب / إخلاء طرف
   ============================================================ */
const OLIVE = '#6E7D54', OLIVE_L = '#EAF0DC', INK = '#2B3122', MUT = '#6B7360';

function newDoc(title) {
  const cv = $('#rcanvas'), x = cv.getContext('2d');
  x.direction = 'rtl'; x.textAlign = 'right';
  x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
  // الترويسة
  x.fillStyle = OLIVE; x.fillRect(0, 0, cv.width, 150);
  x.fillStyle = '#fff';
  x.font = 'bold 40px "SF Arabic",Tahoma,sans-serif';
  x.fillText(S.settings.name, cv.width - 50, 68);
  x.font = '26px "SF Arabic",Tahoma,sans-serif';
  x.fillStyle = 'rgba(255,255,255,.9)';
  x.fillText(S.settings.sub, cv.width - 50, 110);
  // عنوان المستند
  x.fillStyle = OLIVE_L; x.fillRect(0, 150, cv.width, 78);
  x.fillStyle = OLIVE; x.font = 'bold 34px "SF Arabic",Tahoma,sans-serif';
  x.fillText(title, cv.width - 50, 200);
  return { cv, x };
}
function docFooter(x, cv, note) {
  x.fillStyle = MUT; x.font = '20px "SF Arabic",Tahoma,sans-serif';
  x.fillText(note, cv.width - 50, cv.height - 96);
  x.fillText('صدر إلكترونيًا بتاريخ ' + fmtDate(today()) + (S.settings.phone ? ' — للتواصل: ' + S.settings.phone : ''), cv.width - 50, cv.height - 62);
  x.fillStyle = OLIVE; x.fillRect(0, cv.height - 22, cv.width, 22);
}
function rowKV(x, k, v, y, bold) {
  x.fillStyle = MUT; x.font = '24px "SF Arabic",Tahoma,sans-serif';
  x.fillText(k, x.canvas.width - 50, y);
  x.fillStyle = INK; x.font = (bold ? 'bold 30px' : '26px') + ' "SF Arabic",Tahoma,sans-serif';
  x.fillText(v, x.canvas.width - 330, y);
}

function makeReceipt(c, p, settled) {
  const { cv, x } = newDoc(settled ? 'إشعار إخلاء طرف' : 'سند قبض');
  const t = totals(c.id);
  let y = 300;
  const rows = settled ? [
    ['اسم العميل', c.name, 1], ['رقم الهوية', c.nid || '—'],
    ['إجمالي المديونية', money(t.total) + ' ' + S.settings.cur],
    ['إجمالي المسدد', money(t.paid) + ' ' + S.settings.cur],
    ['المتبقي', money(t.bal) + ' ' + S.settings.cur, 1],
    ['حالة الملف', 'مقفل — لا توجد مستحقات', 1],
    ['تاريخ الإقفال', fmtDate(today())]
  ] : [
    ['رقم السند', p ? p.no : '—', 1],
    ['اسم العميل', c.name, 1], ['رقم الهوية', c.nid || '—'], ['رقم الجوال', c.phone],
    ['المبلغ المستلم', money(p ? p.amount : 0) + ' ' + S.settings.cur, 1],
    ['طريقة السداد', p ? p.method : '—'], ['تاريخ السداد', fmtDate(p ? p.date : today())],
    ['إجمالي المسدد', money(t.paid) + ' ' + S.settings.cur],
    ['المتبقي على العميل', money(t.bal) + ' ' + S.settings.cur, 1]
  ];
  rows.forEach((r, i) => {
    if (i % 2 === 0) { x.fillStyle = '#F6F8F0'; x.fillRect(30, y - 34, cv.width - 60, 54); }
    rowKV(x, r[0], r[1], y, r[2]); y += 62;
  });
  // ختم
  x.strokeStyle = OLIVE; x.lineWidth = 3; x.setLineDash([8, 6]);
  x.strokeRect(50, y + 30, cv.width - 100, 140); x.setLineDash([]);
  x.fillStyle = OLIVE; x.font = 'bold 26px "SF Arabic",Tahoma,sans-serif';
  x.fillText(settled ? 'تم إخلاء الطرف وإقفال الملف ✔' : 'تم استلام المبلغ أعلاه ✔', cv.width - 80, y + 90);
  x.fillStyle = MUT; x.font = '22px "SF Arabic",Tahoma,sans-serif';
  x.fillText('المستلم: ' + S.settings.name, cv.width - 80, y + 135);
  docFooter(x, cv, settled ? 'هذا الإشعار يثبت سداد كامل المديونية.' : 'هذا السند يثبت استلام المبلغ الموضح أعلاه.');
  return { canvas: cv, file: (settled ? 'ekhla-tarf-' : 'sanad-') + (p ? p.no : today()) + '.png' };
}

function makeStatement(c) {
  const { cv, x } = newDoc('كشف حساب');
  const t = totals(c.id);
  let y = 290;
  rowKV(x, 'اسم العميل', c.name, y, 1); y += 52;
  rowKV(x, 'رقم الهوية', c.nid || '—', y); y += 52;
  rowKV(x, 'رقم الجوال', c.phone, y); y += 60;

  x.fillStyle = OLIVE_L; x.fillRect(30, y - 34, cv.width - 60, 50);
  x.fillStyle = OLIVE; x.font = 'bold 24px "SF Arabic",Tahoma,sans-serif';
  x.fillText('البيان', cv.width - 50, y);
  x.fillText('المبلغ', cv.width - 480, y);
  x.fillText('التاريخ', cv.width - 700, y);
  y += 54;

  const lines = [
    ...clientDebts(c.id).map(d => ['مديونية: ' + (d.desc || '—'), money(d.amount), fmtDate(d.due), 0]),
    ...clientPays(c.id).map(p => ['سداد ' + p.no + ' — ' + p.method, '-' + money(p.amount), fmtDate(p.date), 1])
  ];
  x.font = '23px "SF Arabic",Tahoma,sans-serif';
  lines.slice(0, 11).forEach((L, i) => {
    if (i % 2 === 0) { x.fillStyle = '#F6F8F0'; x.fillRect(30, y - 30, cv.width - 60, 48); }
    x.fillStyle = INK; x.fillText(L[0].slice(0, 34), cv.width - 50, y);
    x.fillStyle = L[3] ? '#3E7C4A' : INK; x.fillText(L[1], cv.width - 480, y);
    x.fillStyle = MUT; x.fillText(L[2], cv.width - 700, y);
    y += 48;
  });
  if (lines.length > 11) { x.fillStyle = MUT; x.fillText('… و' + (lines.length - 11) + ' حركة أخرى', cv.width - 50, y); y += 48; }

  y += 24;
  x.fillStyle = OLIVE_L; x.fillRect(30, y - 34, cv.width - 60, 170);
  rowKV(x, 'إجمالي المديونية', money(t.total) + ' ' + S.settings.cur, y); y += 54;
  rowKV(x, 'إجمالي المسدد', money(t.paid) + ' ' + S.settings.cur, y); y += 54;
  rowKV(x, 'الرصيد المتبقي', money(t.bal) + ' ' + S.settings.cur, y, 1);
  docFooter(x, cv, 'كشف حساب تفصيلي حتى تاريخه.');
  return { canvas: cv, file: 'kashf-' + (c.nid || c.id) + '.png' };
}

/* مشاركة الصورة (تظهر واتساب ضمن خيارات المشاركة على الجوال) */
function shareImage(canvas, filename, text) {
  canvas.toBlob(async blob => {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('تم حفظ المستند — أرفقه في محادثة واتساب');
  }, 'image/png');
}

function receiptSheet(p) {
  const c = S.clients.find(x => x.id === p.clientId); if (!c) return;
  sheet('سند القبض ' + p.no, `
    <div class="card">
      <div class="item-s"><span>العميل: <b>${esc(c.name)}</b></span></div>
      <div class="item-s"><span>المبلغ: <b>${money(p.amount)} ${esc(S.settings.cur)}</b></span></div>
      <div class="item-s"><span>التاريخ: ${fmtDate(p.date)} — ${esc(p.method)}</span></div>
    </div>
    <button class="btn btn-primary" id="r_share">📎 إرسال السند عبر واتساب</button>
    <div style="height:8px"></div>
    <button class="btn btn-ghost" id="r_msg">💬 رسالة إثبات السداد فقط</button>
    <div style="height:8px"></div>
    <button class="btn btn-danger" id="r_del">حذف الدفعة</button>`, () => {
    $('#r_share').onclick = () => {
      const doc = makeReceipt(c, p, false);
      const text = fillVars(tplText('receipt'), c, { paid: p.amount, no: p.no });
      shareImage(doc.canvas, doc.file, text);
    };
    $('#r_msg').onclick = () => { closeSheet(); messageSheet('receipt'); };
    $('#r_del').onclick = () => {
      S.payments = S.payments.filter(x => x.id !== p.id); save(); closeSheet(); renderClient(); toast('تم حذف الدفعة');
    };
  });
}

/* ============================================================
   بيانات تجريبية / نسخ احتياطي
   ============================================================ */
function demoData() {
  const mk = (name, nid, phone) => { const c = { id: uid(), name, nid, phone, note: '', createdAt: today() }; S.clients.push(c); return c; };
  const d = (c, desc, amount, due, done) => S.debts.push({ id: uid(), clientId: c.id, desc, amount, due, done: !!done });
  const plus = n => { const dt = new Date(); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
  const a = mk('عبدالله محمد الحربي', '1045678901', '0551234567');
  const b = mk('نورة سعد القحطاني', '2098765432', '0567654321');
  const e = mk('فهد ناصر العتيبي', '1122334455', '0509988776');
  d(a, 'قرض شخصي — الدفعة الأولى', 5000, plus(-6));
  d(a, 'الدفعة الثانية', 5000, plus(20));
  d(b, 'فاتورة خدمات', 3200, plus(2));
  d(e, 'مديونية تجارية', 12000, plus(45));
  S.payments.push({ id: uid(), clientId: a.id, amount: 2500, date: plus(-20), method: 'تحويل بنكي', note: '', no: 'R-' + (++S.seq) });
  S.payments.push({ id: uid(), clientId: b.id, amount: 1000, date: plus(-3), method: 'نقدًا', note: '', no: 'R-' + (++S.seq) });
  save(); toast('تم تحميل البيانات التجريبية');
}

/* ============================================================
   الأحداث
   ============================================================ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-go],[data-act],[data-open],[data-debt],[data-pay],[data-tpl],[data-theme],[data-close]');
  if (!el) return;

  if (el.dataset.close !== undefined) return closeSheet();
  if (el.dataset.go) return go(el.dataset.go);
  if (el.dataset.open) return go('client', el.dataset.open);
  if (el.dataset.tpl) return messageSheet(el.dataset.tpl);

  if (el.dataset.debt) { const d = S.debts.find(x => x.id === el.dataset.debt); return d && debtSheet(d); }
  if (el.dataset.pay)  { const p = S.payments.find(x => x.id === el.dataset.pay); return p && receiptSheet(p); }

  if (el.dataset.theme && el.closest('#themeSeg')) {
    S.settings.theme = el.dataset.theme; save(); applyTheme(); renderSettings(); return;
  }

  switch (el.dataset.act) {
    case 'newClient':  return clientForm(null);
    case 'editClient': return clientForm(S.clients.find(x => x.id === currentClient));
    case 'delClient':
      if (!confirm('حذف العميل وكل مديونياته ودفعاته؟')) return;
      S.debts = S.debts.filter(d => d.clientId !== currentClient);
      S.payments = S.payments.filter(p => p.clientId !== currentClient);
      S.clients = S.clients.filter(c => c.id !== currentClient);
      save(); toast('تم حذف العميل'); return go('clients');
    case 'newDebt':    return debtForm();
    case 'newPayment': return paymentForm();
    case 'resetTpl':   S.tpl = {}; save(); renderTemplates(); return toast('تمت الاستعادة');
    case 'saveSettings':
      Object.assign(S.settings, {
        name: $('#setName').value.trim() || 'ربى الوكيل القانوني',
        sub: $('#setSub').value.trim(), phone: $('#setPhone').value.trim(),
        cc: ($('#setCc').value.replace(/\D/g, '') || '966'), cur: $('#setCur').value.trim() || 'ريال'
      });
      save(); brand(); return toast('تم حفظ الإعدادات ✅');
    case 'export': {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
      a.download = 'debt-backup-' + today() + '.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return toast('تم تصدير النسخة');
    }
    case 'import': return $('#fileIn').click();
    case 'demo':   demoData(); return go('home');
    case 'wipe':
      if (!confirm('سيتم مسح جميع البيانات نهائيًا. متابعة؟')) return;
      S = blank(); save(); applyTheme(); brand(); return go('home');
  }
});

$('#fileIn').addEventListener('change', ev => {
  const f = ev.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d.clients) throw 0;
      S = Object.assign(blank(), d, { settings: Object.assign(blank().settings, d.settings || {}) });
      save(); applyTheme(); brand(); go('home'); toast('تم استيراد النسخة ✅');
    } catch { toast('الملف غير صالح'); }
  };
  r.readAsText(f); ev.target.value = '';
});

$('#btnBack').onclick = () => go('clients');
$('#btnTheme').onclick = () => {
  S.settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  save(); applyTheme(); if (currentView === 'settings') renderSettings();
};
$('#q').addEventListener('input', renderClients);

function brand() {
  $('#brandName').textContent = S.settings.name;
  $('#brandSub').textContent = S.settings.sub;
  $('.brand-mark').textContent = (S.settings.name || 'ر')[0];
  document.title = 'تحصيل الديون — ' + S.settings.name;
}

/* ---------- الإقلاع ---------- */
applyTheme(); brand(); go('home');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
