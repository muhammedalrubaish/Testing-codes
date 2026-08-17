/* ============================================================
   المزامنة بين الجهاز وقاعدة البيانات
   المبدأ: التطبيق يعمل محليًا أولًا (حتى بلا إنترنت)، والمزامنة
   ترفع التغييرات ثم تنزّل الجديد. عند التعارض تفوز النسخة الأحدث.
   ============================================================ */
const Sync = (() => {

  let running = false;
  let queued = false;
  const listeners = [];

  const state = { status: 'idle', message: '', at: null };

  function on(fn) { listeners.push(fn); }
  function emit(status, message) {
    state.status = status;
    state.message = message || '';
    state.at = Date.now();
    listeners.forEach(fn => { try { fn(state); } catch (e) {} });
  }
  function get() { return { ...state, ...Store.syncMeta() }; }

  /* ---------- تحويل الصفوف بين شكل التطبيق وشكل الجدول ---------- */
  const toRowClient = (c, userId) => ({
    id: c.id,
    user_id: userId,
    name: c.name || '',
    national_id: c.nationalId || '',
    phone: c.phone || '',
    total: +c.total || 0,
    installment: +c.installment || 0,
    due_date: c.dueDate || null,
    notes: c.notes || '',
    settled: !!c.settled,
    settled_at: c.settledAt || null,
    created_at: c.createdAt || new Date().toISOString(),
    updated_at: c.updatedAt || new Date().toISOString(),
    deleted_at: c.deleted ? (c.deletedAt || new Date().toISOString()) : null
  });

  const fromRowClient = r => ({
    id: r.id,
    name: r.name,
    nationalId: r.national_id || '',
    phone: r.phone || '',
    total: +r.total || 0,
    installment: +r.installment || 0,
    dueDate: r.due_date || '',
    notes: r.notes || '',
    settled: !!r.settled,
    settledAt: r.settled_at || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deleted: !!r.deleted_at,
    deletedAt: r.deleted_at || null
  });

  const toRowPayment = (clientId, p, userId) => ({
    id: p.id,
    client_id: clientId,
    user_id: userId,
    amount: +p.amount || 0,
    paid_on: p.date || new Date().toISOString().slice(0, 10),
    method: p.method || '',
    note: p.note || '',
    ref: p.ref || '',
    auto: !!p.auto,
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: p.updatedAt || new Date().toISOString(),
    deleted_at: p.deleted ? (p.deletedAt || new Date().toISOString()) : null
  });

  const fromRowPayment = r => ({
    id: r.id,
    clientId: r.client_id,
    amount: +r.amount || 0,
    date: r.paid_on || '',
    method: r.method || '',
    note: r.note || '',
    ref: r.ref || '',
    auto: !!r.auto,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deleted: !!r.deleted_at,
    deletedAt: r.deleted_at || null
  });

  const toRowProfile = (p, userId) => ({
    id: userId,
    collector: p.collector || '',
    role: p.role || '',
    phone: p.phone || '',
    currency: p.currency || '',
    country_code: p.countryCode || '',
    templates: p.templates || {},
    seq: p.seq || 1,
    updated_at: new Date().toISOString()
  });

  const fromRowProfile = r => ({
    collector: r.collector,
    role: r.role,
    phone: r.phone,
    currency: r.currency,
    countryCode: r.country_code,
    templates: r.templates,
    seq: r.seq,
    updatedAt: r.updated_at
  });

  /* ---------- المزامنة ---------- */
  async function run(opts) {
    opts = opts || {};
    if (!Cloud.isSignedIn()) return { skipped: 'signed-out' };
    if (running) { queued = true; return { skipped: 'busy' }; }
    if (!navigator.onLine) { emit('offline', 'لا يوجد اتصال — سيُزامن تلقائيًا عند عودة الإنترنت'); return { skipped: 'offline' }; }

    running = true;
    emit('syncing', 'جارٍ المزامنة…');
    try {
      Store.normalizeIds();
      const userId = Cloud.user().id;

      const pushed = await push(userId);
      const pulled = await pull(userId, opts.full);

      Store.purgeDeleted();
      Store.setSyncMeta({ lastSyncAt: new Date().toISOString() });
      emit('ok', `تمت المزامنة · رفع ${pushed} · تنزيل ${pulled}`);
      return { pushed, pulled };
    } catch (e) {
      console.error(e);
      const msg = (e && e.message) || 'تعذّرت المزامنة';
      emit('error', msg);
      throw e;
    } finally {
      running = false;
      if (queued) { queued = false; setTimeout(() => run(), 400); }
    }
  }

  /** يرفع كل ما تغيّر محليًا */
  async function push(userId) {
    const { clients, payments, profile } = Store.dirtyRows();
    let count = 0;

    if (clients.length) {
      await Cloud.upsert('clients', clients.map(c => toRowClient(c, userId)));
      count += clients.length;
    }
    if (payments.length) {
      // الدفعة تشير لعميلها، فيجب أن يكون العميل قد رُفع أولًا (تم أعلاه)
      await Cloud.upsert('payments', payments.map(x => toRowPayment(x.clientId, x.payment, userId)));
      count += payments.length;
    }
    if (profile) {
      await Cloud.upsert('profiles', [toRowProfile(Store.profilePayload(), userId)]);
      count += 1;
    }

    Store.markClean(clients.map(c => c.id), payments.map(x => x.payment.id), profile);
    return count;
  }

  /** ينزّل ما تغيّر على الخادم منذ آخر مزامنة */
  async function pull(userId, full) {
    const meta = Store.syncMeta();
    const since = full ? null : meta.lastPull;
    const startedAt = new Date().toISOString();
    const filter = since ? `&updated_at=gt.${encodeURIComponent(since)}` : '';
    let count = 0;

    const remoteClients = await Cloud.select('clients', `select=*&order=updated_at.asc${filter}`);
    (remoteClients || []).forEach(r => { Store.applyRemoteClient(fromRowClient(r)); count++; });

    const remotePayments = await Cloud.select('payments', `select=*&order=updated_at.asc${filter}`);
    (remotePayments || []).forEach(r => { Store.applyRemotePayment(fromRowPayment(r)); count++; });

    const profiles = await Cloud.select('profiles', `select=*&id=eq.${userId}&limit=1`);
    if (profiles && profiles[0]) Store.applyRemoteProfile(fromRowProfile(profiles[0]));

    Store.setSyncMeta({ lastPull: startedAt });
    Store.save(true); // صامت: حفظ نتيجة التنزيل يجب ألا يُطلق مزامنة جديدة
    return count;
  }

  /** مزامنة مؤجّلة بعد كل تعديل حتى لا نرسل طلبًا لكل ضغطة */
  let debounceTimer;
  function schedule(delay) {
    if (!Cloud.isSignedIn()) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { run().catch(() => {}); }, delay || 2500);
  }

  /** أول ربط بحساب: نرفع كل ما على الجهاز ثم ننزّل كل ما في الحساب */
  async function firstSync() {
    Store.normalizeIds();
    Store.markAllDirty();
    return run({ full: true });
  }

  function start() {
    window.addEventListener('online', () => schedule(500));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') schedule(1200);
    });
    if (Cloud.isSignedIn()) schedule(800);
  }

  return { run, schedule, firstSync, start, on, get, state };
})();
