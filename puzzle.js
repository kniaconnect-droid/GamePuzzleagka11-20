/* ==========================================================
   PUZZLE.JS — Logika Puzzle (jigsaw asli, bukan kotak biasa)
   Membuat potongan dengan bentuk tab/lekukan seperti puzzle
   sungguhan, mendukung drag & drop mouse + layar sentuh
   (Pointer Events), snap otomatis, dan efek salah/benar.

   -----------------------------------------------------------
   CATATAN PERBAIKAN TAMPILAN (agar keping tidak menumpuk):
   Papan (board) dan rak keping (tray) sekarang punya sistem
   tata letak TERPISAH:
     - Board  : kotak persegi, keping benar "menempel" di sini
                menggunakan posisi persen (%) relatif ke board.
     - Tray   : strip flexbox biasa (bukan posisi absolut acak),
                sehingga browser otomatis menyusun keping
                berderet rapi & pindah ke baris baru bila perlu
                — TIDAK PERNAH bertumpukan, di ukuran layar apa pun.
   Saat keping mulai diseret, keping dilepas sementara dari alur
   tray (position: fixed mengikuti jari/mouse ke seluruh layar),
   lalu dicek apakah berhenti di atas slot yang benar di board.
   Jika salah, keping dianimasikan kembali rapi ke rak (teknik FLIP).
   ========================================================== */

const PuzzleModule = (() => {
  const BOARD = 600; // ukuran logika papan (persegi)
  const DPR_TARGET = 2; // resolusi kanvas untuk kejelasan gambar

  let current = null; // state puzzle aktif
  let generation = 0; // token untuk menghindari race condition saat ganti puzzle cepat

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  /* Bangun pola tab/lekukan acak namun konsisten antar keping bertetangga */
  function buildEdgePattern(rows, cols) {
    const H = []; // horizontal seams, between row r/r+1
    for (let r = 0; r < rows - 1; r++) {
      H.push(Array.from({ length: cols }, () => (Math.random() < 0.5 ? 1 : -1)));
    }
    const V = []; // vertical seams, between col c/c+1
    for (let r = 0; r < rows; r++) {
      V.push(Array.from({ length: cols - 1 }, () => (Math.random() < 0.5 ? 1 : -1)));
    }
    return { H, V };
  }

  function edgeSign(edges, rows, cols, r, c, side) {
    // side: 'top' | 'bottom' | 'left' | 'right'
    if (side === "top") return r === 0 ? 0 : -edges.H[r - 1][c];
    if (side === "bottom") return r === rows - 1 ? 0 : edges.H[r][c];
    if (side === "left") return c === 0 ? 0 : -edges.V[r][c - 1];
    if (side === "right") return c === cols - 1 ? 0 : edges.V[r][c];
    return 0;
  }

  /* Menggambar satu sisi keping (lurus jika sign 0, tab/lekukan jika ±1) */
  function drawSide(ctx, x1, y1, x2, y2, nx, ny, sign, tabSize) {
    if (sign === 0) {
      ctx.lineTo(x2, y2);
      return;
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const p1 = { x: x1 + dx * 0.32, y: y1 + dy * 0.32 };
    const mid = {
      x: x1 + dx * 0.5 + nx * tabSize * sign,
      y: y1 + dy * 0.5 + ny * tabSize * sign,
    };
    const p2 = { x: x1 + dx * 0.68, y: y1 + dy * 0.68 };

    ctx.lineTo(p1.x, p1.y);
    ctx.bezierCurveTo(
      p1.x + nx * tabSize * 1.35 * sign,
      p1.y + ny * tabSize * 1.35 * sign,
      mid.x - dx * 0.18,
      mid.y - dy * 0.18,
      mid.x,
      mid.y
    );
    ctx.bezierCurveTo(
      mid.x + dx * 0.18,
      mid.y + dy * 0.18,
      p2.x + nx * tabSize * 1.35 * sign,
      p2.y + ny * tabSize * 1.35 * sign,
      p2.x,
      p2.y
    );
    ctx.lineTo(x2, y2);
  }

  function tracePiecePath(ctx, pw, ph, margin, edges, rows, cols, r, c) {
    const tabSize = Math.min(pw, ph) * 0.24;
    const x0 = margin,
      y0 = margin,
      x1 = margin + pw,
      y1 = margin + ph;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    // top (kiri -> kanan), normal keluar = atas (0,-1)
    drawSide(ctx, x0, y0, x1, y0, 0, -1, edgeSign(edges, rows, cols, r, c, "top"), tabSize);
    // right (atas -> bawah), normal keluar = kanan (1,0)
    drawSide(ctx, x1, y0, x1, y1, 1, 0, edgeSign(edges, rows, cols, r, c, "right"), tabSize);
    // bottom (kanan -> kiri), normal keluar = bawah (0,1)
    drawSide(ctx, x1, y1, x0, y1, 0, 1, edgeSign(edges, rows, cols, r, c, "bottom"), tabSize);
    // left (bawah -> atas), normal keluar = kiri (-1,0)
    drawSide(ctx, x0, y1, x0, y0, -1, 0, edgeSign(edges, rows, cols, r, c, "left"), tabSize);
    ctx.closePath();
  }

  function pieceDims(rows, cols) {
    const pw = BOARD / cols;
    const ph = BOARD / rows;
    const margin = Math.min(pw, ph) * 0.34;
    return { pw, ph, margin, canvasW: pw + margin * 2, canvasH: ph + margin * 2 };
  }

  function buildPieceCanvas(img, dims, rows, cols, r, c, edges) {
    const { pw, ph, margin, canvasW, canvasH } = dims;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW * DPR_TARGET;
    canvas.height = canvasH * DPR_TARGET;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const ctx = canvas.getContext("2d");
    ctx.scale(DPR_TARGET, DPR_TARGET);

    tracePiecePath(ctx, pw, ph, margin, edges, rows, cols, r, c);
    ctx.save();
    ctx.clip();

    // gambar seluruh sumber gambar, diposisikan agar potongan tetangga
    // ikut "mengintip" ke area tab secara alami
    const sx = c * pw - margin;
    const sy = r * ph - margin;
    ctx.drawImage(img, -sx, -sy, BOARD, BOARD);
    ctx.restore();

    // garis tepi lembut supaya potongan terlihat jelas
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(46,125,50,0.35)";
    ctx.stroke();

    return canvas;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Inisialisasi papan puzzle baru.
   * @param {HTMLElement} boardEl - elemen wrapper (position:relative)
   * @param {{image:string, grid:[number,number]}} puzzleData
   * @param {{onPieceCorrect:Function, onComplete:Function}} callbacks
   */
  function init(boardEl, puzzleData, callbacks) {
    cleanup();
    const myGeneration = ++generation;
    boardEl.innerHTML = "";

    // ---- Struktur baru: board (persegi) + tray (strip flexbox) ----
    const root = document.createElement("div");
    root.className = "puzzle-root";

    const boardArea = document.createElement("div");
    boardArea.className = "puzzle-board-area";

    const frame = document.createElement("div");
    frame.className = "puzzle-frame";
    boardArea.appendChild(frame);

    const trayWrap = document.createElement("div");
    trayWrap.className = "puzzle-tray";
    const trayTrack = document.createElement("div");
    trayTrack.className = "puzzle-tray-track";
    trayWrap.appendChild(trayTrack);

    root.appendChild(boardArea);
    root.appendChild(trayWrap);
    boardEl.appendChild(root);

    current = { pieces: [], dragLayerNodes: [] };

    const img = new Image();
    img.onload = () => {
      if (myGeneration !== generation) return; // puzzle sudah diganti sebelum gambar selesai dimuat
      const [rows, cols] = puzzleData.grid;
      const edges = buildEdgePattern(rows, cols);
      const total = rows * cols;
      const dims = pieceDims(rows, cols);
      let lockedCount = 0;

      const pieceOrder = shuffle(
        Array.from({ length: total }, (_, i) => ({ r: Math.floor(i / cols), c: i % cols }))
      );

      pieceOrder.forEach((pos) => {
        const { r, c } = pos;
        const canvas = buildPieceCanvas(img, dims, rows, cols, r, c, edges);

        const wrap = document.createElement("div");
        wrap.className = "puzzle-piece";
        wrap.dataset.puzzleDrag = "1";
        // rasio bentuk keping dipertahankan, tinggi tampilan diatur lewat CSS
        // (clamp responsif) supaya nyaman dipegang di HP maupun tablet
        wrap.style.aspectRatio = `${dims.canvasW} / ${dims.canvasH}`;
        wrap.appendChild(canvas);
        trayTrack.appendChild(wrap);

        // posisi target (benar) dalam koordinat logika board
        const targetX = c * dims.pw - dims.margin;
        const targetY = r * dims.ph - dims.margin;

        const pieceState = {
          wrap,
          targetX,
          targetY,
          canvasW: dims.canvasW,
          canvasH: dims.canvasH,
          locked: false,
        };
        current.pieces.push(pieceState);

        attachDrag(wrap, pieceState, {
          trayTrack,
          frame,
          boardArea,
          onSettled: (isCorrect) => {
            if (isCorrect) {
              pieceState.locked = true;
              lockedCount++;
              if (callbacks.onPieceCorrect) callbacks.onPieceCorrect(lockedCount, total);
              if (lockedCount === total && callbacks.onComplete) {
                setTimeout(() => callbacks.onComplete(), 500);
              }
            }
          },
        });
      });
    };
    img.src = puzzleData.image;
  }

  /* Pasang interaksi drag (pointer events) pada satu keping.
     Saat diseret, keping "lepas" dari alur tray dan mengikuti jari/mouse
     lewat position:fixed di lapisan paling atas (document.body), lalu
     dicek apakah posisinya cukup dekat dengan slot yang benar di board. */
  function attachDrag(wrap, pieceState, ctx) {
    const { trayTrack, frame, boardArea, onSettled } = ctx;
    let dragging = false;
    let pointerId = null;
    let offsetX = 0;
    let offsetY = 0;
    let nextSibling = null;

    wrap.addEventListener("pointerdown", (e) => {
      if (pieceState.locked || dragging) return;
      dragging = true;
      pointerId = e.pointerId;

      const rect = wrap.getBoundingClientRect();
      nextSibling = wrap.nextSibling;

      wrap.style.transition = "none";
      wrap.style.position = "fixed";
      wrap.style.left = rect.left + "px";
      wrap.style.top = rect.top + "px";
      wrap.style.width = rect.width + "px";
      wrap.style.height = rect.height + "px";
      wrap.style.margin = "0";
      wrap.style.zIndex = "1000";
      wrap.classList.add("dragging");
      document.body.appendChild(wrap);

      try {
        wrap.setPointerCapture(pointerId);
      } catch (err) {
        /* abaikan jika tidak didukung */
      }

      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    });

    wrap.addEventListener("pointermove", (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      wrap.style.left = e.clientX - offsetX + "px";
      wrap.style.top = e.clientY - offsetY + "px";
    });

    function endDrag(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      wrap.classList.remove("dragging");
      resolveDrop();
    }

    wrap.addEventListener("pointerup", endDrag);
    wrap.addEventListener("pointercancel", endDrag);

    function resolveDrop() {
      const fixedRect = wrap.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();

      const slotLeft = frameRect.left + (pieceState.targetX / BOARD) * frameRect.width;
      const slotTop = frameRect.top + (pieceState.targetY / BOARD) * frameRect.height;
      const slotW = (pieceState.canvasW / BOARD) * frameRect.width;
      const slotH = (pieceState.canvasH / BOARD) * frameRect.height;

      const pieceCx = fixedRect.left + fixedRect.width / 2;
      const pieceCy = fixedRect.top + fixedRect.height / 2;
      const slotCx = slotLeft + slotW / 2;
      const slotCy = slotTop + slotH / 2;

      const tolerance = Math.min(slotW, slotH) * 0.34;
      const isCorrect =
        Math.abs(pieceCx - slotCx) < tolerance && Math.abs(pieceCy - slotCy) < tolerance;

      if (isCorrect) {
        snapToBoard(slotLeft, slotTop, slotW, slotH);
      } else {
        returnToTray();
      }
    }

    function snapToBoard(slotLeft, slotTop, slotW, slotH) {
      wrap.style.transition =
        "left .28s cubic-bezier(.2,.8,.3,1), top .28s cubic-bezier(.2,.8,.3,1), width .28s ease, height .28s ease";
      wrap.style.left = slotLeft + "px";
      wrap.style.top = slotTop + "px";
      wrap.style.width = slotW + "px";
      wrap.style.height = slotH + "px";

      const onEnd = () => {
        wrap.removeEventListener("transitionend", onEnd);
        wrap.style.transition = "none";
        wrap.style.margin = "0";
        wrap.style.position = "absolute";
        wrap.style.left = (pieceState.targetX / BOARD) * 100 + "%";
        wrap.style.top = (pieceState.targetY / BOARD) * 100 + "%";
        wrap.style.width = (pieceState.canvasW / BOARD) * 100 + "%";
        wrap.style.height = (pieceState.canvasH / BOARD) * 100 + "%";
        wrap.style.zIndex = "5";
        wrap.style.pointerEvents = "none";
        wrap.classList.add("locked");
        boardArea.appendChild(wrap);
        onSettled(true);
      };
      wrap.addEventListener("transitionend", onEnd, { once: true });
    }

    function returnToTray() {
      // Teknik FLIP: catat posisi lama (First), pindahkan ke alur tray
      // (Last), lalu animasikan selisihnya (Invert -> Play) supaya
      // keping meluncur mulus kembali ke rak tanpa "lompat".
      const first = wrap.getBoundingClientRect();

      wrap.style.transition = "none";
      wrap.style.position = "";
      wrap.style.left = "";
      wrap.style.top = "";
      wrap.style.width = "";
      wrap.style.height = "";
      wrap.style.margin = "";
      wrap.style.zIndex = "";

      if (nextSibling && nextSibling.parentNode === trayTrack) {
        trayTrack.insertBefore(wrap, nextSibling);
      } else {
        trayTrack.appendChild(wrap);
      }

      const last = wrap.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;

      wrap.style.transform = `translate(${dx}px, ${dy}px)`;
      // paksa reflow supaya transisi berikutnya benar-benar dianimasikan
      // eslint-disable-next-line no-unused-expressions
      wrap.offsetWidth;
      wrap.style.transition = "transform .32s cubic-bezier(.2,.8,.3,1)";
      wrap.style.transform = "translate(0, 0)";

      const onEnd = () => {
        wrap.removeEventListener("transitionend", onEnd);
        wrap.style.transition = "none";
        wrap.style.transform = "";
        wrap.classList.add("shake");
        setTimeout(() => wrap.classList.remove("shake"), 420);
      };
      wrap.addEventListener("transitionend", onEnd, { once: true });

      onSettled(false);
    }
  }

  function cleanup() {
    // buang keping yang mungkin masih menempel di document.body
    // (misalnya jika berpindah puzzle di tengah proses drag)
    document.querySelectorAll('[data-puzzle-drag="1"]').forEach((el) => {
      if (el.parentNode === document.body) el.remove();
    });
    current = null;
  }

  return { init, cleanup };
})();
