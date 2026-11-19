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
  (img.closest("picture") || img).after(cv);
  const ctx = cv.getContext("2d");
  if (!ctx) return;

  const SAMPLE = 4;            // colour lookup grid, in css px
  const FADE = 0.018;          // share of the strokes erased per frame (on average)
  // The canvas keeps alpha in whole steps of 1/255. Erasing 1.8% every frame rounds to
  // nothing once a line is faint, so lines got stuck at 25/255 (~10%) and then vanished
  // at once when the canvas was cleared. Erasing the same amount every 2 frames gets
  // stuck at 14/255 (5.5%) after ~2.6s; every 6 frames went lower but the 10 steps a
  // second showed as judder. That last trace is faded out with CSS, never cleared at once.
  const FADE_EVERY = 2;
  const SETTLE = 160;          // frames after the last line until the trace has settled (~2.7s)
  const TURN = 0.05;           // how quickly a thrown line gives in to the flow, per frame
  const GLOW = 0.42;           // the colour is pulled this far toward white, so the trail reads over the art
  let W = 0, H = 0, geo = null, colours = null, cw = 0, sized = false;

  // Reads the artwork once: where it sits and a small grid of its colours. The decoded
  // full-size image is released straight away (it is 6.5MB on a phone, 26MB on a retina
  // laptop); it is only decoded again if the hero really changes size.
  const setup = async () => {
    let src;
    try { src = await createImageBitmap(img); } catch (e) { return; }
    W = hero.clientWidth; H = hero.clientHeight;
    sized = false; cv.width = cv.height = 0;
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
    src.close();
  };

  // The drawing surface is only allocated when someone first draws.
  const ensureCanvas = () => {
    if (sized) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    sized = true;
  };

  const ps = [];
  // spread: how far from the pointer a particle may be born, in multiples of the base radius
  // (ux, uy): the way it is thrown at first — the cursor's heading; without one it flies
  // outward from the pointer (a tap). Either way it gets a little random turn.
  const spawn = (x, y, spread = 1, ux = 0, uy = 0, boost = 0) => {
    if (!colours || ps.length > 300) return;
    const L = geo.L;
    // born anywhere in a disc around the pointer (sqrt keeps the disc evenly filled)
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * Math.max(24, 16 * L) * spread;
    x += Math.cos(a) * r; y += Math.sin(a) * r;
    if (!ux && !uy) { ux = Math.cos(a); uy = Math.sin(a); }
    const turn = (Math.random() - 0.5) * 0.9, ct = Math.cos(turn), st = Math.sin(turn);
    [ux, uy] = [ux * ct - uy * st, ux * st + uy * ct];
    const i = ((Math.min(Math.max(y, 0), H - 1) / SAMPLE | 0) * cw + (Math.min(Math.max(x, 0), W - 1) / SAMPLE | 0)) * 4;
    const j = () => (Math.random() - 0.5) * 24;
    const c = (v) => Math.min(255, Math.max(0, v + (255 - v) * GLOW + j())) | 0;
    ps.push({
      x, y,
      colour: `rgb(${c(colours[i])},${c(colours[i + 1])},${c(colours[i + 2])})`,
      w: (1.5 + Math.random() * 1.5) * L,        // 1.5 to 3.0 units wide
      sp: (0.6 + Math.random() * 2.2) * L,
      ux, uy,
      boost: boost * (0.5 + Math.random()) * L,   // extra speed from a fast stroke, dies away
      life: 40 + Math.random() * 150,
      // each line leans off the flow by its own angle and keeps drifting, so they fan out
      bend: (Math.random() - 0.5) * 1.2,
      drift: (Math.random() - 0.5) * 0.03,
    });
  };

  let running = false, idle = 0, last = 0, fadeDue = 0;
  let fading = false, fadeToken = 0;   // the closing CSS fade, and a counter that only goes up
  const frame = (now) => {
    const k = last ? Math.min((now - last) / 16.7, 3) : 1;
    last = now;
    fadeDue += k;
    if (fadeDue >= FADE_EVERY) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${1 - Math.pow(1 - FADE, fadeDue)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      fadeDue = 0;
    }
    const { dx, dy, L } = geo;
    for (let n = ps.length - 1; n >= 0; n--) {
      const p = ps[n];
      const [fx, fy] = F.dirAt((p.x - dx) / L, (p.y - dy) / L);
      p.bend += p.drift * k;
      const cb = Math.cos(p.bend), sb = Math.sin(p.bend);
      // steer from the thrown heading toward the (bent) flow, a little each frame
      const t = Math.min(1, TURN * k);
      p.ux += (fx * cb - fy * sb - p.ux) * t;
      p.uy += (fx * sb + fy * cb - p.uy) * t;
      const m = Math.hypot(p.ux, p.uy) || 1;
      p.ux /= m; p.uy /= m;
      const cx = p.ux, sy = p.uy;
      p.boost *= Math.pow(0.94, k);
      const v = (p.sp * (0.3 + Math.min(p.life, 40) / 40) + p.boost) * k;  // eases off as it dies
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
    // keep fading for a while after the last stroke, then let the faint leftovers
    // (at most 14/255) fade out with CSS and free the canvas once it is invisible
    idle = ps.length ? 0 : idle + 1;
    if (idle > SETTLE) {
      running = false; last = 0;
      fading = true;
      const token = ++fadeToken;
      cv.style.transition = "opacity 1.2s ease-out";
      cv.style.opacity = "0";
      setTimeout(() => {
        if (token !== fadeToken) return;   // painting started again meanwhile
        fading = false;
        sized = false; cv.width = cv.height = 0;   // nothing left to show: hand the memory back
        cv.style.transition = "none";
        cv.style.opacity = "";
      }, 1250);
      return;
    }
    requestAnimationFrame(frame);
  };
  const wake = () => {
    if (fading) { fading = false; fadeToken++; cv.style.transition = "none"; cv.style.opacity = ""; }
    if (!running && geo) { ensureCanvas(); running = true; idle = 0; requestAnimationFrame(frame); }
  };

  // pointer position on the canvas (it moves with the parallax, so measure it each time)
  const at = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  let px = null, py = null;
  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !geo) return;
    const [x, y] = at(e);
    if (px !== null) {
      // a few particles per stretch of movement, spread along the path
      const d = Math.hypot(x - px, y - py), n = Math.min(3, Math.ceil(d / 16));  // about half as many as before
      if (d > 0) {
        const ux = (x - px) / d, uy = (y - py) / d, boost = Math.min(d / 12, 3);
        for (let s = 1; s <= n; s++) spawn(px + (x - px) * s / n, py + (y - py) * s / n, 1, ux, uy, boost);
      }
    }
    px = x; py = y;
    wake();
  }, { passive: true });
  hero.addEventListener("pointerleave", () => { px = py = null; }, { passive: true });
  hero.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || !geo || e.target.closest("a")) return;
    const [x, y] = at(e);
    for (let s = 0; s < 50; s++) spawn(x, y, 1.8);
    wake();
  }, { passive: true });

  // Phones fire "resize" whenever the address bar slides in or out during a scroll, but
  // the hero (100svh) keeps its size then. Rebuilding would wipe the canvas and the lines
  // mid-stroke, so only rebuild when the hero really changes size (rotation, window resize).
  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (hero.clientWidth === W && hero.clientHeight === H) return;
      ps.length = 0;
      setup();
    }, 200);
  }, { passive: true });

  if (img.complete && img.naturalWidth) setup();
  else img.addEventListener("load", setup, { once: true });
})();
