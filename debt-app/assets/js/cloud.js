/* ============================================================
   الاتصال بقاعدة البيانات (Supabase) — بدون أي مكتبات خارجية
   استدعاءات fetch مباشرة لواجهتي Auth و REST
   ============================================================ */
const Cloud = (() => {

  /* إعدادات المشروع — المفتاح العام (publishable) آمن للنشر:
     الحماية الحقيقية من سياسات RLS في قاعدة البيانات، فكل مستخدم
     لا يستطيع قراءة أو تعديل إلا صفوفه هو. */
  const DEFAULT_URL = 'https://wforyjjgufaebdpayedz.supabase.co';
  const DEFAULT_KEY = 'sb_publishable_vowAEM1IgST6tWesTZSzSw_84WQdF-K';

  const SESSION_KEY = 'tahseel.session';
  const CONFIG_KEY  = 'tahseel.cloudConfig';

  let config  = readJSON(CONFIG_KEY) || { url: DEFAULT_URL, key: DEFAULT_KEY };
  let session = readJSON(SESSION_KEY);

  function readJSON(k) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  }
  function writeJSON(k, v) {
    try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) {}
  }

  /** لتوجيه التطبيق لمشروع آخر (أو خادم اختبار) دون تعديل الكود */
  function configure(next) {
    config = { url: (next.url || '').replace(/\/+$/, ''), key: next.key || '' };
    writeJSON(CONFIG_KEY, config);
  }
  function endpoint() { return config.url; }
  function isConfigured() { return !!(config.url && config.key); }
  function isSignedIn() { return !!(session && session.refresh_token); }
  function user() { return session ? session.user : null; }

  function setSession(s) {
    if (!s || !s.access_token) return null;
    session = {
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: Date.now() + ((s.expires_in || 3600) - 60) * 1000,
      user: s.user ? { id: s.user.id, email: s.user.email } : (session && session.user)
    };
    writeJSON(SESSION_KEY, session);
    return session;
  }

  function clearSession() { session = null; writeJSON(SESSION_KEY, null); }

  async function authFetch(path, body, params) {
    const qs = params ? '?' + new URLSearchParams(params) : '';
    const res = await fetch(`${config.url}/auth/v1/${path}${qs}`, {
      method: 'POST',
      headers: { 'apikey': config.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(translateAuthError(data, res.status));
    return data;
  }

  function translateAuthError(data, status) {
    const msg = (data && (data.error_description || data.msg || data.message || data.error)) || '';
    const m = String(msg).toLowerCase();
    if (m.includes('invalid login')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    if (m.includes('email not confirmed')) return 'لم يتم تأكيد البريد الإلكتروني بعد';
    if (m.includes('already registered') || m.includes('already been registered')) return 'هذا البريد مسجّل مسبقًا — سجّل الدخول بدلًا من إنشاء حساب';
    if (m.includes('password') && m.includes('6')) return 'كلمة المرور قصيرة — 6 أحرف على الأقل';
    if (m.includes('rate limit')) return 'محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة';
    if (status === 0) return 'تعذّر الاتصال بالخادم — تحقق من الإنترنت';
    return msg || `تعذّر إتمام الطلب (${status})`;
  }

  async function signUp(email, password) {
    const data = await authFetch('signup', { email, password });
    // إذا كان تأكيد البريد مفعّلًا يعود المستخدم بلا جلسة
    if (data.access_token) { setSession(data); return { signedIn: true }; }
    return { signedIn: false, needsConfirm: true };
  }

  async function signIn(email, password) {
    const data = await authFetch('token', { email, password }, { grant_type: 'password' });
    setSession(data);
    return session;
  }

  async function signOut() {
    const t = session && session.access_token;
    clearSession();
    if (t) {
      try {
        await fetch(`${config.url}/auth/v1/logout`, {
          method: 'POST',
          headers: { 'apikey': config.key, 'Authorization': `Bearer ${t}` }
        });
      } catch (e) {}
    }
  }

  async function changePassword(password) {
    const t = await token();
    const res = await fetch(`${config.url}/auth/v1/user`, {
      method: 'PUT',
      headers: { 'apikey': config.key, 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(translateAuthError(data, res.status));
    return true;
  }

  /** يعيد رمز وصول صالحًا، ويجدّده تلقائيًا عند انتهائه */
  async function token() {
    if (!session) throw new Error('غير مسجّل الدخول');
    if (session.expires_at && Date.now() < session.expires_at) return session.access_token;
    const data = await authFetch('token', { refresh_token: session.refresh_token }, { grant_type: 'refresh_token' });
    setSession(data);
    return session.access_token;
  }

  /**
   * طلب على واجهة REST (PostgREST).
   * @param {string} path مثل: clients?select=*
   */
  async function rest(path, opts) {
    opts = opts || {};
    const t = await token();
    const headers = {
      'apikey': config.key,
      'Authorization': `Bearer ${t}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    };
    const res = await fetch(`${config.url}/rest/v1/${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) clearSession();
      throw new Error(err.message || err.hint || `خطأ من الخادم (${res.status})`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  /** إدراج أو تحديث دفعة واحدة من الصفوف حسب المفتاح الأساسي */
  function upsert(table, rows) {
    if (!rows.length) return Promise.resolve([]);
    return rest(table, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: rows
    });
  }

  function select(table, query) {
    return rest(`${table}?${query}`);
  }

  return {
    configure, endpoint, isConfigured, isSignedIn, user,
    signUp, signIn, signOut, changePassword,
    rest, upsert, select
  };
})();
