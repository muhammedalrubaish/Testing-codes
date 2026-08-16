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
    seq: 1
  };

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

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  /* ---------- العملاء ---------- */
  function clients() { return data.clients; }
  function client(id) { return data.clients.find(c => c.id === id) || null; }

  function upsertClient(c) {
    if (c.id) {
      const i = data.clients.findIndex(x => x.id === c.id);
      if (i > -1) data.clients[i] = { ...data.clients[i], ...c };
    } else {
      c.id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      c.createdAt = new Date().toISOString();
      c.payments = [];
      data.clients.unshift(c);
    }
    save();
    return c.id;
  }

  function removeClient(id) {
    data.clients = data.clients.filter(c => c.id !== id);
    save();
  }

  function addPayment(clientId, payment) {
    const c = client(clientId);
    if (!c) return null;
    payment.id = 'p' + Date.now().toString(36);
    payment.ref = nextRef();
    c.payments = c.payments || [];
    c.payments.unshift(payment);
    save();
    return payment;
  }

  function removePayment(clientId, paymentId) {
    const c = client(clientId);
    if (!c) return;
    c.payments = (c.payments || []).filter(p => p.id !== paymentId);
    save();
  }

  function nextRef() {
    const n = data.seq || 1;
    data.seq = n + 1;
    save();
    const y = new Date().getFullYear();
    return `${y}-${String(n).padStart(4, '0')}`;
  }

  /* ---------- حسابات ---------- */
  function paidOf(c) { return (c.payments || []).reduce((s, p) => s + (+p.amount || 0), 0); }
  function remainingOf(c) { return Math.max(0, (+c.total || 0) - paidOf(c)); }

  function statusOf(c) {
    if (remainingOf(c) <= 0) return 'paid';
    const d = c.dueDate ? new Date(c.dueDate + 'T00:00:00') : null;
    if (!d || isNaN(d)) return 'due';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return d < today ? 'late' : 'due';
  }

  function daysLate(c) {
    if (!c.dueDate) return 0;
    const d = new Date(c.dueDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((today - d) / 86400000));
  }

  /* ---------- الإعدادات والقوالب ---------- */
  function settings() { return data.settings; }
  function setSettings(patch) { Object.assign(data.settings, patch); save(); }
  function templates() { return data.templates; }
  function setTemplate(key, text) { if (data.templates[key]) { data.templates[key].text = text; save(); } }
  function resetTemplates() { data.templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)); save(); }

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

  return {
    clients, client, upsertClient, removeClient,
    addPayment, removePayment, nextRef,
    paidOf, remainingOf, statusOf, daysLate,
    settings, setSettings, templates, setTemplate, resetTemplates,
    exportJSON, importJSON, wipe, loadDemo
  };
})();
