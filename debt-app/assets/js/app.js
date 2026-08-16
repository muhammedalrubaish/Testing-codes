/* ============================================================
   منطق التطبيق — واجهة الجوال
   ============================================================ */
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const money = n => (+n || 0).toLocaleString('ar-EG-u-nu-latn', { maximumFractionDigits: 2 });
  const cur = () => Store.settings().currency || '';
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const fmtDate = iso => {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const STATUS = {
    late: { cls: 'late', label: 'متأخر' },
    due:  { cls: 'due',  label: 'مستحق' },
    paid: { cls: 'paid', label: 'مسدّد' }
  };

  let state = { tab: 'home', filter: 'all', query: '', currentClient: null };

  /* ==================== إشعار ==================== */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ==================== الثيم ==================== */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    $('#themeIcon').setAttribute('href', theme === 'dark' ? '#i-sun' : '#i-moon');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#22261a' : '#667439');
    const tg = $('#themeToggle');
    if (tg) tg.classList.toggle('on', theme === 'dark');
  }
  function toggleTheme() {
    const next = Store.settings().theme === 'dark' ? 'light' : 'dark';
    Store.setSettings({ theme: next });
    applyTheme(next);
  }

  /* ==================== الورقة المنبثقة ==================== */
  function openSheet(html) {
    $('#sheetBody').innerHTML = html;
    $('#sheet').classList.add('open');
    $('#backdrop').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    $('#sheet').classList.remove('open');
    $('#backdrop').classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ==================== التنقل ==================== */
  function go(tab) {
    state.tab = tab;
    state.currentClient = null;
    $$('.screen').forEach(s => s.classList.remove('active'));
    $('#scr-' + tab).classList.add('active');
    $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $('#backBtn').hidden = true;
    $('#fab').hidden = tab !== 'clients' && tab !== 'home';
    const titles = {
      home: ['تحصيل الديون', `${Store.settings().collector} ${Store.settings().role}`],
      clients: ['العملاء', `${Store.clients().length} عميل مسجّل`],
      templates: ['قوالب الرسائل', 'نصوص جاهزة للإرسال عبر واتساب'],
      settings: ['الإعدادات', 'بيانات المحصّل والتطبيق']
    };
    setHeader(titles[tab][0], titles[tab][1]);
    window.scrollTo({ top: 0 });
    render();
  }

  function setHeader(t, s) { $('#hdrTitle').textContent = t; $('#hdrSub').textContent = s; }

  function openClient(id) {
    state.currentClient = id;
    $$('.screen').forEach(s => s.classList.remove('active'));
    $('#scr-client').classList.add('active');
    $('#backBtn').hidden = false;
    $('#fab').hidden = true;
    setHeader('ملف العميل', 'التفاصيل والمعاملات');
    renderClientDetail(id);
    window.scrollTo({ top: 0 });
  }

  /* ==================== واتساب ==================== */
  function normalizePhone(raw) {
    let p = String(raw || '').replace(/[^\d+]/g, '');
    const cc = (Store.settings().countryCode || '').replace(/\D/g, '');
    if (p.startsWith('+')) return p.slice(1);
    if (p.startsWith('00')) return p.slice(2);
    if (cc && p.startsWith(cc)) return p;
    if (p.startsWith('0')) return cc + p.slice(1);
    if (cc && p.length <= 10) return cc + p;
    return p;
  }

  function openWhatsApp(phone, text) {
    const num = normalizePhone(phone);
    if (!num) { toast('لا يوجد رقم جوال لهذا العميل'); return; }
    const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  }

  /* ==================== المتغيرات في القوالب ==================== */
  const VAR_LIST = [
    '{الاسم}', '{الهوية}', '{الجوال}', '{الإجمالي}', '{المسدد}', '{المتبقي}',
    '{المبلغ}', '{العملة}', '{التاريخ}', '{تاريخ_الاستحقاق}', '{أيام_التأخير}',
    '{رقم_السند}', '{المحصل}', '{الصفة}', '{جوال_المحصل}'
  ];

  function fillTemplate(text, c, extra) {
    const s = Store.settings();
    extra = extra || {};
    const paid = Store.paidOf(c), rem = Store.remainingOf(c);
    const map = {
      '{الاسم}': c.name || '',
      '{الهوية}': c.nationalId || '',
      '{الجوال}': c.phone || '',
      '{الإجمالي}': money(c.total),
      '{المسدد}': money(extra.paid != null ? extra.paid : paid),
      '{المتبقي}': money(extra.remaining != null ? extra.remaining : rem),
      '{المبلغ}': money(extra.amount != null ? extra.amount : (c.installment || rem)),
      '{العملة}': s.currency || '',
      '{التاريخ}': fmtDate(extra.date || todayISO()),
      '{تاريخ_الاستحقاق}': fmtDate(c.dueDate),
      '{أيام_التأخير}': String(Store.daysLate(c)),
      '{رقم_السند}': extra.ref || '—',
      '{المحصل}': s.collector || '',
      '{الصفة}': s.role || '',
      '{جوال_المحصل}': s.phone || '—'
    };
    return String(text).replace(/\{[^}]+\}/g, m => (m in map ? map[m] : m));
  }

  /* ==================== العرض ==================== */
  function render() {
    if (state.tab === 'home') renderHome();
    if (state.tab === 'clients') renderClients();
    if (state.tab === 'templates') renderTemplates();
    if (state.tab === 'settings') renderSettings();
  }

  function renderHome() {
    const cs = Store.clients();
    const out = cs.reduce((s, c) => s + Store.remainingOf(c), 0);
    const paid = cs.reduce((s, c) => s + Store.paidOf(c), 0);
    $('#statOutstanding').textContent = `${money(out)} ${cur()}`;
    $('#statCollected').textContent = money(paid);
    $('#statClients').textContent = money(cs.length);
    $('#statLate').textContent = cs.filter(c => Store.statusOf(c) === 'late').length;
    $('#statDue').textContent = cs.filter(c => Store.statusOf(c) === 'due').length;
    $('#statPaid').textContent = cs.filter(c => Store.statusOf(c) === 'paid').length;

    const list = $('#homeList');
    list.innerHTML = '';
    const top = cs.filter(c => Store.statusOf(c) !== 'paid')
      .sort((a, b) => Store.daysLate(b) - Store.daysLate(a) || Store.remainingOf(b) - Store.remainingOf(a))
      .slice(0, 4);
    if (!top.length) { list.appendChild(emptyBox('لا توجد مديونيات قائمة', 'أضف عميلًا للبدء')); return; }
    top.forEach(c => list.appendChild(clientRow(c)));
  }

  function renderClients() {
    const list = $('#clientsList');
    list.innerHTML = '';
    const q = state.query.trim();
    let cs = Store.clients();
    if (state.filter !== 'all') cs = cs.filter(c => Store.statusOf(c) === state.filter);
    if (q) cs = cs.filter(c =>
      (c.name || '').includes(q) ||
      (c.nationalId || '').includes(q) ||
      (c.phone || '').includes(q));
    if (!cs.length) {
      list.appendChild(emptyBox(q ? 'لا توجد نتائج' : 'لا يوجد عملاء بعد', q ? 'جرّب كلمة بحث أخرى' : 'اضغط زر + لإضافة أول عميل'));
      return;
    }
    cs.forEach(c => list.appendChild(clientRow(c)));
  }

  function emptyBox(title, sub) {
    return el('div', 'empty', `<svg><use href="#i-empty"/></svg><b>${esc(title)}</b><span>${esc(sub)}</span>`);
  }

  function clientRow(c) {
    const st = STATUS[Store.statusOf(c)];
    const rem = Store.remainingOf(c);
    const node = el('div', 'client', `
      <div class="avatar">${esc((c.name || '؟').trim().charAt(0))}</div>
      <div class="info">
        <b>${esc(c.name)}</b>
        <div class="meta">
          <span>هوية: ${esc(c.nationalId || '—')}</span>
          <span dir="ltr">${esc(c.phone || '—')}</span>
        </div>
      </div>
      <div class="amt">
        <b>${money(rem)}</b>
        <span class="pill ${st.cls}">${st.label}</span>
      </div>`);
    node.addEventListener('click', () => openClient(c.id));
    return node;
  }

  /* ==================== تفاصيل العميل ==================== */
  function renderClientDetail(id) {
    const c = Store.client(id);
    if (!c) { go('clients'); return; }
    const paid = Store.paidOf(c), rem = Store.remainingOf(c);
    const pct = c.total > 0 ? Math.min(100, Math.round(paid / c.total * 100)) : 0;
    const st = STATUS[Store.statusOf(c)];
    const late = Store.daysLate(c);

    const payments = (c.payments || []).map(p => `
      <div class="pay-row">
        <div class="dot"><svg><use href="#i-check"/></svg></div>
        <div class="pi">
          <b>${money(p.amount)} ${esc(cur())}</b>
          <span>${fmtDate(p.date)} · ${esc(p.method || '—')} · سند ${esc(p.ref || '—')}</span>
        </div>
        <button class="btn sm outline" data-proof="${esc(p.id)}">السند</button>
        <button class="btn sm danger" data-delpay="${esc(p.id)}"><svg><use href="#i-trash"/></svg></button>
      </div>`).join('') || '<p style="font-size:13px;color:var(--ink-faint);padding:8px 0">لم تُسجَّل أي دفعات بعد.</p>';

    $('#scr-client').innerHTML = `
      <div class="detail-head">
        <div class="avatar">${esc((c.name || '؟').trim().charAt(0))}</div>
        <div style="flex:1;min-width:0">
          <b>${esc(c.name)}</b>
          <span>هوية: ${esc(c.nationalId || '—')} · <span dir="ltr">${esc(c.phone || '—')}</span></span>
        </div>
        <span class="pill ${st.cls}">${st.label}${st.cls === 'late' ? ' ' + late + ' يوم' : ''}</span>
      </div>

      <div class="card hero">
        <div class="label">المتبقي في الذمة</div>
        <div class="amount">${money(rem)} ${esc(cur())}</div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <div class="split">
          <div><span>الإجمالي</span><b>${money(c.total)}</b></div>
          <div><span>المسدَّد</span><b>${money(paid)}</b></div>
        </div>
      </div>

      <div class="section-title">التواصل السريع عبر واتساب</div>
      <div class="quick-grid">
        <button class="quick" data-send="welcome">
          <div class="ico"><svg><use href="#i-hand"/></svg></div>
          <b>ترحيب</b><span>رسالة تعريف</span>
        </button>
        <button class="quick" data-send="reminder">
          <div class="ico"><svg><use href="#i-bell"/></svg></div>
          <b>تذكير بالسداد</b><span>دفعة مستحقة</span>
        </button>
        <button class="quick" data-send="overdue">
          <div class="ico"><svg><use href="#i-chat"/></svg></div>
          <b>إشعار تأخر</b><span>تجاوز الموعد</span>
        </button>
        <button class="quick" data-proofsend="1">
          <div class="ico"><svg><use href="#i-doc"/></svg></div>
          <b>سند إثبات</b><span>إرفاق صورة السند</span>
        </button>
      </div>
      <button class="btn wa block" style="margin-top:10px" data-openwa="1">
        <svg><use href="#i-wa"/></svg> فتح محادثة واتساب مباشرة
      </button>

      <div class="section-title">بيانات الملف</div>
      <div class="card">
        <div class="kv"><span>تاريخ الاستحقاق</span><b>${fmtDate(c.dueDate)}</b></div>
        <div class="kv"><span>قيمة القسط</span><b>${money(c.installment)} ${esc(cur())}</b></div>
        <div class="kv"><span>عدد الدفعات</span><b>${(c.payments || []).length}</b></div>
        ${c.notes ? `<div class="kv"><span>ملاحظات</span><b style="max-width:60%;text-align:left">${esc(c.notes)}</b></div>` : ''}
      </div>

      <div class="section-title">
        <span>سجل الدفعات</span>
        <button class="btn ghost sm" data-addpay="1"><svg><use href="#i-plus"/></svg> دفعة</button>
      </div>
      <div class="card">${payments}</div>

      <div class="sheet-actions" style="margin-top:16px">
        <button class="btn outline" data-edit="1"><svg><use href="#i-edit"/></svg> تعديل</button>
        <button class="btn danger" data-del="1"><svg><use href="#i-trash"/></svg> حذف</button>
      </div>`;

    const scr = $('#scr-client');
    scr.querySelectorAll('[data-send]').forEach(b =>
      b.addEventListener('click', () => composeMessage(c.id, b.dataset.send)));
    scr.querySelector('[data-proofsend]').addEventListener('click', () => proofFlow(c.id));
    scr.querySelector('[data-openwa]').addEventListener('click', () => openWhatsApp(c.phone, ''));
    scr.querySelector('[data-addpay]').addEventListener('click', () => paymentForm(c.id));
    scr.querySelector('[data-edit]').addEventListener('click', () => clientForm(c.id));
    scr.querySelector('[data-del]').addEventListener('click', () => confirmDelete(c.id));
    scr.querySelectorAll('[data-proof]').forEach(b =>
      b.addEventListener('click', () => proofFlow(c.id, b.dataset.proof)));
    scr.querySelectorAll('[data-delpay]').forEach(b =>
      b.addEventListener('click', () => {
        Store.removePayment(c.id, b.dataset.delpay);
        toast('تم حذف الدفعة');
        renderClientDetail(c.id);
      }));
  }

  /* ==================== نموذج العميل ==================== */
  function clientForm(id) {
    const c = id ? Store.client(id) : { name: '', nationalId: '', phone: '', total: '', dueDate: '', installment: '', notes: '' };
    openSheet(`
      <h3>${id ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h3>
      <p class="sub">البيانات تُحفظ على جهازك فقط</p>
      <div class="field">
        <label>الاسم الكامل *</label>
        <input id="f-name" type="text" value="${esc(c.name)}" placeholder="مثال: خالد عبدالله المطيري" />
      </div>
      <div class="field row2">
        <div>
          <label>رقم الهوية / السجل *</label>
          <input id="f-nid" type="text" inputmode="numeric" dir="ltr" value="${esc(c.nationalId)}" placeholder="1xxxxxxxxx" />
        </div>
        <div>
          <label>رقم الجوال *</label>
          <input id="f-phone" type="tel" inputmode="tel" dir="ltr" value="${esc(c.phone)}" placeholder="05xxxxxxxx" />
        </div>
      </div>
      <div class="field row2">
        <div>
          <label>إجمالي المديونية</label>
          <input id="f-total" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(c.total)}" />
        </div>
        <div>
          <label>قيمة القسط</label>
          <input id="f-inst" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(c.installment)}" />
        </div>
      </div>
      <div class="field">
        <label>تاريخ الاستحقاق</label>
        <input id="f-due" type="date" value="${esc(c.dueDate)}" />
      </div>
      <div class="field">
        <label>ملاحظات</label>
        <textarea id="f-notes" style="min-height:70px" placeholder="جهة الإسناد، تفاصيل الاتفاق…">${esc(c.notes)}</textarea>
      </div>
      <div class="sheet-actions">
        <button class="btn outline" data-x="cancel">إلغاء</button>
        <button class="btn" data-x="save">حفظ</button>
      </div>`);

    $('#sheetBody').querySelector('[data-x="cancel"]').addEventListener('click', closeSheet);
    $('#sheetBody').querySelector('[data-x="save"]').addEventListener('click', () => {
      const name = $('#f-name').value.trim();
      const nid = $('#f-nid').value.trim();
      const phone = $('#f-phone').value.trim();
      if (!name) { toast('الرجاء إدخال اسم العميل'); return; }
      if (!nid) { toast('الرجاء إدخال رقم الهوية'); return; }
      if (!phone) { toast('الرجاء إدخال رقم الجوال'); return; }
      const payload = {
        id: id || undefined,
        name, nationalId: nid, phone,
        total: +$('#f-total').value || 0,
        installment: +$('#f-inst').value || 0,
        dueDate: $('#f-due').value,
        notes: $('#f-notes').value.trim()
      };
      const newId = Store.upsertClient(payload);
      closeSheet();
      toast(id ? 'تم تحديث البيانات' : 'تمت إضافة العميل');
      if (id) renderClientDetail(id); else openClient(newId);
    });
  }

  function confirmDelete(id) {
    const c = Store.client(id);
    openSheet(`
      <h3>حذف العميل</h3>
      <p class="sub">سيتم حذف ملف «${esc(c.name)}» وجميع دفعاته نهائيًا.</p>
      <div class="sheet-actions">
        <button class="btn outline" data-x="cancel">تراجع</button>
        <button class="btn danger" data-x="ok">حذف نهائي</button>
      </div>`);
    $('#sheetBody').querySelector('[data-x="cancel"]').addEventListener('click', closeSheet);
    $('#sheetBody').querySelector('[data-x="ok"]').addEventListener('click', () => {
      Store.removeClient(id); closeSheet(); toast('تم حذف العميل'); go('clients');
    });
  }

  /* ==================== الدفعات ==================== */
  function paymentForm(id) {
    const c = Store.client(id);
    const rem = Store.remainingOf(c);
    openSheet(`
      <h3>تسجيل دفعة</h3>
      <p class="sub">${esc(c.name)} · المتبقي ${money(rem)} ${esc(cur())}</p>
      <div class="field row2">
        <div>
          <label>المبلغ *</label>
          <input id="p-amt" type="number" inputmode="decimal" min="0" step="0.01" value="${c.installment || rem || ''}" />
        </div>
        <div>
          <label>التاريخ</label>
          <input id="p-date" type="date" value="${todayISO()}" />
        </div>
      </div>
      <div class="field">
        <label>طريقة السداد</label>
        <select id="p-method">
          <option>تحويل بنكي</option>
          <option>نقدًا</option>
          <option>شبكة / مدى</option>
          <option>شيك</option>
          <option>أخرى</option>
        </select>
      </div>
      <div class="field">
        <label>ملاحظة</label>
        <input id="p-note" type="text" placeholder="اختياري" />
      </div>
      <div class="field">
        <label style="display:flex;align-items:center;gap:8px;font-weight:600">
          <input type="checkbox" id="p-send" style="width:auto" checked />
          إنشاء سند إثبات وإرساله للعميل بعد الحفظ
        </label>
      </div>
      <div class="sheet-actions">
        <button class="btn outline" data-x="cancel">إلغاء</button>
        <button class="btn" data-x="save">حفظ الدفعة</button>
      </div>`);

    $('#sheetBody').querySelector('[data-x="cancel"]').addEventListener('click', closeSheet);
    $('#sheetBody').querySelector('[data-x="save"]').addEventListener('click', () => {
      const amt = +$('#p-amt').value;
      if (!amt || amt <= 0) { toast('أدخل مبلغًا صحيحًا'); return; }
      const withProof = $('#p-send').checked;
      const p = Store.addPayment(id, {
        amount: amt,
        date: $('#p-date').value || todayISO(),
        method: $('#p-method').value,
        note: $('#p-note').value.trim()
      });
      closeSheet();
      toast('تم تسجيل الدفعة');
      renderClientDetail(id);
      if (withProof) proofFlow(id, p.id);
    });
  }

  /* ==================== إنشاء الرسالة ==================== */
  function composeMessage(clientId, tplKey, extra) {
    const c = Store.client(clientId);
    const tpl = Store.templates()[tplKey];
    if (!c || !tpl) return;
    const text = fillTemplate(tpl.text, c, extra || {});
    openSheet(`
      <h3>${esc(tpl.title)}</h3>
      <p class="sub">${esc(c.name)} · <span dir="ltr">${esc(c.phone)}</span></p>
      <div class="field">
        <label>نص الرسالة (قابل للتعديل قبل الإرسال)</label>
        <textarea id="m-text" style="min-height:200px">${esc(text)}</textarea>
      </div>
      <div class="sheet-actions">
        <button class="btn ghost" data-x="copy"><svg><use href="#i-copy"/></svg> نسخ</button>
        <button class="btn wa" data-x="send"><svg><use href="#i-wa"/></svg> إرسال عبر واتساب</button>
      </div>
      <button class="btn outline block" style="margin-top:10px" data-x="cancel">إغلاق</button>`);

    const body = $('#sheetBody');
    body.querySelector('[data-x="cancel"]').addEventListener('click', closeSheet);
    body.querySelector('[data-x="copy"]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#m-text').value); toast('تم نسخ النص'); }
      catch (e) { toast('تعذّر النسخ'); }
    });
    body.querySelector('[data-x="send"]').addEventListener('click', () => {
      openWhatsApp(c.phone, $('#m-text').value);
      closeSheet();
    });
  }

  /* ==================== سند الإثبات ==================== */
  async function proofFlow(clientId, paymentId) {
    const c = Store.client(clientId);
    if (!c) return;
    let p = paymentId ? (c.payments || []).find(x => x.id === paymentId) : (c.payments || [])[0];

    if (!p) {
      openSheet(`
        <h3>سند إثبات</h3>
        <p class="sub">لا توجد دفعات مسجّلة لهذا العميل. سجّل دفعة أولًا ليتم إصدار السند.</p>
        <div class="sheet-actions">
          <button class="btn outline" data-x="cancel">إغلاق</button>
          <button class="btn" data-x="pay">تسجيل دفعة</button>
        </div>`);
      $('#sheetBody').querySelector('[data-x="cancel"]').addEventListener('click', closeSheet);
      $('#sheetBody').querySelector('[data-x="pay"]').addEventListener('click', () => { closeSheet(); paymentForm(clientId); });
      return;
    }

    // المسدَّد حتى تاريخ هذه الدفعة (بترتيب السجل)
    const list = (c.payments || []).slice().reverse();
    const idx = list.findIndex(x => x.id === p.id);
    const paidUpTo = list.slice(0, idx + 1).reduce((s, x) => s + (+x.amount || 0), 0);
    const remainAfter = Math.max(0, (+c.total || 0) - paidUpTo);
    const s = Store.settings();
    const settled = remainAfter <= 0;

    toast('جارٍ إنشاء السند…');
    const file = await Proof.build({
      title: settled ? 'سند إخلاء طرف وسداد كامل' : 'سند استلام دفعة',
      amountLabel: 'المبلغ المستلم',
      ref: p.ref,
      date: p.date,
      clientName: c.name,
      nationalId: c.nationalId,
      phone: c.phone,
      method: p.method,
      note: p.note,
      total: c.total,
      paid: paidUpTo,
      remaining: remainAfter,
      amount: p.amount,
      currency: s.currency,
      collector: s.collector,
      role: s.role,
      phone_collector: s.phone
    });

    const tplKey = settled ? 'settlement' : 'proof';
    const text = fillTemplate(Store.templates()[tplKey].text, c, {
      amount: p.amount, date: p.date, ref: p.ref, paid: paidUpTo, remaining: remainAfter
    });

    openSheet(`
      <h3>سند إثبات رقم ${esc(p.ref)}</h3>
      <p class="sub">${esc(c.name)} · ${money(p.amount)} ${esc(cur())}</p>
      <div class="proof-preview"><img src="${file.url}" alt="سند الإثبات" /></div>
      <div class="field">
        <label>الرسالة المرافقة</label>
        <textarea id="pr-text" style="min-height:140px">${esc(text)}</textarea>
      </div>
      <div class="note">
        واتساب لا يسمح بإرفاق ملف تلقائيًا من الرابط. اضغط <b>«مشاركة السند»</b> لاختيار واتساب من قائمة المشاركة (يرفق الصورة والنص معًا)، أو <b>«حفظ الصورة»</b> ثم أرفقها يدويًا داخل المحادثة.
      </div>
      <div class="sheet-actions">
        <button class="btn" data-x="share"><svg><use href="#i-share"/></svg> مشاركة السند</button>
        <button class="btn ghost" data-x="save"><svg><use href="#i-download"/></svg> حفظ الصورة</button>
      </div>
      <button class="btn wa block" style="margin-top:10px" data-x="wa"><svg><use href="#i-wa"/></svg> فتح واتساب بالنص فقط</button>
      <button class="btn outline block" style="margin-top:10px" data-x="cancel">إغلاق</button>`);

    const body = $('#sheetBody');
    body.querySelector('[data-x="cancel"]').addEventListener('click', closeSheet);
    body.querySelector('[data-x="save"]').addEventListener('click', () => { Proof.download(file); toast('تم حفظ صورة السند'); });
    body.querySelector('[data-x="wa"]').addEventListener('click', () => { openWhatsApp(c.phone, $('#pr-text').value); });
    body.querySelector('[data-x="share"]').addEventListener('click', async () => {
      const res = await Proof.share(file, $('#pr-text').value);
      if (res === 'downloaded') toast('تم حفظ السند — أرفقه يدويًا في واتساب');
    });
  }

  /* ==================== اختيار عميل (الإجراءات السريعة) ==================== */
  function pickClient(onPick, title) {
    const cs = Store.clients();
    if (!cs.length) { toast('أضف عميلًا أولًا'); clientForm(); return; }
    openSheet(`
      <h3>${esc(title || 'اختر العميل')}</h3>
      <p class="sub">اختر العميل المستهدف من القائمة</p>
      <div class="search" style="margin-top:8px">
        <svg><use href="#i-search"/></svg>
        <input id="pick-q" type="search" placeholder="بحث بالاسم أو الهوية أو الجوال" />
      </div>
      <div id="pick-list" style="margin-top:4px;max-height:52vh;overflow-y:auto"></div>
      <button class="btn outline block" style="margin-top:12px" data-x="cancel">إلغاء</button>`);

    const listBox = $('#pick-list');
    const draw = q => {
      listBox.innerHTML = '';
      cs.filter(c => !q || (c.name || '').includes(q) || (c.nationalId || '').includes(q) || (c.phone || '').includes(q))
        .forEach(c => {
          const st = STATUS[Store.statusOf(c)];
          const row = el('div', 'client', `
            <div class="avatar">${esc((c.name || '؟').charAt(0))}</div>
            <div class="info"><b>${esc(c.name)}</b>
              <div class="meta"><span>هوية: ${esc(c.nationalId || '—')}</span><span dir="ltr">${esc(c.phone || '')}</span></div>
            </div>
            <div class="amt"><b>${money(Store.remainingOf(c))}</b><span class="pill ${st.cls}">${st.label}</span></div>`);
          row.addEventListener('click', () => { closeSheet(); setTimeout(() => onPick(c.id), 220); });
          listBox.appendChild(row);
        });
      if (!listBox.children.length) listBox.appendChild(emptyBox('لا توجد نتائج', ''));
    };
    draw('');
    $('#pick-q').addEventListener('input', e => draw(e.target.value.trim()));
    $('#sheetBody').querySelector('[data-x="cancel"]').addEventListener('click', closeSheet);
  }

  /* ==================== القوالب ==================== */
  function renderTemplates() {
    const box = $('#tplList');
    box.innerHTML = '';
    const tpls = Store.templates();
    Object.keys(tpls).forEach(key => {
      const t = tpls[key];
      const card = el('div', 'card tpl-card', `
        <div class="head">
          <b>${esc(t.title)}</b>
          <button class="btn ghost sm" data-use="${key}"><svg><use href="#i-wa"/></svg> إرسال</button>
        </div>
        <textarea data-tpl="${key}" style="width:100%;min-height:170px;padding:11px;border:1px solid var(--line);border-radius:13px;background:var(--surface-2);color:var(--ink);line-height:1.9;outline:0">${esc(t.text)}</textarea>
        <div class="vars">${VAR_LIST.map(v => `<button data-var="${esc(v)}" data-for="${key}">${esc(v)}</button>`).join('')}</div>`);
      box.appendChild(card);
    });

    box.querySelectorAll('textarea[data-tpl]').forEach(ta => {
      ta.addEventListener('change', () => { Store.setTemplate(ta.dataset.tpl, ta.value); toast('تم حفظ القالب'); });
    });
    box.querySelectorAll('[data-var]').forEach(b => {
      b.addEventListener('click', () => {
        const ta = box.querySelector(`textarea[data-tpl="${b.dataset.for}"]`);
        const pos = ta.selectionStart || ta.value.length;
        ta.value = ta.value.slice(0, pos) + b.dataset.var + ta.value.slice(pos);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = pos + b.dataset.var.length;
        Store.setTemplate(b.dataset.for, ta.value);
      });
    });
    box.querySelectorAll('[data-use]').forEach(b => {
      b.addEventListener('click', () => {
        const key = b.dataset.use;
        if (key === 'proof' || key === 'settlement') pickClient(id => proofFlow(id), 'اختر العميل لإصدار السند');
        else pickClient(id => composeMessage(id, key), 'اختر العميل لإرسال الرسالة');
      });
    });
  }

  /* ==================== الإعدادات ==================== */
  function renderSettings() {
    const s = Store.settings();
    $('#setCollector').value = s.collector;
    $('#setRole').value = s.role;
    $('#setPhone').value = s.phone;
    $('#setCurrency').value = s.currency;
    $('#setCountry').value = s.countryCode;
    $('#themeToggle').classList.toggle('on', s.theme === 'dark');
    $('#proofToggle').classList.toggle('on', !!s.attachProof);
  }

  /* ==================== الربط ==================== */
  function bind() {
    $$('.tabbar button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
    $('#backBtn').addEventListener('click', () => go('clients'));
    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#backdrop').addEventListener('click', closeSheet);
    $('#fab').addEventListener('click', () => clientForm());

    $('#searchInput').addEventListener('input', e => { state.query = e.target.value; renderClients(); });
    $$('#filterChips .chip').forEach(ch => ch.addEventListener('click', () => {
      $$('#filterChips .chip').forEach(x => x.classList.remove('active'));
      ch.classList.add('active');
      state.filter = ch.dataset.filter;
      renderClients();
    }));

    $$('[data-goto]').forEach(b => b.addEventListener('click', () => go(b.dataset.goto)));

    $$('[data-quick]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.quick;
      if (k === 'payment') pickClient(id => paymentForm(id), 'اختر العميل لتسجيل الدفعة');
      else if (k === 'proof') pickClient(id => proofFlow(id), 'اختر العميل لإصدار السند');
      else pickClient(id => composeMessage(id, k), k === 'welcome' ? 'اختر العميل للترحيب' : 'اختر العميل للتذكير');
    }));

    $('#resetTpl').addEventListener('click', () => { Store.resetTemplates(); renderTemplates(); toast('تمت استعادة النصوص الافتراضية'); });

    $('#saveSettings').addEventListener('click', () => {
      Store.setSettings({
        collector: $('#setCollector').value.trim() || 'ربى',
        role: $('#setRole').value.trim(),
        phone: $('#setPhone').value.trim(),
        currency: $('#setCurrency').value.trim(),
        countryCode: $('#setCountry').value.replace(/\D/g, '')
      });
      toast('تم حفظ الإعدادات');
    });

    $('#themeToggle').addEventListener('click', toggleTheme);
    $('#proofToggle').addEventListener('click', () => {
      const v = !Store.settings().attachProof;
      Store.setSettings({ attachProof: v });
      $('#proofToggle').classList.toggle('on', v);
    });

    $('#exportBtn').addEventListener('click', () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `نسخة-تحصيل-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('تم تصدير النسخة');
    });
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try { Store.importJSON(r.result); applyTheme(Store.settings().theme); go('home'); toast('تم استيراد البيانات'); }
        catch (err) { toast('ملف غير صالح'); }
      };
      r.readAsText(f);
      e.target.value = '';
    });
    $('#demoBtn').addEventListener('click', () => { Store.loadDemo(); go('home'); toast('تم تحميل بيانات تجريبية'); });
    $('#wipeBtn').addEventListener('click', () => {
      openSheet(`
        <h3>حذف جميع البيانات</h3>
        <p class="sub">سيتم مسح كل العملاء والدفعات والإعدادات من هذا الجهاز نهائيًا.</p>
        <div class="sheet-actions">
          <button class="btn outline" data-x="cancel">تراجع</button>
          <button class="btn danger" data-x="ok">حذف الكل</button>
        </div>`);
      $('#sheetBody').querySelector('[data-x="cancel"]').addEventListener('click', closeSheet);
      $('#sheetBody').querySelector('[data-x="ok"]').addEventListener('click', () => {
        Store.wipe(); closeSheet(); applyTheme('light'); go('home'); toast('تم حذف جميع البيانات');
      });
    });

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  }

  /* ==================== الإقلاع ==================== */
  applyTheme(Store.settings().theme || 'light');
  bind();
  go('home');
})();
