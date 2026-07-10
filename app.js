/* ==========================================================
   APP.JS — Logika UI & alur halaman
   (Splash -> Tutorial -> Gameplay -> Selesai)
   ========================================================== */

(() => {
  const pages = {
    splash: document.getElementById("page-splash"),
    tutorial: document.getElementById("page-tutorial"),
    gameplay: document.getElementById("page-gameplay"),
    done: document.getElementById("page-done"),
  };

  let currentIndex = 0; // index puzzle berjalan (0-9)
  let score = 0;

  function showPage(name) {
    Object.values(pages).forEach((p) => p.classList.add("hidden"));
    pages[name].classList.remove("hidden");
  }

  /* ---------- Tombol Audio (global, dipasang di setiap halaman) ---------- */
  function syncAudioButtons() {
    const on = AudioModule.isSfxOn();
    document.querySelectorAll("[data-audio-toggle]").forEach((btn) => {
      btn.textContent = on ? "🔊" : "🔇";
      btn.setAttribute("aria-label", on ? "Audio Menyala" : "Audio Mati");
    });
  }

  document.querySelectorAll("[data-audio-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      AudioModule.toggle();
      syncAudioButtons();
    });
  });

  document.querySelectorAll("[data-repeat]").forEach((btn) => {
    btn.addEventListener("click", () => SpeechModule.repeatLast());
  });

  syncAudioButtons();

  /* ---------- Halaman 1: Splash ---------- */
  document.getElementById("btn-start").addEventListener("click", () => {
    SpeechModule.stop();
    showPage("tutorial");
    SpeechModule.speak(VOICE_LINES.tutorial);
  });

  /* Ucapkan sapaan splash sekali interaksi pertama terjadi (autoplay policy) */
  let splashSpoken = false;
  function speakSplashOnce() {
    if (splashSpoken) return;
    splashSpoken = true;
    SpeechModule.speak(VOICE_LINES.splash);
  }
  document.body.addEventListener(
    "pointerdown",
    () => {
      if (!pages.splash.classList.contains("hidden")) speakSplashOnce();
    },
    { once: true }
  );

  /* ---------- Halaman 2: Tutorial ---------- */
  document.getElementById("btn-tutorial-mulai").addEventListener("click", () => {
    startGame();
  });

  /* ---------- Halaman 3: Gameplay ---------- */
  const boardEl = document.getElementById("puzzle-board");
  const progressEl = document.getElementById("hud-progress");
  const starsEl = document.getElementById("hud-stars");
  const referenceImgEl = document.getElementById("reference-image");

  document.getElementById("btn-restart").addEventListener("click", () => {
    loadPuzzle(currentIndex);
  });
  document.getElementById("btn-home").addEventListener("click", () => {
    SpeechModule.stop();
    currentIndex = 0;
    score = 0;
    showPage("splash");
  });

  function startGame() {
    currentIndex = 0;
    score = 0;
    showPage("gameplay");
    loadPuzzle(0);
  }

  function updateHud() {
    progressEl.textContent = `${currentIndex + 1} / ${PUZZLES.length}`;
    starsEl.textContent = `${score}`;
  }

  function loadPuzzle(index) {
    const data = PUZZLES[index];
    updateHud();
    referenceImgEl.src = data.image;
    referenceImgEl.alt = `Contoh gambar angka ${data.number}`;
    PuzzleModule.init(boardEl, data, {
      onPieceCorrect: (locked, total) => {
        AudioModule.play("ding");
        if (locked < total) {
          const line = PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)];
          SpeechModule.speak(line);
        }
      },
      onComplete: () => {
        AudioModule.play("success");
        score += 1;
        updateHud();

        // Pastikan hanya berpindah SATU kali, baik lewat callback suara
        // selesai maupun lewat fallback waktu (jaga-jaga jika speechSynthesis
        // tidak tersedia / tidak mengeluarkan suara di perangkat tertentu).
        let moved = false;
        const advanceOnce = () => {
          if (moved) return;
          moved = true;
          nextPuzzle();
        };
        SpeechModule.speak(VOICE_LINES.puzzleDone, { onend: advanceOnce });
        setTimeout(advanceOnce, 2600);
      },
    });
    SpeechModule.speak(data.voice);
  }

  function nextPuzzle() {
    if (currentIndex + 1 < PUZZLES.length) {
      currentIndex += 1;
      loadPuzzle(currentIndex);
    } else {
      finishGame();
    }
  }

  /* ---------- Halaman 4: Selesai ---------- */
  function finishGame() {
    showPage("done");
    document.getElementById("done-count").textContent = `${score} / ${PUZZLES.length}`;
    launchConfetti();
    AudioModule.play("pop");
    SpeechModule.speak(VOICE_LINES.gameDone);
  }

  document.getElementById("btn-main-lagi").addEventListener("click", () => {
    startGame();
  });

  function launchConfetti() {
    const layer = document.getElementById("confetti-layer");
    layer.innerHTML = "";
    const colors = ["#4caf50", "#ffd54f", "#ff9f43", "#ffffff", "#66bb6a"];
    const count = 40;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "confetto";
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = colors[i % colors.length];
      el.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
      el.style.animationDelay = `${Math.random() * 0.6}s`;
      el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      layer.appendChild(el);
    }
    setTimeout(() => (layer.innerHTML = ""), 4200);
  }

  /* ---------- Sticker angka dekoratif: posisi & rotasi diacak ---------- */
  function scatterNumberStickers() {
    const stickers = Array.from(document.querySelectorAll(".num-sticker"));
    if (!stickers.length) return;
    const srcs = stickers.map((el) => el.getAttribute("src"));
    // acak urutan gambar di antara 4 posisi sticker
    for (let i = srcs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [srcs[i], srcs[j]] = [srcs[j], srcs[i]];
    }
    stickers.forEach((el, i) => {
      el.setAttribute("src", srcs[i]);
      const rot = (Math.random() * 26 - 13).toFixed(1); // -13..13 deg
      el.style.setProperty("--rot", `${rot}deg`);
    });
  }
  scatterNumberStickers();

  /* ---------- Mulai di halaman splash ---------- */
  showPage("splash");
})();
