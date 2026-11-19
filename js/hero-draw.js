/* Hero draw-in: the finished artwork is painted in by brush strokes that follow the
   same flow field the artwork was generated with (js/hero-field.js).
   Each stroke paints the artwork's own pixels (canvas pattern), so when every stroke
   is done the canvas matches the image; the real <img> then fades in on top.

   Runs only when <html> has .draw-intro (set in <head> unless reduced motion is on).
   Without JS, or if anything fails, the <img> shows as usual (CSS fallback after 4.5s). */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains("draw-intro")) return;

  const hero = document.querySelector(".hero");
  const img = document.querySelector(".hero-art");
  const cv = document.querySelector(".hero-draw");
  const finish = () => {
    root.classList.add("drawn");
    setTimeout(() => cv && cv.remove(), 1000);
  };
  if (!hero || !img || !cv || !cv.getContext || window.scrollY > hero.offsetHeight / 2) return finish();

  const dirAt = window.heroField && window.heroField.dirAt;  // js/hero-field.js
  if (!dirAt) return finish();

  const DURATION = 3600;  // ms of drawing
  const FADE_AT = 2200;   // ms: the real image starts fading in (CSS transition, 1.8s); ~90% is painted by then
  const WSTART = 2;       // strokes born at the start are up to 3x thicker, thinning to 1x by the end
                          // (5x filled the screen within 0.25s, so the lines were barely seen being drawn)
  const LGROW = 1.5;      // strokes born later live longer (up to 2.5x)
  let prog = 0;

  const start = async () => {
    // The real pixel size of the chosen srcset file. img.naturalWidth is density-corrected
    // (a 1920px file can report 1440), which would scale the pattern wrong.
    let src;
    try { src = await createImageBitmap(img); } catch (e) { return finish(); }

    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = hero.clientWidth, H = hero.clientHeight;
    const PW = Math.round(W * dpr), PH = Math.round(H * dpr);
    cv.width = PW; cv.height = PH;

    // Strokes are drawn in plain white on a scratch layer, then the artwork is laid
    // into them (source-in) and the layer is stamped onto the canvas. One image draw
    // per frame instead of a pattern per stroke: WebKit (all iOS browsers) renders
    // pattern strokes very slowly, which froze the intro on the first frame.
    const layer = document.createElement("canvas");
    layer.width = PW; layer.height = PH;
    const lc = layer.getContext("2d");
    if (!lc) return finish();
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    lc.lineCap = "round"; lc.lineJoin = "round";
    lc.strokeStyle = "#fff";
    // the decoded image and the scratch layer are only needed while drawing
    const release = () => { src.close(); layer.width = layer.height = 0; };

    // same placement as the <img>: object-fit: cover, object-position: 50% 40%
    const iw = src.width, ih = src.height;
    const sc = Math.max(W / iw, H / ih), dx = (W - iw * sc) * 0.5, dy = (H - ih * sc) * 0.4;
    const L = iw * sc / 700; // css px per logical unit of the artwork

    // widths are grouped into 12% steps so each group is one path and one stroke call
    const WQ = Math.log(1.12);
    const bucketOf = (w) => Math.round(Math.log(w / L) / WQ);

    // Strokes are born in a field 15% larger than the screen on every side, so lines
    // flow in from off-screen and the edges get painted too. Count scales with that area.
    const MX = W * 0.15, MY = H * 0.15;
    const AW = W + 2 * MX, AH = H + 2 * MY;
    // thin strokes, close to the artwork's own line width, so it reads as lines being drawn
    const N = Math.round(Math.min(Math.max(AW * AH / 900, 600), 2600));
    const spawn = (p) => {
      p.x = Math.random() * AW - MX; p.y = Math.random() * AH - MY;
      p.life = p.life0 = (22 + Math.random() * 40) * (1 + LGROW * prog);
      p.b = bucketOf((1.6 + Math.random() * 2.6) * L * (1 + WSTART * (1 - prog) ** 1.5));
      p.sp = (1.2 + Math.random() * 1.4) * L;
      return p;
    };
    const ps = Array.from({ length: N }, () => spawn({}));

    let t0 = 0, last = 0, faded = false, slow = 0;
    const frame = (now) => {
      if (!t0) { t0 = now; last = now; }
      const dt = now - last;
      const k = Math.min(dt / 16.7, 3); // frames worth of movement since last paint
      last = now;
      prog = Math.min((now - t0) / DURATION, 1);
      if (!faded && now - t0 >= FADE_AT) { faded = true; root.classList.add("drawn"); }
      // a device that still can't keep up gets the plain image instead of a slideshow
      if (dt > 150 && ++slow >= 3) { release(); cv.remove(); return finish(); }

      const g = 0.1 + 3.0 * (1 - prog) ** 3;     // whole drawing: ~3x at first, down to 0.1x
      const active = Math.round(N * Math.min(1, 0.15 + prog * 1.6)); // starts sparse, fills in
      const paths = new Map();
      for (let n = 0; n < active; n++) {
        const p = ps[n];
        const v = p.sp * g * (0.08 + 2.1 * (Math.max(p.life, 0) / p.life0) ** 1.5) * k; // each line: ~2.2x at birth, 0.08x at the end
        const steps = Math.min(8, Math.max(1, Math.ceil(v / (3 * L))));       // smooth curves when fast, capped for speed
        let path = paths.get(p.b);
        if (!path) paths.set(p.b, path = new Path2D());
        path.moveTo(p.x, p.y);
        for (let s = 0; s < steps; s++) {
          const [cx, sy] = dirAt((p.x - dx) / L, (p.y - dy) / L);
          p.x += cx * v / steps; p.y += sy * v / steps;
          path.lineTo(p.x, p.y);
        }
        p.life -= k;
        if (p.life < 0 || p.x < -MX - 40 || p.y < -MY - 40 || p.x > W + MX + 40 || p.y > H + MY + 40) spawn(p);
      }

      lc.globalCompositeOperation = "source-over";
      lc.clearRect(0, 0, W, H);
      for (const [b, path] of paths) {
        lc.lineWidth = L * Math.exp(b * WQ);
        lc.stroke(path);
      }
      lc.globalCompositeOperation = "source-in";
      lc.drawImage(src, dx, dy, iw * sc, ih * sc);
      ctx.drawImage(layer, 0, 0);

      if (prog < 1) requestAnimationFrame(frame);
      else {
        root.classList.add("drawn");
        release();
        setTimeout(() => cv.remove(), Math.max(0, FADE_AT + 1900 - DURATION));
      }
    };
    requestAnimationFrame(frame);
  };

  if (img.complete && img.naturalWidth) start();
  else {
    img.addEventListener("load", start, { once: true });
    img.addEventListener("error", finish, { once: true });
  }
})();
