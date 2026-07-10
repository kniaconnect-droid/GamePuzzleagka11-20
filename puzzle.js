/* ==========================================================
   PUZZLE.JS — Logika Puzzle (jigsaw asli, bukan kotak biasa)
   Membuat potongan dengan bentuk tab/lekukan seperti puzzle
   sungguhan, mendukung drag & drop mouse + layar sentuh
   (Pointer Events), snap otomatis, dan efek salah/benar.
   ========================================================== */

const PuzzleModule = (() => {
  const BOARD = 600; // ukuran logika papan (persegi)
  const TRAY_H = 210; // tinggi area keping di bawah papan
  const CONTAINER_W = BOARD;
  const CONTAINER_H = BOARD + TRAY_H;
  const SNAP_TOLERANCE = 42; // toleransi jarak snap (unit logika)
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

  function buildPieceCanvas(img, rows, cols, r, c, edges) {
    const pw = BOARD / cols;
    const ph = BOARD / rows;
    const margin = Math.min(pw, ph) * 0.34;
    const canvasW = pw + margin * 2;
    const canvasH = ph + margin * 2;

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

    return { canvas, pw, ph, margin, canvasW, canvasH };
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
    boardEl.style.aspectRatio = `${CONTAINER_W} / ${CONTAINER_H}`;

    const frame = document.createElement("div");
    frame.className = "puzzle-frame";
    frame.style.width = "100%";
    frame.style.height = `${(BOARD / CONTAINER_H) * 100}%`;
    boardEl.appendChild(frame);

    const img = new Image();
    img.onload = () => {
      if (myGeneration !== generation) return; // puzzle sudah diganti sebelum gambar selesai dimuat
      const [rows, cols] = puzzleData.grid;
      const edges = buildEdgePattern(rows, cols);
      const total = rows * cols;
      let lockedCount = 0;

      const pieceOrder = shuffle(
        Array.from({ length: total }, (_, i) => ({ r: Math.floor(i / cols), c: i % cols }))
      );

      const trayCols = Math.min(total, 3);
      const trayRows = Math.ceil(total / trayCols);

      current = { pieces: [] };

      pieceOrder.forEach((pos, idx) => {
        const { r, c } = pos;
        const built = buildPieceCanvas(img, rows, cols, r, c, edges);
        const wrap = document.createElement("div");
        wrap.className = "puzzle-piece";
        wrap.style.width = `${(built.canvasW / CONTAINER_W) * 100}%`;
        wrap.style.height = `${(built.canvasH / CONTAINER_H) * 100}%`;
        wrap.appendChild(built.canvas);
        boardEl.appendChild(wrap);

        // posisi target (benar) dalam koordinat logika
        const targetX = c * built.pw - built.margin;
        const targetY = r * built.ph - built.margin;

        // posisi awal acak di area tray (bawah papan)
        const trayR = Math.floor(idx / trayCols);
        const trayC = idx % trayCols;
        const cellW = CONTAINER_W / trayCols;
        const cellH = TRAY_H / trayRows;
        const jitterX = rand(-cellW * 0.12, cellW * 0.12);
        const jitterY = rand(-cellH * 0.12, cellH * 0.12);
        const startX = trayC * cellW + (cellW - built.canvasW) / 2 + jitterX;
        const startY = BOARD + trayR * cellH + (cellH - built.canvasH) / 2 + jitterY;

        setPos(wrap, startX, startY);

        const pieceState = {
          wrap,
          targetX,
          targetY,
          locked: false,
        };
        current.pieces.push(pieceState);

        attachDrag(wrap, pieceState, boardEl, () => {
          if (pieceState.locked) return;
          const dx = Math.abs(getPos(wrap).x - pieceState.targetX);
          const dy = Math.abs(getPos(wrap).y - pieceState.targetY);
          if (dx < SNAP_TOLERANCE && dy < SNAP_TOLERANCE) {
            // BENAR
            pieceState.locked = true;
            lockedCount++;
            wrap.classList.add("locked");
            wrap.style.pointerEvents = "none";
            setPos(wrap, pieceState.targetX, pieceState.targetY, true);
            wrap.style.zIndex = 5;
            if (callbacks.onPieceCorrect) callbacks.onPieceCorrect(lockedCount, total);
            if (lockedCount === total && callbacks.onComplete) {
              setTimeout(() => callbacks.onComplete(), 500);
            }
          } else {
            // SALAH -> kembali perlahan + goyang kecil
            wrap.classList.add("shake");
            setPos(wrap, startX, startY, true);
            setTimeout(() => wrap.classList.remove("shake"), 420);
          }
        });
      });
    };
    img.src = puzzleData.image;
  }

  function setPos(el, x, y, animate) {
    el.dataset.x = x;
    el.dataset.y = y;
    el.style.transition = animate ? "left .35s ease, top .35s ease" : "none";
    el.style.left = `${(x / CONTAINER_W) * 100}%`;
    el.style.top = `${(y / CONTAINER_H) * 100}%`;
  }

  function getPos(el) {
    return { x: parseFloat(el.dataset.x), y: parseFloat(el.dataset.y) };
  }

  function attachDrag(wrap, pieceState, boardEl, onDrop) {
    let dragging = false;
    let startPointer = { x: 0, y: 0 };
    let startPos = { x: 0, y: 0 };

    wrap.addEventListener("pointerdown", (e) => {
      if (pieceState.locked) return;
      dragging = true;
      wrap.classList.add("dragging");
      wrap.style.zIndex = 10;
      wrap.setPointerCapture(e.pointerId);
      startPointer = { x: e.clientX, y: e.clientY };
      startPos = getPos(wrap);
      wrap.style.transition = "none";
    });

    wrap.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const rect = boardEl.getBoundingClientRect();
      const scaleX = CONTAINER_W / rect.width;
      const scaleY = CONTAINER_H / rect.height;
      const dx = (e.clientX - startPointer.x) * scaleX;
      const dy = (e.clientY - startPointer.y) * scaleY;
      setPos(wrap, startPos.x + dx, startPos.y + dy, false);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      wrap.classList.remove("dragging");
      onDrop();
    }

    wrap.addEventListener("pointerup", endDrag);
    wrap.addEventListener("pointercancel", endDrag);
  }

  function cleanup() {
    current = null;
  }

  return { init, cleanup };
})();
