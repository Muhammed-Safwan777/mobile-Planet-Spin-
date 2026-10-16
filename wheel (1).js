/* =====================================================================
   wheel.js — shared spin-wheel engine (vanilla JS + Canvas 2D)
   Used by planet-wheel.html and golden-wheel.html.

   - Draws the wheel, product icons and labels on a <canvas>
   - Spins with a random landing angle and ease-out deceleration
   - Reads the winning segment from the final angle (nothing predetermined)
   - Shows a result modal and fires confetti for winning prizes
   ===================================================================== */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var confettiRaf = 0;

  function $(id) { return document.getElementById(id); }

  /* rounded-rectangle sub-path (works in every browser) */
  function rr(c, x, y, w, h, r) {
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* -------------------------------------------------------------------
     Generic, unbranded product icons.
     Each one is drawn inside a 100 x 100 box centred on (0,0).
     The caller sets fillStyle / strokeStyle (flat colour or gold gradient).
     ------------------------------------------------------------------- */
  var ICONS = {
    neckband: function (c) {
      c.lineWidth = 9;
      c.beginPath(); c.arc(0, -6, 34, 0, Math.PI); c.stroke();           // band
      c.beginPath();
      c.moveTo(-34, -6); c.lineTo(-34, -26);
      c.moveTo(34, -6);  c.lineTo(34, -26);
      c.stroke();                                                         // wires
      c.beginPath(); c.arc(-34, -34, 9, 0, TAU); c.fill();                // earbuds
      c.beginPath(); c.arc(34, -34, 9, 0, TAU); c.fill();
      c.beginPath(); rr(c, -10, 21, 20, 15, 5); c.fill();                 // control pod
    },

    airpod: function (c) {
      c.translate(6, -2);
      c.beginPath();
      c.arc(-1, -16, 22, 0, TAU);                                         // head
      c.moveTo(-6, -14); c.arc(-11, -14, 5, 0, TAU);                      // sensor cut-out
      c.fill('evenodd');
      c.beginPath(); rr(c, 9, -16, 14, 58, 7); c.fill();                  // stem
    },

    petrol: function (c) {
      c.beginPath();
      rr(c, -32, -42, 42, 84, 8);                                         // pump body
      rr(c, -24, -34, 26, 26, 4);                                         // display cut-out
      c.fill('evenodd');
      c.beginPath(); rr(c, -38, 38, 54, 8, 3); c.fill();                  // base
      c.lineWidth = 7;
      c.beginPath(); c.moveTo(10, -22); c.lineTo(24, -22); c.lineTo(24, 14); c.stroke(); // hose
      c.beginPath(); rr(c, 17, 12, 14, 20, 4); c.fill();                  // nozzle
    },

    case: function (c) {                                                  // phone case + tempered glass
      c.lineWidth = 7;
      c.beginPath(); rr(c, -26, -44, 52, 88, 12); c.stroke();             // case
      c.beginPath();
      rr(c, -17, -35, 34, 70, 6);                                         // glass-covered screen
      c.moveTo(0, -19);                                                   // sparkle cut-out
      c.quadraticCurveTo(1.5, -7.5, 13, -6);
      c.quadraticCurveTo(1.5, -4.5, 0, 7);
      c.quadraticCurveTo(-1.5, -4.5, -13, -6);
      c.quadraticCurveTo(-1.5, -7.5, 0, -19);
      c.closePath();
      c.fill('evenodd');
    },

    speaker: function (c) {
      c.translate(0, 4);
      c.beginPath();
      rr(c, -44, -24, 88, 48, 18);                                        // body
      c.moveTo(-4, 0);  c.arc(-16, 0, 12, 0, TAU);                        // grille holes
      c.moveTo(28, 0);  c.arc(16, 0, 12, 0, TAU);
      c.fill('evenodd');
      c.beginPath();
      c.moveTo(-12, 0); c.arc(-16, 0, 4, 0, TAU);                         // cone centres
      c.moveTo(20, 0);  c.arc(16, 0, 4, 0, TAU);
      c.fill();
      c.lineWidth = 5;
      c.beginPath(); c.arc(0, -24, 12, Math.PI, TAU); c.stroke();         // carry loop
    },

    watch: function (c) {
      c.beginPath(); rr(c, -17, -46, 34, 20, 5); c.fill();                // straps
      c.beginPath(); rr(c, -17, 26, 34, 20, 5); c.fill();
      c.lineWidth = 7;
      c.beginPath(); rr(c, -26, -28, 52, 56, 14); c.stroke();             // case
      c.beginPath(); rr(c, 26, -6, 6, 12, 3); c.fill();                   // crown
      c.save(); c.globalAlpha = 0.22;
      c.beginPath(); rr(c, -21, -23, 42, 46, 10); c.fill();               // screen tint
      c.restore();
      c.lineWidth = 4.5;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -13); c.moveTo(0, 0); c.lineTo(10, 6); c.stroke();
      c.beginPath(); c.arc(0, 0, 3, 0, TAU); c.fill();
    },

    powerbank: function (c) {
      c.beginPath();
      rr(c, -28, -44, 56, 88, 12);                                        // body
      c.moveTo(6, -30); c.lineTo(-14, 6); c.lineTo(-2, 6);                // lightning cut-out
      c.lineTo(-6, 30); c.lineTo(14, -8); c.lineTo(2, -8); c.closePath();
      c.fill('evenodd');
      c.beginPath(); rr(c, -10, -52, 20, 8, 3); c.fill();                 // port
    },

    sad: function (c) {
      c.lineWidth = 7;
      c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.stroke();
      c.beginPath(); c.arc(-14, -9, 5, 0, TAU); c.fill();
      c.beginPath(); c.arc(14, -9, 5, 0, TAU); c.fill();
      c.lineWidth = 6;
      c.beginPath(); c.arc(0, 26, 16, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke();
    }
  };

  function drawIcon(c, name, style, glow, blur) {
    c.save();
    c.fillStyle = style;
    c.strokeStyle = style;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (glow) { c.shadowColor = glow; c.shadowBlur = blur || 8; }
    ICONS[name](c);
    c.restore();
  }

  /* word-wrap helper for wheel labels */
  function wrap(c, text, maxW) {
    var words = text.split(' '), lines = [], line = '';
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (line && c.measureText(test).width > maxW) { lines.push(line); line = w; }
      else { line = test; }
    });
    if (line) lines.push(line);
    return lines;
  }

  /* -------------------------------------------------------------------
     Confetti — full-screen canvas (#confetti)
     ------------------------------------------------------------------- */
  function confetti(colors) {
    var cv = $('confetti');
    if (!cv) return;
    cancelAnimationFrame(confettiRaf);

    var c = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    var parts = [], t0 = performance.now(), RAIN_MS = 3200;

    function make(x, y, vx, vy) {
      return {
        x: x, y: y, vx: vx, vy: vy,
        w: 6 + Math.random() * 8, h: 9 + Math.random() * 10,
        rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.3,
        tilt: Math.random() * TAU, vt: 0.05 + Math.random() * 0.12,
        sway: Math.random() * TAU,
        drag: 0.985 + Math.random() * 0.01,
        round: Math.random() < 0.25,
        col: colors[(Math.random() * colors.length) | 0]
      };
    }

    // cannon bursts from both bottom corners
    var i;
    for (i = 0; i < 90; i++) {
      parts.push(make(0, H * 0.7, 4 + Math.random() * 9, -(9 + Math.random() * 12)));
      parts.push(make(W, H * 0.7, -(4 + Math.random() * 9), -(9 + Math.random() * 12)));
    }

    function frame(now) {
      c.clearRect(0, 0, W, H);
      var elapsed = now - t0;
      if (elapsed < RAIN_MS) {                       // steady rain from the top
        for (var k = 0; k < 6; k++) {
          parts.push(make(Math.random() * W, -20, (Math.random() - 0.5) * 2, 2 + Math.random() * 3));
        }
      }
      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j];
        p.vy = Math.min(p.vy + 0.18, 5.5);
        p.vx *= p.drag;
        p.sway += 0.05;
        p.x += p.vx + Math.sin(p.sway) * 0.8;
        p.y += p.vy;
        p.rot += p.vr;
        p.tilt += p.vt;
        if (p.y > H + 30) { parts.splice(j, 1); continue; }
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.scale(1, Math.cos(p.tilt));
        c.fillStyle = p.col;
        if (p.round) { c.beginPath(); c.arc(0, 0, p.w / 2, 0, TAU); c.fill(); }
        else { c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
        c.restore();
      }
      if (parts.length || elapsed < RAIN_MS) confettiRaf = requestAnimationFrame(frame);
      else c.clearRect(0, 0, W, H);
    }
    confettiRaf = requestAnimationFrame(frame);
  }

  /* -------------------------------------------------------------------
     Wheel
     ------------------------------------------------------------------- */
  function init(cfg) {
    var segs = cfg.segments, theme = cfg.theme;
    var N = segs.length, A = TAU / N;                    // A = angle of one segment

    var canvas = $('wheel'), ctx = canvas.getContext('2d');
    var spinBtn = $('spinBtn'), pointer = $('pointer');
    var modal = $('modal'), mTitle = $('modalTitle'), mPrize = $('modalPrize'),
        mMsg = $('modalMsg'), mClose = $('modalClose'), mIcon = $('prizeIcon');

    var size = 0, dpr = 1;
    var rotation = -A / 2;        // start with the pointer in the middle of segment 0
    var spinning = false, rafId = 0, tickAnim = null;

    function styleFor(c) {
      return typeof theme.iconStyle === 'function' ? theme.iconStyle(c) : theme.iconStyle;
    }

    /* Which segment is under the pointer (pointer is at the top, 12 o'clock)?
       Segment i is drawn clockwise from  rotation + i*A  (measured from the top),
       so the wheel-angle sitting under the pointer is  -rotation. */
    function indexAt(rot) {
      var theta = (((-rot) % TAU) + TAU) % TAU;
      return Math.floor(theta / A) % N;
    }

    function draw(t) {
      var c = ctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, size, size);

      var cx = size / 2, cy = size / 2;
      var outer = size / 2 - 6, ringW = size * 0.05, R = outer - ringW;
      var i, g;

      /* outer ring */
      g = c.createLinearGradient(0, 0, size, size);
      theme.ring.forEach(function (col, k) { g.addColorStop(k / (theme.ring.length - 1), col); });
      c.beginPath(); c.arc(cx, cy, outer, 0, TAU); c.fillStyle = g; c.fill();
      c.beginPath(); c.arc(cx, cy, R + 3, 0, TAU); c.fillStyle = theme.rim; c.fill();

      /* ring bulbs (they chase each other while spinning) */
      var bulbs = 18, br = ringW * 0.27, bR = outer - ringW / 2 - 1;
      for (i = 0; i < bulbs; i++) {
        var ba = (i / bulbs) * TAU;
        var on = spinning ? ((i + Math.floor((t || 0) / 110)) % 2 === 0) : (i % 2 === 0);
        c.save();
        c.beginPath();
        c.arc(cx + Math.cos(ba) * bR, cy + Math.sin(ba) * bR, br, 0, TAU);
        if (on) { c.shadowColor = theme.bulbOn; c.shadowBlur = br * 3 * dpr; }
        c.fillStyle = on ? theme.bulbOn : theme.bulbOff;
        c.fill();
        c.restore();
      }

      /* segment backgrounds */
      for (i = 0; i < N; i++) {
        var start = rotation + i * A - Math.PI / 2;
        g = c.createRadialGradient(cx, cy, R * 0.08, cx, cy, R);
        g.addColorStop(0, segs[i].colors[0]);
        g.addColorStop(1, segs[i].colors[1]);
        c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, start, start + A); c.closePath();
        c.fillStyle = g; c.fill();
        c.lineWidth = 2; c.strokeStyle = theme.divider; c.stroke();
      }
      c.beginPath(); c.arc(cx, cy, R, 0, TAU);
      c.lineWidth = 3; c.strokeStyle = theme.divider; c.stroke();

      /* icons + labels (drawn along the radius of each segment) */
      for (i = 0; i < N; i++) {
        var mid = rotation + i * A + A / 2 - Math.PI / 2;
        c.save();
        c.translate(cx, cy);
        c.rotate(mid);                                   // +x now points outward

        c.save();                                        // icon, upright toward the rim
        c.translate(R * 0.40, 0);
        c.rotate(Math.PI / 2);
        var k = (R * 0.30) / 100;
        c.scale(k, k);
        drawIcon(c, segs[i].icon, styleFor(c), theme.iconGlow, size * 0.022 * dpr);
        c.restore();

        var fs = Math.max(11, R * 0.078);                // label, right-aligned at the rim
        c.font = '700 ' + fs + 'px Poppins, "Segoe UI", Arial, sans-serif';
        c.textAlign = 'right'; c.textBaseline = 'middle';
        var lines = wrap(c, segs[i].label, R * 0.40);
        var lh = fs * 1.18, y0 = -((lines.length - 1) * lh) / 2;
        c.lineJoin = 'round';
        c.lineWidth = Math.max(2.5, fs * 0.28);
        c.strokeStyle = theme.textStroke;
        c.fillStyle = theme.textColor;
        for (var j = 0; j < lines.length; j++) {
          var ly = y0 + j * lh;
          c.strokeText(lines[j], R * 0.95, ly);
          c.fillText(lines[j], R * 0.95, ly);
        }
        c.restore();
      }

      /* hub */
      var hr = R * 0.15;
      g = c.createRadialGradient(cx - hr * 0.3, cy - hr * 0.3, hr * 0.1, cx, cy, hr);
      g.addColorStop(0, theme.hub[0]); g.addColorStop(1, theme.hub[1]);
      c.beginPath(); c.arc(cx, cy, hr, 0, TAU); c.fillStyle = g; c.fill();
      c.lineWidth = 4; c.strokeStyle = theme.rim; c.stroke();
      c.beginPath(); c.arc(cx, cy, hr * 0.35, 0, TAU); c.fillStyle = theme.rim; c.fill();
    }

    function fit() {
      var rect = canvas.getBoundingClientRect();
      size = Math.max(200, Math.round(rect.width));
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = canvas.height = Math.round(size * dpr);
      draw(performance.now());
    }

    /* pointer flick whenever a segment boundary passes under it */
    function tick() {
      if (!pointer || !pointer.animate) return;
      if (tickAnim) tickAnim.cancel();
      tickAnim = pointer.animate([
        { transform: 'translateX(-50%) rotate(0deg)' },
        { transform: 'translateX(-50%) rotate(-24deg)', offset: 0.35 },
        { transform: 'translateX(-50%) rotate(0deg)' }
      ], { duration: 110, easing: 'ease-out' });
    }

    function spin() {
      if (spinning) return;
      spinning = true;
      spinBtn.disabled = true;
      spinBtn.textContent = 'Spinning…';

      var startRot = rotation;
      /* 5–8 full turns + a uniformly random extra angle: the landing spot is
         random, and the prize is only read from the final angle afterwards. */
      var target = startRot + (5 + Math.floor(Math.random() * 4)) * TAU + Math.random() * TAU;

      /* nudge away from a divider line so the result is never ambiguous */
      var f = ((((-target) % TAU) + TAU) % TAU) / A;
      f -= Math.floor(f);
      if (f < 0.04) target -= (0.04 - f) * A;
      else if (f > 0.96) target += (f - 0.96) * A;

      var total = target - startRot;
      var dur = 5200 + Math.random() * 1600;            // 5.2 – 6.8 s
      var t0 = null, lastIdx = indexAt(startRot);

      function step(now) {
        if (t0 === null) t0 = now;
        var p = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - p, 4);                  // ease-out quartic: fast start, slow stop
        rotation = startRot + total * e;
        var idx = indexAt(rotation);
        if (idx !== lastIdx) { lastIdx = idx; tick(); }
        draw(now);
        if (p < 1) rafId = requestAnimationFrame(step);
        else finish();
      }
      rafId = requestAnimationFrame(step);
    }

    function finish() {
      spinning = false;
      rotation = ((rotation % TAU) + TAU) % TAU;
      draw(performance.now());
      var idx = indexAt(rotation);
      setTimeout(function () { showResult(idx); }, 450);
    }

    function showResult(idx) {
      var s = segs[idx];
      mTitle.textContent = s.win ? cfg.winTitle : cfg.loseTitle;
      mPrize.textContent = s.label;
      mMsg.textContent = s.win ? cfg.winMessage : cfg.loseMessage;
      modal.classList.toggle('lose', !s.win);

      /* prize icon inside the modal */
      var m = mIcon.getContext('2d'), d = Math.min(window.devicePixelRatio || 1, 3);
      var px = 84;                                       // CSS size of the icon canvas
      mIcon.width = mIcon.height = Math.round(px * d);
      m.setTransform(d, 0, 0, d, 0, 0);
      m.clearRect(0, 0, px, px);
      m.save();
      m.translate(px / 2, px / 2);
      var sc = (px * 0.8) / 100;
      m.scale(sc, sc);
      drawIcon(m, s.icon, styleFor(m), theme.iconGlow, 10 * d);
      m.restore();

      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add('open'); });
      mClose.focus();
      if (s.win) confetti(cfg.confettiColors);
    }

    function closeModal() {
      modal.classList.remove('open');
      setTimeout(function () { modal.hidden = true; }, 250);
      spinBtn.disabled = false;
      spinBtn.textContent = 'SPIN';
    }

    spinBtn.addEventListener('click', spin);
    mClose.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(canvas);
    else window.addEventListener('resize', fit);

    fit();
    if (document.fonts && document.fonts.load) {         // redraw once the label font is ready
      document.fonts.load('700 16px Poppins').then(function () { draw(performance.now()); });
      document.fonts.ready.then(function () { draw(performance.now()); });
    }
  }

  global.SpinWheel = { init: init };
})(window);
