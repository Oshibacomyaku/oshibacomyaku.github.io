/* Hero draw-in: the finished artwork is painted in by brush strokes that follow the
   same flow field the artwork was generated with (p5 noiseSeed 4167, frame 7250).
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

  // 36x36 flow-field angles over the artwork's 700x700 logical space, one byte each (0..255 = 0..2π)
  const FIELD = "0M/NysfFxMbK0Njg5+3x8/Lx8O7s6unn5uXl5ujs8/sCCA8W0dDOy8jGxcfL0djg5+3x8vLx8O7s6uno5uXl5ujs8/sCCRAX0tHPzcrJyMrO09rh5+3w8vHx8O7s6+no5+bl5ujs8/sCChIa1NTS0M7Nzc7S19zi6Ozv8fDw7+7t7Ovq6Ofm5+nt8/sDDBUe19fW1NPS0tTX29/k6Ozu7+/v7+7t7ezr6uno6Ont9PwFDhgi29va2djY2Nnc3+Ll6Ovt7u7u7u7u7u3t7Orp6evu9f0HERwo4N/f3t3d3d7g4uTm6ers7O3t7u7v7+/v7u3r6+zw9v8JFCAs5eXk4+Li4uLj5Obn6Orr6+zt7u/v8PHx8O/u7u/z+QIMGCQw6urp6Ofl5eTl5ebn6Onq6+zt7u/w8fLz8/Lx8fP2/QUPGycz7+7t6+nn5uXk5eXm5+jp6uzt7u/x8vP09PT19fj8AgsUHyo18vHw7ero5ePi4uPk5ujp6+zt7u/x8vP19vf5+/4DChIbJC038/Px7urm4+Hf3+Di5efq7O3u7+/w8fP19/r9AQYMExoiKTE49PPx7enk4N3b293g5Ofq7e7v7/Dw8fL0+PwBBw0UGyIpLjQ68/Lv6+bh3dnX2Nre4ufr7e/w8PDw8PL1+f4EDBMbIykvMzc78vHu6eTf2tbU1Nfc4ebr7vDw8PDw8fL1+gAHEBghKC8zNjk87+7r5+Lc19TS0tXa4Obr7vDx8fHx8fP2+wIKEhskKzE2OTs+7Ovo5ODb1tPR0tXZ3+Tp7e/w8PDx8fP3/AIKExskKzE2OTw/6Ofl4t7a19TS09XY3eLm6ezt7u7u7/L1+gAIEBggKC4zODxA4+Lh4N7b2dfV1dbY2t7h5Ofo6erq7O7y9/0EDBMbIikvNTtB3d3d3d3d3NrZ2NfX19nb3uHj5OTl5+ru8/kABg0UGyIqMTlB2NjZ29ze3t3c2tfV1NTV19rd3t/g4ubq8PX7AQgOFRwlLjhC09TW2Nve39/d2tfT0M/P0dXX2Nrc3uLn7fL4/gQKEBghLDhDz9DS1dnc3t7c2dXQzMrKzNDS1NbY2+Dm7PH3/QIIDxYgLDhFzM3P0tbZ2trY1dHMyMbGyMzP0dTW2t/m7PL4/gQKERgiLjpHyMnLztHU1dXT0MzHxMLCxcnMz9LV2t/m7fT7AQcOFBslMDxJxcXHyczOz87MycbCv76/wsbKzdHV2uDo7/f+BQwSGCAoMz5KwcHDxcbIyMfFwr+9u7u8wMTIzNDV2+Lq8voCCREXHiQtNkBLvr6/wcLCwsG+vLq4uLm7vsPHzNHW3OTs9f0GDhYdIykxOUJLvb29vr6+vry5t7a2tri6vsPHzNHX3ubu9wAJEhohJy40PENMvb29vb69vLq4trW1tri7v8PIzdPZ4Ojx+gMMFR0lKzE3PUVMv7+/wL+/vry5t7a3uLq9wcXKz9Xb4+rz/AUOFyAnLTI4P0VNxMTExMTDwsC9u7u7vL7BxcnO09je5e31/gcQGSEoLjM5P0ZOy8vLy8vKycbEwsHBwsTGys7T193i6fH5AQoSGiIoLjQ6QUhQ09PT09PS0c/MysnIycvN0dXZ3eLo7vX9BQ0VHCMpLjQ6QkpT3d3d3d3c2tjV09LR0dPV2dzg5Onu9PoCChEYHiQpLjQ7RE1X6Ojn5+fm5OLf3dva29ze4eXo7PD0+gAIDxUbICYqLzU9RlFc";
  const G = 36, STEP = 700 / (G - 1);
  const raw = atob(FIELD);
  const fc = new Float32Array(G * G), fs = new Float32Array(G * G);
  for (let k = 0; k < G * G; k++) {
    const a = raw.charCodeAt(k) / 256 * Math.PI * 2;
    fc[k] = Math.cos(a); fs[k] = Math.sin(a);
  }
  // bilinear blend of the direction vectors (not the angles, so wrap-around is safe)
  const dirAt = (lx, ly) => {
    const gx = Math.min(Math.max(lx / STEP, 0), G - 1.001), gy = Math.min(Math.max(ly / STEP, 0), G - 1.001);
    const i = gx | 0, j = gy | 0, tx = gx - i, ty = gy - j, k = j * G + i;
    const c = (fc[k] * (1 - tx) + fc[k + 1] * tx) * (1 - ty) + (fc[k + G] * (1 - tx) + fc[k + G + 1] * tx) * ty;
    const s = (fs[k] * (1 - tx) + fs[k + 1] * tx) * (1 - ty) + (fs[k + G] * (1 - tx) + fs[k + G + 1] * tx) * ty;
    const m = Math.hypot(c, s) || 1;
    return [c / m, s / m];
  };

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
      if (dt > 150 && ++slow >= 3) { cv.remove(); return finish(); }

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
