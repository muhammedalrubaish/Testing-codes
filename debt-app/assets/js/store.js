/* ============================================================
   طبقة البيانات — تخزين محلي (localStorage)
   ============================================================ */
const Store = (() => {
  const KEY = 'tahseel.v1';

  const DEFAULT_TEMPLATES = {
    welcome: {
      title: 'الترحيب بالعميل',
      icon: 'i-hand',
      text:
`السلام عليكم ورحمة الله وبركاته
أهلًا وسهلًا بك أستاذ/ة {الاسم} 🌿

معك {المحصل} — {الصفة}.
تم إسناد ملف المديونية الخاص بكم إلينا للمتابعة والتنسيق معكم بشكل ودّي.

• رقم الهوية: {الهوية}
• إجمالي المديونية: {الإجمالي} {العملة}
• المتبقي حاليًا: {المتبقي} {العملة}

نسعد بخدمتكم والاتفاق على جدولة سداد مناسبة لظروفكم.
شكرًا لتعاونكم 🤝`
    },
    reminder: {
      title: 'تذكير بسداد الدفعة',
      icon: 'i-bell',
      text:
`السلام عليكم أستاذ/ة {الاسم} 🌿

تذكير ودّي من {المحصل} بخصوص الدفعة المستحقة عليكم:

• المبلغ المستحق: {المبلغ} {العملة}
• تاريخ الاستحقاق: {تاريخ_الاستحقاق}
• المتبقي من إجمالي المديونية: {المتبقي} {العملة}

نأمل السداد في الموعد، وفي حال تم السداد يُرجى تزويدنا بصورة الإيصال ليتم تحديث الملف مباشرة.

وتفضلوا بقبول خالص التقدير
{المحصل}`
    },
    overdue: {
      title: 'إشعار تأخر عن السداد',
      icon: 'i-bell',
      text:
`السلام عليكم أستاذ/ة {الاسم}

نفيدكم بأن الدفعة المستحقة بتاريخ {تاريخ_الاستحقاق} لم تُسدَّد حتى تاريخه {التاريخ}، وقد بلغت مدة التأخير {أيام_التأخير} يومًا.

• المبلغ المتأخر: {المبلغ} {العملة}
• المتبقي من المديونية: {المتبقي} {العملة}

نأمل المبادرة بالسداد أو التواصل معنا لجدولة المبلغ ودّيًا قبل اتخاذ أي إجراء نظامي.

{المحصل} — {الصفة}
للتواصل: {جوال_المحصل}`
    },
    proof: {
      title: 'إرفاق سند إثبات السداد',
      icon: 'i-doc',
      text:
`السلام عليكم أستاذ/ة {الاسم} 🌿

نفيدكم باستلام مبلغ {المبلغ} {العملة} بتاريخ {التاريخ}، ومرفق سند الاستلام رقم {رقم_السند} إثباتًا لذلك.

• إجمالي المسدّد: {المسدد} {العملة}
• المتبقي من المديونية: {المتبقي} {العملة}

شكرًا لالتزامكم وتعاونكم 🤝
{المحصل} — {الصفة}`
    },
    settlement: {
      title: 'إشعار إخلاء طرف / سداد كامل',
      icon: 'i-check',
      text:
`السلام عليكم أستاذ/ة {الاسم} 🌿

يسرّنا إفادتكم بسداد كامل المديونية البالغة {الإجمالي} {العملة} بتاريخ {التاريخ}، ولا يوجد أي مبالغ مستحقة عليكم في ملفنا.

مرفق سند الإثبات رقم {رقم_السند}.
شكرًا لحسن تعاملكم وثقتكم 🤝

{المحصل} — {الصفة}`
    }
  };

  const DEFAULTS = {
    settings: {
      collector: 'ربى',
      role: 'الوكيل القانوني لتحصيل الديون',
      phone: '',
      currency: 'ر.س',
      countryCode: '966',
      theme: 'light',
      attachProof: true
    },
    templates: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)),
    clients: [],
    seq: 1,
    /* بيانات المزامنة السحابية */
    profileDirty: false,
    profileUpdatedAt: null,
    lastPull: null,
    lastSyncAt: null
  };

  const nowISO = () => new Date().toISOString();

  /** معرّف UUID — تحتاجه قاعدة البيانات كمفتاح أساسي */
  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
      const r = Math.random() * 16 | 0;
      return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  const isUUID = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const parsed = JSON.parse(raw);
      return {
        ...JSON.parse(JSON.stringify(DEFAULTS)),
        ...parsed,
        settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
        templates: mergeTemplates(parsed.templates)
      };
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  function mergeTemplates(saved) {
    const out = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
    if (saved) {
      Object.keys(out).forEach(k => {
        if (saved[k] && typeof saved[k].text === 'string') out[k].text = saved[k].text;
      });
    }
    return out;
  }

  /* مستمعو التغيير — تستخدمها المزامنة لترفع أي تعديل تلقائيًا */
  const changeHandlers = [];
  function onChange(fn) { changeHandlers.push(fn); }

  function save(silent) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    if (!silent) changeHandlers.forEach(fn => { try { fn(); } catch (e) {} });
  }

  /* ---------- العملاء ----------
     الحذف «ناعم»: نضع علامة deleted بدل الإزالة، لتنتقل عملية الحذف
     إلى قاعدة البيانات وبقية الأجهزة عند المزامنة. */
  function clients() { return data.clients.filter(c => !c.deleted); }
  function client(id) {
    const c = data.clients.find(x => x.id === id);
    return c && !c.deleted ? c : null;
  }
  /** دفعات العميل الفعلية (بعد استبعاد المحذوفة) */
  function paymentsOf(c) { return ((c && c.payments) || []).filter(p => !p.deleted); }

  function upsertClient(c) {
    if (c.id) {
      const i = data.clients.findIndex(x => x.id === c.id);
      if (i > -1) data.clients[i] = { ...data.clients[i], ...c, updatedAt: nowISO(), dirty: true };
    } else {
      c.id = uuid();
      c.createdAt = nowISO();
      c.updatedAt = nowISO();
      c.dirty = true;
      c.payments = [];
      data.clients.unshift(c);
    }
    save();
    return c.id;
  }

  function removeClient(id) {
    const c = data.clients.find(x => x.id === id);
    if (!c) return;
    c.deleted = true;
    c.deletedAt = nowISO();
    c.updatedAt = nowISO();
    c.dirty = true;
    // الدفعات تُحذف تبعًا للعميل في قاعدة البيانات، ونعلّمها محليًا أيضًا
    (c.payments || []).forEach(p => { p.deleted = true; p.deletedAt = c.deletedAt; p.updatedAt = c.updatedAt; p.dirty = true; });
    save();
  }

  function addPayment(clientId, payment) {
    const c = client(clientId);
    if (!c) return null;
    payment.id = uuid();
    payment.ref = nextRef();
    payment.createdAt = nowISO();
    payment.updatedAt = nowISO();
    payment.dirty = true;
    c.payments = c.payments || [];
    c.payments.unshift(payment);
    save();
    return payment;
  }

  function removePayment(clientId, paymentId) {
    const c = client(clientId);
    if (!c) return;
    const p = (c.payments || []).find(x => x.id === paymentId);
    if (!p) return;
    p.deleted = true;
    p.deletedAt = nowISO();
    p.updatedAt = nowISO();
    p.dirty = true;
    save();
  }

  function nextRef() {
    const n = data.seq || 1;
    data.seq = n + 1;
    data.profileDirty = true;
    data.profileUpdatedAt = nowISO();
    save();
    const y = new Date().getFullYear();
    return `${y}-${String(n).padStart(4, '0')}`;
  }

  /* ---------- حسابات ---------- */
  function paidOf(c) { return paymentsOf(c).reduce((s, p) => s + (+p.amount || 0), 0); }
  function remainingOf(c) { return Math.max(0, (+c.total || 0) - paidOf(c)); }

  function statusOf(c) {
    if (c.settled) return 'paid';
    // ملف بلا مبلغ مسجّل ولا دفعات لا يُعدّ مسدّدًا
    if ((+c.total || 0) > 0 && remainingOf(c) <= 0) return 'paid';
    const d = c.dueDate ? new Date(c.dueDate + 'T00:00:00') : null;
    if (!d || isNaN(d)) return 'due';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return d < today ? 'late' : 'due';
  }

  /** تعليم الملف كمسدَّد بالكامل أو التراجع عن ذلك */
  function setSettled(id, value) {
    const c = client(id);
    if (!c) return null;
    c.settled = !!value;
    c.settledAt = value ? new Date().toISOString().slice(0, 10) : '';
    c.updatedAt = nowISO();
    c.dirty = true;
    save();
    return c;
  }

  function daysLate(c) {
    if (!c.dueDate) return 0;
    const d = new Date(c.dueDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((today - d) / 86400000));
  }

  /* ---------- الإعدادات والقوالب ---------- */
  // الوضع الداكن وخيار إرفاق السند تفضيلات خاصة بالجهاز، فلا تُزامَن
  const LOCAL_ONLY = ['theme', 'attachProof'];

  function settings() { return data.settings; }
  function setSettings(patch) {
    Object.assign(data.settings, patch);
    if (Object.keys(patch).some(k => !LOCAL_ONLY.includes(k))) markProfileDirty();
    save();
  }
  function templates() { return data.templates; }
  function setTemplate(key, text) {
    if (data.templates[key]) { data.templates[key].text = text; markProfileDirty(); save(); }
  }
  function resetTemplates() {
    data.templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
    markProfileDirty();
    save();
  }
  function markProfileDirty() { data.profileDirty = true; data.profileUpdatedAt = nowISO(); }

  /* ---------- نسخ احتياطي ---------- */
  function exportJSON() { return JSON.stringify(data, null, 2); }
  function importJSON(json) {
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.clients)) throw new Error('ملف غير صالح');
    data = {
      ...JSON.parse(JSON.stringify(DEFAULTS)),
      ...parsed,
      settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
      templates: mergeTemplates(parsed.templates)
    };
    save();
  }
  function wipe() { data = JSON.parse(JSON.stringify(DEFAULTS)); save(); }

  function loadDemo() {
    const today = new Date();
    const iso = d => d.toISOString().slice(0, 10);
    const shift = n => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };
    data.clients = [
      {
        id: 'demo1', name: 'خالد عبدالله المطيري', nationalId: '1045872365', phone: '0551234567',
        total: 18500, dueDate: shift(-12), installment: 2500, notes: 'ملف مُسند من شركة الوفاء التجارية',
        createdAt: today.toISOString(),
        payments: [{ id: 'pd1', ref: '2026-0001', amount: 2500, date: shift(-40), method: 'تحويل بنكي', note: 'الدفعة الأولى' }]
      },
      {
        id: 'demo2', name: 'نورة سعد القحطاني', nationalId: '2098451237', phone: '0567788991',
        total: 9000, dueDate: shift(5), installment: 1500, notes: '',
        createdAt: today.toISOString(),
        payments: [
          { id: 'pd2', ref: '2026-0002', amount: 1500, date: shift(-25), method: 'تحويل بنكي', note: '' },
          { id: 'pd3', ref: '2026-0003', amount: 1500, date: shift(-2), method: 'نقدًا', note: '' }
        ]
      },
      {
        id: 'demo3', name: 'مؤسسة الأفق للمقاولات', nationalId: '7001234567', phone: '0509988776',
        total: 42000, dueDate: shift(-3), installment: 7000, notes: 'سجل تجاري — التواصل مع المدير المالي',
        createdAt: today.toISOString(), payments: []
      },
      {
        id: 'demo4', name: 'فهد ناصر الحربي', nationalId: '1077889900', phone: '0532211445',
        total: 6000, dueDate: shift(-60), installment: 0, notes: '',
        createdAt: today.toISOString(),
        payments: [{ id: 'pd4', ref: '2026-0004', amount: 6000, date: shift(-10), method: 'تحويل بنكي', note: 'سداد كامل' }]
      }
    ];
    data.seq = 5;
    save();
  }

  /* ============================================================
     واجهة المزامنة — يستخدمها sync.js
     ============================================================ */

  /** كل الصفوف بما فيها المحذوفة (للمزامنة فقط) */
  function allClients() { return data.clients; }

  /** الصفوف التي تغيّرت محليًا ولم تُرفع بعد */
  function dirtyRows() {
    const cs = data.clients.filter(c => c.dirty);
    const ps = [];
    data.clients.forEach(c => (c.payments || []).forEach(p => { if (p.dirty) ps.push({ clientId: c.id, payment: p }); }));
    return { clients: cs, payments: ps, profile: !!data.profileDirty };
  }

  /** يزيل علامة «غير مرفوع» بعد نجاح الرفع */
  function markClean(clientIds, paymentIds, profileDone) {
    const cset = new Set(clientIds || []);
    const pset = new Set(paymentIds || []);
    data.clients.forEach(c => {
      if (cset.has(c.id)) c.dirty = false;
      (c.payments || []).forEach(p => { if (pset.has(p.id)) p.dirty = false; });
    });
    if (profileDone) data.profileDirty = false;
    save(true);
  }

  /** ينظّف السجلات المحذوفة التي رُفع حذفها بالفعل */
  function purgeDeleted() {
    data.clients = data.clients.filter(c => !(c.deleted && !c.dirty));
    data.clients.forEach(c => { c.payments = (c.payments || []).filter(p => !(p.deleted && !p.dirty)); });
    save(true);
  }

  /**
   * يحوّل المعرّفات القديمة (قبل ربط قاعدة البيانات) إلى UUID
   * حتى تُقبل كمفاتيح أساسية في Postgres.
   */
  function normalizeIds() {
    let changed = false;
    data.clients.forEach(c => {
      if (!isUUID(c.id)) { c.id = uuid(); c.dirty = true; changed = true; }
      if (!c.updatedAt) { c.updatedAt = c.createdAt || nowISO(); c.dirty = true; changed = true; }
      (c.payments || []).forEach(p => {
        if (!isUUID(p.id)) { p.id = uuid(); p.dirty = true; changed = true; }
        if (!p.updatedAt) { p.updatedAt = p.createdAt || nowISO(); p.dirty = true; changed = true; }
      });
    });
    if (changed) save();
    return changed;
  }

  /** يدمج صفًا قادمًا من قاعدة البيانات (الأحدث يفوز) */
  function applyRemoteClient(remote) {
    const i = data.clients.findIndex(c => c.id === remote.id);
    if (i === -1) {
      if (remote.deleted) return;
      data.clients.unshift({ ...remote, payments: [], dirty: false });
      return;
    }
    const local = data.clients[i];
    // لا نطمس تعديلًا محليًا لم يُرفع بعد وهو أحدث من نسخة الخادم
    if (local.dirty && new Date(local.updatedAt || 0) >= new Date(remote.updatedAt || 0)) return;
    data.clients[i] = { ...local, ...remote, payments: local.payments || [], dirty: false };
  }

  function applyRemotePayment(remote) {
    const c = data.clients.find(x => x.id === remote.clientId);
    if (!c) return;
    c.payments = c.payments || [];
    const i = c.payments.findIndex(p => p.id === remote.id);
    const row = { ...remote, dirty: false };
    delete row.clientId;
    if (i === -1) {
      if (remote.deleted) return;
      c.payments.unshift(row);
      c.payments.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      return;
    }
    const local = c.payments[i];
    if (local.dirty && new Date(local.updatedAt || 0) >= new Date(remote.updatedAt || 0)) return;
    c.payments[i] = { ...local, ...row };
  }

  function applyRemoteProfile(p) {
    if (!p) return;
    if (data.profileDirty && new Date(data.profileUpdatedAt || 0) >= new Date(p.updatedAt || 0)) return;
    Object.assign(data.settings, {
      collector: p.collector != null ? p.collector : data.settings.collector,
      role: p.role != null ? p.role : data.settings.role,
      phone: p.phone != null ? p.phone : data.settings.phone,
      currency: p.currency != null ? p.currency : data.settings.currency,
      countryCode: p.countryCode != null ? p.countryCode : data.settings.countryCode
    });
    if (p.templates && Object.keys(p.templates).length) data.templates = mergeTemplates(p.templates);
    if (typeof p.seq === 'number') data.seq = Math.max(data.seq || 1, p.seq);
    data.profileDirty = false;
  }

  function profilePayload() {
    return {
      collector: data.settings.collector,
      role: data.settings.role,
      phone: data.settings.phone,
      currency: data.settings.currency,
      countryCode: data.settings.countryCode,
      templates: data.templates,
      seq: data.seq || 1
    };
  }

  function syncMeta() { return { lastPull: data.lastPull, lastSyncAt: data.lastSyncAt }; }
  function setSyncMeta(m) { Object.assign(data, m); save(true); }

  /** يعلّم كل شيء كغير مرفوع — عند ربط حساب جديد لأول مرة */
  function markAllDirty() {
    data.clients.forEach(c => {
      c.dirty = true;
      (c.payments || []).forEach(p => { p.dirty = true; });
    });
    data.profileDirty = true;
    data.lastPull = null;
    save();
  }

  return {
    clients, client, paymentsOf, upsertClient, removeClient,
    addPayment, removePayment, nextRef,
    paidOf, remainingOf, statusOf, daysLate, setSettled,
    settings, setSettings, templates, setTemplate, resetTemplates,
    exportJSON, importJSON, wipe, loadDemo, onChange,
    // المزامنة
    allClients, dirtyRows, markClean, purgeDeleted, normalizeIds,
    applyRemoteClient, applyRemotePayment, applyRemoteProfile,
    profilePayload, syncMeta, setSyncMeta, markAllDirty, save
  };
})();
