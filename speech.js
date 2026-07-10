/* ==========================================================
   SPEECH.JS — Narasi otomatis (Web Speech API / SpeechSynthesis)
   Tidak memakai layanan cloud, tidak memakai Google TTS,
   tidak memakai library pihak ketiga.
   ========================================================== */

const SpeechModule = (() => {
  let indonesianVoice = null;
  let voicesLoaded = false;
  let lastText = "";

  function pickIndonesianVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Prioritaskan voice dengan lang id-ID, lalu yang namanya mengandung "Indonesia"
    indonesianVoice =
      voices.find((v) => v.lang && v.lang.toLowerCase() === "id-id") ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("id")) ||
      voices.find((v) => /indonesia/i.test(v.name)) ||
      null;

    voicesLoaded = true;
  }

  if ("speechSynthesis" in window) {
    pickIndonesianVoice();
    window.speechSynthesis.onvoiceschanged = pickIndonesianVoice;
  }

  /**
   * Membacakan teks menggunakan voice Indonesia jika tersedia,
   * fallback ke voice default browser.
   * @param {string} text
   * @param {{onend?: Function}} [opts]
   */
  function speak(text, opts = {}) {
    if (!("speechSynthesis" in window)) {
      if (opts.onend) opts.onend();
      return;
    }
    if (typeof AudioModule !== "undefined" && !AudioModule.isNarrationOn()) {
      if (opts.onend) opts.onend();
      return;
    }

    window.speechSynthesis.cancel();

    lastText = text;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "id-ID";
    utter.rate = 0.95;
    utter.pitch = 1.1;
    if (indonesianVoice) utter.voice = indonesianVoice;
    if (opts.onend) utter.onend = opts.onend;
    window.speechSynthesis.speak(utter);
  }

  function repeatLast() {
    if (lastText) speak(lastText);
  }

  function stop() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  return { speak, repeatLast, stop };
})();
