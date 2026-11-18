/* Hero brush: the cursor runs the same algorithm the artwork was made with.
   Particles are born under the pointer, take the artwork's colour at that spot (lifted
   toward white so the trail shows, with a little random tint like the original), and
   drag it along the artwork's flow field.
   The strokes slowly fade, so the picture heals back to itself.

   Mouse: moving over the hero paints. Touch/pen: a tap sprays a burst (moving a finger
   is left to scrolling). Off under reduced motion. */
(() => {
  const F = window.heroField;  // js/hero-field.js
  const hero = document.querySelector(".hero");
  const img = document.querySelector(".hero-art");
  if (!F || !hero || !img || !window.createImageBitmap) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const cv = document.createElement("canvas");
  cv.className = "hero-brush";
  cv.setAttribute("aria-hidden", "true");
  img.after(cv);
  const ctx = cv.getContext("2d");
  if (!ctx) return;

  const SAMPLE = 4;            // colour lookup grid, in css px
  const FADE = 0.018;          // share of the strokes erased each frame
  const GLOW = 0.42;           // the colour is pulled this far toward white, so the trail reads over the art
  let src = null, W = 0, H = 0, geo = null, colours = null, cw = 0;

  const setup = () => {
    if (!src) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // same placement as the <img>: object-fit: cover, object-position: 50% 40%
    const sc = Math.max(W / src.width, H / src.height);
    geo = { sc, dx: (W - src.width * sc) * 0.5, dy: (H - src.height * sc) * 0.4, L: src.width * sc / 700 };
    // a small copy of the visible artwork to pick colours from
    cw = Math.ceil(W / SAMPLE);
    const ch = Math.ceil(H / SAMPLE);
    const off = document.createElement("canvas");
    off.width = cw; off.height = ch;
    const oc = off.getContext("2d");
    oc.drawImage(src, geo.dx / SAMPLE, geo.dy / SAMPLE, src.width * sc / SAMPLE, src.height * sc / SAMPLE);
    colours = oc.getImageData(0, 0, cw, ch).data;
  };

  const ps = [];
  const spawn = (x, y) => {
    if (!colours || ps.length > 600) return;
    const i = ((Math.min(Math.max(y, 0), H - 1) / SAMPLE | 0) * cw + (Math.min(Math.max(x, 0), W - 1) / SAMPLE | 0)) * 4;
    const j = () => (Math.random() - 0.5) * 24;
    const c = (v) => Math.min(255, Math.max(0, v + (255 - v) * GLOW + j())) | 0;
    const L = geo.L;
    ps.push({
      x, y,
      colour: `rgb(${c(colours[i])},${c(colours[i + 1])},${c(colours[i + 2])})`,
      w: (1.4 + Math.random() * 2.4) * L,
      sp: (1.0 + Math.random() * 1.4) * L,
      life: 60 + Math.random() * 110,
    });
  };

  let running = false, idle = 0, last = 0;
  const frame = (now) => {
    const k = last ? Math.min((now - last) / 16.7, 3) : 1;
    last = now;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${FADE * k})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    const { dx, dy, L } = geo;
    for (let n = ps.length - 1; n >= 0; n--) {
      const p = ps[n];
      const [cx, sy] = F.dirAt((p.x - dx) / L, (p.y - dy) / L);
      const v = p.sp * k * (0.3 + Math.min(p.life, 40) / 40);  // eases off as it dies
      ctx.strokeStyle = p.colour;
      ctx.lineWidth = p.w;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      p.x += cx * v; p.y += sy * v;
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      p.life -= k;
      if (p.life <= 0 || p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) ps.splice(n, 1);
    }
    // keep fading for a while after the last stroke, then wipe the faint 8-bit leftovers
    idle = ps.length ? 0 : idle + 1;
    if (idle > 240) { ctx.clearRect(0, 0, W, H); running = false; last = 0; return; }
    requestAnimationFrame(frame);
  };
  const wake = () => { if (!running && geo) { running = true; idle = 0; requestAnimationFrame(frame); } };

  // pointer position on the canvas (it moves with the parallax, so measure it each time)
  const at = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  let px = null, py = null;
  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !geo) return;
    const [x, y] = at(e);
    if (px !== null) {
      // a few particles per stretch of movement, spread along the path
      const d = Math.hypot(x - px, y - py), n = Math.min(6, Math.ceil(d / 8));
      for (let s = 1; s <= n; s++) spawn(px + (x - px) * s / n + (Math.random() - 0.5) * 6, py + (y - py) * s / n + (Math.random() - 0.5) * 6);
    }
    px = x; py = y;
    wake();
  }, { passive: true });
  hero.addEventListener("pointerleave", () => { px = py = null; }, { passive: true });
  hero.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || !geo || e.target.closest("a")) return;
    const [x, y] = at(e);
    for (let s = 0; s < 40; s++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 28;
      spawn(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    wake();
  }, { passive: true });

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { ps.length = 0; setup(); }, 200);
  }, { passive: true });

  const ready = async () => {
    try { src = await createImageBitmap(img); } catch (e) { return; }
    setup();
  };
  if (img.complete && img.naturalWidth) ready();
  else img.addEventListener("load", ready, { once: true });
})();
