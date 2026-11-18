/* Hero parallax. Writes how far the hero has been scrolled past into CSS variables
   on .hero; css/style.css moves and darkens the art with them.
     --sy : scroll offset in px, capped at the hero's height
     --hp : the same as 0..1
   Skipped under reduced motion, so both stay 0 and the hero scrolls like plain content. */
(() => {
  const hero = document.querySelector(".hero");
  if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    const h = hero.offsetHeight || 1;
    const y = Math.min(Math.max(window.scrollY, 0), h);
    hero.style.setProperty("--sy", y + "px");
    hero.style.setProperty("--hp", (y / h).toFixed(4));
  };
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener("resize", update, { passive: true });
  update();
})();
