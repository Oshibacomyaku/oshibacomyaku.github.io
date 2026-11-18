/* The flow field the hero artwork was generated with (p5 noiseSeed 4167, frame 7250),
   shared by the draw-in intro (hero-draw.js) and the cursor brush (hero-brush.js).
   dirAt(lx, ly) takes a point in the artwork's 700x700 logical space and returns the
   unit direction [cos, sin] the strokes flow in there. */
window.heroField = (() => {
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
  return { dirAt };
})();
