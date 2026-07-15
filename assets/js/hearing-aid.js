/* مكبّر السمع — تكبير وتوضيح الصوت لحظيًا عبر Web Audio API */

let haAudioContext = null;
let haMicStream = null;
let haSourceNode = null;
let haGainNode = null;
let haClarityFilter = null;
let haLimiterNode = null;
let haAnalyserNode = null;
let haMeterRafId = null;
let haRunning = false;

const HA_MAX_SAFE_GAIN = 30;

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("haToggleBtn");
  if (!toggleBtn) return; // ليست صفحة مكبّر السمع

  const gainSlider = document.getElementById("haGain");
  const gainValueLabel = document.getElementById("haGainValue");
  const clarityCheckbox = document.getElementById("haClarity");
  const noiseCheckbox = document.getElementById("haNoise");

  toggleBtn.addEventListener("click", () => {
    if (haRunning) {
      stopHearingAid();
    } else {
      startHearingAid({
        gain: parseFloat(gainSlider.value),
        clarity: clarityCheckbox.checked,
        noiseSuppression: noiseCheckbox.checked,
      });
    }
  });

  gainSlider.addEventListener("input", () => {
    gainValueLabel.textContent = `×${parseFloat(gainSlider.value).toFixed(1)}`;
    if (haGainNode) haGainNode.gain.value = parseFloat(gainSlider.value);
  });

  clarityCheckbox.addEventListener("change", () => {
    if (haClarityFilter) {
      haClarityFilter.gain.value = clarityCheckbox.checked ? 8 : 0;
    }
  });

  // إيقاف الميكروفون تلقائيًا عند مغادرة الصفحة
  window.addEventListener("beforeunload", stopHearingAid);
});

async function startHearingAid({ gain, clarity, noiseSuppression }) {
  const errorEl = document.getElementById("haError");
  errorEl.textContent = "";

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    errorEl.textContent = "متصفحك لا يدعم الوصول إلى الميكروفون.";
    return;
  }

  try {
    haAudioContext = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: "interactive",
    });

    haMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression,
        // يرفع المتصفح حساسية الميكروفون تلقائيًا للأصوات الخافتة أو البعيدة
        autoGainControl: true,
      },
    });

    haSourceNode = haAudioContext.createMediaStreamSource(haMicStream);

    // تعزيز ترددات الكلام (حوالي 2 كيلوهرتز) لتوضيح صوت الحديث
    haClarityFilter = haAudioContext.createBiquadFilter();
    haClarityFilter.type = "peaking";
    haClarityFilter.frequency.value = 2000;
    haClarityFilter.Q.value = 1;
    haClarityFilter.gain.value = clarity ? 8 : 0;

    haGainNode = haAudioContext.createGain();
    haGainNode.gain.value = Math.min(gain, HA_MAX_SAFE_GAIN);

    // محدد ذروة يمنع فقط الذروات القريبة من التشبّع (لا يكتم التكبير العادي للصوت الخافت/البعيد)
    haLimiterNode = haAudioContext.createDynamicsCompressor();
    haLimiterNode.threshold.value = -8;
    haLimiterNode.knee.value = 8;
    haLimiterNode.ratio.value = 20;
    haLimiterNode.attack.value = 0.001;
    haLimiterNode.release.value = 0.15;

    haAnalyserNode = haAudioContext.createAnalyser();
    haAnalyserNode.fftSize = 256;

    haSourceNode
      .connect(haClarityFilter)
      .connect(haGainNode)
      .connect(haLimiterNode)
      .connect(haAnalyserNode)
      .connect(haAudioContext.destination);

    haRunning = true;
    setHaStatus(true);
    drawHaMeter();
  } catch (err) {
    errorEl.textContent =
      err.name === "NotAllowedError"
        ? "تم رفض إذن الميكروفون. فعّل الإذن من إعدادات المتصفح وأعد المحاولة."
        : "تعذّر تشغيل مكبّر السمع، تأكد من توفر ميكروفون متصل.";
    stopHearingAid();
  }
}

function stopHearingAid() {
  if (haMeterRafId) cancelAnimationFrame(haMeterRafId);
  haMeterRafId = null;

  if (haMicStream) {
    haMicStream.getTracks().forEach((track) => track.stop());
    haMicStream = null;
  }
  if (haAudioContext) {
    haAudioContext.close();
    haAudioContext = null;
  }

  haSourceNode = null;
  haGainNode = null;
  haClarityFilter = null;
  haLimiterNode = null;
  haAnalyserNode = null;
  haRunning = false;

  setHaStatus(false);
  const meterFill = document.getElementById("haMeterFill");
  if (meterFill) meterFill.style.width = "0%";
}

function setHaStatus(active) {
  const dot = document.getElementById("haDot");
  const statusText = document.getElementById("haStatusText");
  const toggleBtn = document.getElementById("haToggleBtn");

  dot.classList.toggle("on", active);
  statusText.textContent = active ? "يعمل الآن — الصوت يُكبَّر لحظيًا" : "غير مُفعّل";
  toggleBtn.textContent = active ? "⏸ إيقاف مكبّر السمع" : "▶ تشغيل مكبّر السمع";
  toggleBtn.classList.toggle("btn-outline", active);
  toggleBtn.classList.toggle("btn-primary", !active);
}

function drawHaMeter() {
  const meterFill = document.getElementById("haMeterFill");
  const data = new Uint8Array(haAnalyserNode.frequencyBinCount);

  const update = () => {
    if (!haAnalyserNode) return;
    haAnalyserNode.getByteFrequencyData(data);
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
    meterFill.style.width = `${Math.min(100, (avg / 255) * 130)}%`;
    haMeterRafId = requestAnimationFrame(update);
  };
  update();
}
