/* ==========================================================
   AUDIO.JS — Efek suara + status Audio ON/OFF (localStorage)
   ========================================================== */

const AudioModule = (() => {
  const STORAGE_KEY = "pac_audio_on"; // pac = Puzzle Angka Ceria
  let audioOn = localStorage.getItem(STORAGE_KEY) !== "off";

  const sfx = {
    ding: new Audio("assets/sounds/ding.wav"),
    success: new Audio("assets/sounds/success.wav"),
    pop: new Audio("assets/sounds/pop.wav"),
  };
  Object.values(sfx).forEach((a) => (a.volume = 0.7));

  function isNarrationOn() {
    return audioOn;
  }

  function isSfxOn() {
    return audioOn;
  }

  function setAudioOn(value) {
    audioOn = value;
    localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
    if (!value && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function toggle() {
    setAudioOn(!audioOn);
    return audioOn;
  }

  function play(name) {
    if (!audioOn) return;
    const base = sfx[name];
    if (!base) return;
    // clone supaya bisa overlap jika dipanggil cepat berturut-turut
    const node = base.cloneNode();
    node.volume = base.volume;
    node.play().catch(() => {
      /* diabaikan: browser mungkin memblokir autoplay sebelum interaksi pertama */
    });
  }

  return { isNarrationOn, isSfxOn, setAudioOn, toggle, play };
})();
