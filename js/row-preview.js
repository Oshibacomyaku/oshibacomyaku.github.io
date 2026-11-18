/* List hover preview: hovering a row in the lists floats a picture of it next to the
   cursor — the MV's YouTube thumbnail, or the jacket for the album. Rows with neither
   show nothing. Only for a real mouse (hover-capable, fine pointer). */
(() => {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const pictureFor = (row) => {
    const yt = row.querySelector('.row-links a[href*="youtu.be/"]');
    if (yt) return { src: `https://i.ytimg.com/vi/${yt.href.split("youtu.be/")[1].split(/[?&#]/)[0]}/mqdefault.jpg`, wide: true };
    if (row.querySelector('.row-links a[href*="mountain-of-phase"]')) return { src: "images/mop-720.jpg", wide: false };
    return null;
  };

  const box = document.createElement("div");
  box.className = "row-preview";
  box.setAttribute("aria-hidden", "true");
  const pic = new Image();
  pic.alt = "";
  pic.decoding = "async";
  box.append(pic);
  document.body.append(box);

  // the picture trails the cursor a little, which reads softer than pinning it
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, shown = false;
  const follow = () => {
    x += (tx - x) * 0.25; y += (ty - y) * 0.25;
    box.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = shown || Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(follow) : 0;
  };
  const aim = (e) => {
    const w = box.offsetWidth, h = box.offsetHeight;
    // to the right of the cursor, or to the left near the right edge
    tx = e.clientX + 28 + w > innerWidth ? e.clientX - 28 - w : e.clientX + 28;
    ty = Math.min(Math.max(e.clientY - h / 2, 8), innerHeight - h - 8);
  };

  for (const row of document.querySelectorAll(".index .row")) {
    const p = pictureFor(row);
    if (!p) continue;
    row.addEventListener("mouseenter", (e) => {
      if (pic.getAttribute("src") !== p.src) pic.src = p.src;
      box.classList.toggle("is-square", !p.wide);
      aim(e);
      if (!shown) { x = tx; y = ty; }   // appear in place, then follow
      shown = true;
      box.classList.add("is-on");
      if (!raf) raf = requestAnimationFrame(follow);
    });
    row.addEventListener("mousemove", aim);
    row.addEventListener("mouseleave", () => {
      shown = false;
      box.classList.remove("is-on");
    });
  }
})();
