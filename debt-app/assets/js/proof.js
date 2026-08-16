/* ============================================================
   مولّد سند الإثبات — صورة PNG تُنشأ محليًا على الجهاز
   ============================================================ */
const Proof = (() => {

  const W = 900, H_MIN = 1240;
  const OLIVE = '#667439', OLIVE_D = '#4f5a2c', OLIVE_L = '#eef1e2';
  const INK = '#23291a', SOFT = '#5f6a4e', LINE = '#dfe4cc';

  function fmt(n) {
    return (+n || 0).toLocaleString('ar-EG-u-nu-latn', { maximumFractionDigits: 2 });
  }

  function hijriLikeDate(iso) {
    const d = iso ? new Date(iso + 'T00:00:00') : new Date();
    if (isNaN(d)) return iso || '';
    return d.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /**
   * ينشئ صورة سند.
   * @param {Object} o {type, client, amount, date, method, ref, total, paid, remaining, collector, role, phone, currency, note}
   * @returns {Promise<{blob: Blob, url: string, name: string}>}
   */
  async function build(o) {
    const F0 = (size, weight) => `${weight || 400} ${size}px Tajawal, "Segoe UI", Tahoma, Arial, sans-serif`;

    // النص الإقراري وملاحظة العملية متغيّرا الطول — نقيسهما أولًا لتحديد ارتفاع السند
    const ack = o.remaining > 0
      ? 'أُقرّ باستلام المبلغ الموضح أعلاه على ذمة المديونية المذكورة، ويبقى في الذمة المبلغ المتبقي المبيّن في هذا السند.'
      : 'أُقرّ باستلام كامل المبلغ الموضح أعلاه، وبراءة ذمة العميل من كامل المديونية المذكورة في هذا السند.';

    const mctx = document.createElement('canvas').getContext('2d');
    let contentEnd = 290 + 200 + 24 + 8 * 56; // نهاية جدول البيانات
    if (o.note) {
      mctx.font = F0(20, 500);
      contentEnd += 20 + wrap(mctx, `ملاحظة: ${o.note}`, 0, 0, W - 140, 30, true) + 10;
    }
    mctx.font = F0(20, 400);
    contentEnd += 34 + wrap(mctx, ack, 0, 0, W - 140, 34, true);

    const sigY = contentEnd + 60;
    const H = Math.max(H_MIN, sigY + 200);

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';

    const F = (size, weight) => `${weight || 400} ${size}px Tajawal, "Segoe UI", Tahoma, Arial, sans-serif`;
    const R = W - 60; // الحافة اليمنى للنص

    // خلفية
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // إطار
    ctx.strokeStyle = LINE; ctx.lineWidth = 2;
    roundRect(ctx, 24, 24, W - 48, H - 48, 26); ctx.stroke();

    // ترويسة
    const grad = ctx.createLinearGradient(0, 0, W, 250);
    grad.addColorStop(0, OLIVE_D); grad.addColorStop(1, OLIVE);
    ctx.fillStyle = grad;
    roundRect(ctx, 24, 24, W - 48, 210, 26); ctx.fill();
    ctx.fillRect(24, 180, W - 48, 54);

    ctx.fillStyle = '#ffffff';
    ctx.font = F(40, 800);
    ctx.fillText(o.title || 'سند استلام دفعة', R, 106);
    ctx.font = F(23, 500);
    ctx.globalAlpha = .9;
    ctx.fillText(`${o.collector || ''} — ${o.role || ''}`, R, 148);
    ctx.globalAlpha = 1;

    // رقم السند والتاريخ
    ctx.font = F(21, 700);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`سند رقم: ${o.ref || '—'}`, 60, 106);
    ctx.font = F(19, 400);
    ctx.globalAlpha = .9;
    ctx.fillText(hijriLikeDate(o.date), 60, 140);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right';

    // صندوق المبلغ
    let y = 290;
    ctx.fillStyle = OLIVE_L;
    roundRect(ctx, 60, y, W - 120, 150, 20); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
    roundRect(ctx, 60, y, W - 120, 150, 20); ctx.stroke();

    ctx.fillStyle = SOFT; ctx.font = F(22, 500);
    ctx.fillText(o.amountLabel || 'المبلغ المستلم', R - 20, y + 50);
    ctx.fillStyle = OLIVE_D; ctx.font = F(56, 800);
    ctx.fillText(`${fmt(o.amount)} ${o.currency || ''}`, R - 20, y + 118);

    // جدول البيانات
    y += 200;
    const rows = [
      ['اسم العميل', o.clientName || '—'],
      ['رقم الهوية / السجل', o.nationalId || '—'],
      ['رقم الجوال', o.phone || '—'],
      ['طريقة السداد', o.method || '—'],
      ['تاريخ العملية', hijriLikeDate(o.date)],
      ['إجمالي المديونية', `${fmt(o.total)} ${o.currency || ''}`],
      ['إجمالي المسدَّد', `${fmt(o.paid)} ${o.currency || ''}`],
      ['المتبقي بعد هذه العملية', `${fmt(o.remaining)} ${o.currency || ''}`]
    ];

    ctx.font = F(24, 700);
    ctx.fillStyle = INK;
    ctx.fillText('بيانات العملية', R, y);
    y += 24;

    rows.forEach((r, i) => {
      const rowH = 56;
      if (i % 2 === 0) {
        ctx.fillStyle = '#fbfcf5';
        roundRect(ctx, 60, y, W - 120, rowH, 12); ctx.fill();
      }
      ctx.fillStyle = SOFT; ctx.font = F(21, 500);
      ctx.fillText(r[0], R - 18, y + 36);
      ctx.fillStyle = INK; ctx.font = F(22, 700);
      ctx.textAlign = 'left';
      ctx.fillText(String(r[1]), 78, y + 36);
      ctx.textAlign = 'right';
      y += rowH;
    });

    // ملاحظة
    if (o.note) {
      y += 20;
      ctx.fillStyle = SOFT; ctx.font = F(20, 500);
      y = wrap(ctx, `ملاحظة: ${o.note}`, R, y, W - 140, 30) + 10;
    }

    // إقرار
    y += 34;
    ctx.fillStyle = INK; ctx.font = F(20, 400);
    y = wrap(ctx, ack, R, y, W - 140, 34);

    // التوقيع
    y = sigY;
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(W - 60, y); ctx.stroke();

    ctx.fillStyle = SOFT; ctx.font = F(19, 500);
    ctx.fillText('المحصّل / المستلم', R, y + 40);
    ctx.fillStyle = INK; ctx.font = F(23, 800);
    ctx.fillText(o.collector || '', R, y + 76);
    ctx.fillStyle = SOFT; ctx.font = F(18, 400);
    ctx.fillText(o.role || '', R, y + 106);
    if (o.phone_collector) ctx.fillText(`جوال: ${o.phone_collector}`, R, y + 134);

    ctx.textAlign = 'left';
    ctx.fillStyle = SOFT; ctx.font = F(19, 500);
    ctx.fillText('توقيع العميل', 60, y + 40);
    ctx.strokeStyle = LINE;
    ctx.beginPath(); ctx.moveTo(60, y + 100); ctx.lineTo(300, y + 100); ctx.stroke();
    ctx.textAlign = 'right';

    // تذييل
    ctx.fillStyle = '#98a087'; ctx.font = F(16, 400);
    ctx.textAlign = 'center';
    ctx.fillText('سند صادر إلكترونيًا من تطبيق تحصيل الديون — نسخة العميل', W / 2, H - 44);
    ctx.textAlign = 'right';

    const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
    return {
      blob,
      url: URL.createObjectURL(blob),
      name: `سند-${o.ref || 'استلام'}.png`
    };
  }

  /** يرسم نصًا ملتفًا ويعيد الإحداثي بعد آخر سطر. مع measure=true يقيس فقط دون رسم. */
  function wrap(ctx, text, x, y, maxWidth, lh, measure) {
    const words = String(text).split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        if (!measure) ctx.fillText(line, x, y);
        line = w; y += lh;
      } else line = test;
    }
    if (line) { if (!measure) ctx.fillText(line, x, y); y += lh; }
    return y;
  }

  /** مشاركة الصورة عبر تطبيقات الجهاز (واتساب…) مع تراجع للتنزيل */
  async function share(file, text) {
    const f = new File([file.blob], file.name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try {
        await navigator.share({ files: [f], text: text || '' });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
      }
    }
    download(file);
    return 'downloaded';
  }

  function download(file) {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return { build, share, download, fmt };
})();
