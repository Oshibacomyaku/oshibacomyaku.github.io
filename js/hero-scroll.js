/* Hero parallax. Writes how far the hero has been scrolled past into CSS variables
   on .hero; css/style.css moves and darkens the art with them.
     --sy : scroll offset in px, capped at the hero's height
     --hp : the same as 0..1
   Skipped under reduced motion, so both stay 0 and the hero scrolls like plain content. */
(() => {
  const hero = document.querySelector(".hero");
  if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Below the hero the value stays capped, so writing it again would only make the
  // browser recheck the hero's styles on every scroll frame while reading the lists.
  let ticking = false, lastY = -1, h = hero.offsetHeight || 1;
  const update = () => {
    ticking = false;
    const y = Math.round(Math.min(Math.max(window.scrollY, 0), h));
    if (y === lastY) return;
    lastY = y;
    hero.style.setProperty("--sy", y + "px");
    hero.style.setProperty("--hp", (y / h).toFixed(4));
  };
  const remeasure = () => { h = hero.offsetHeight || 1; lastY = -1; update(); };
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener("resize", remeasure, { passive: true });
  update();
})();
