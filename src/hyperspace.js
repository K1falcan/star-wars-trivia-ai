// Full-screen hyperspace "warp" background on a 2D canvas. Stars stream outward from the
// center with motion-blur trails, looping forever. Lightweight (no WebGL/shaders) and
// respects prefers-reduced-motion by holding a calm starfield instead of warping.

export function startHyperspace(canvas) {
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0;
  let h = 0;
  let cx = 0;
  let cy = 0;
  let dpr = 1;
  const STAR_COUNT = 480;
  const stars = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    cx = w / 2;
    cy = h / 2;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(star) {
    // Position in polar coords from center so stars radiate outward.
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 40; // start near center
    star.x = cx + Math.cos(angle) * radius;
    star.y = cy + Math.sin(angle) * radius;
    star.angle = angle;
    star.speed = 1 + Math.random() * 3;
    star.prevX = star.x;
    star.prevY = star.y;
    star.len = 0;
    return star;
  }

  function init() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      const s = spawn({});
      // Pre-scatter so the field is full on first frame.
      const r = Math.random() * Math.max(w, h) * 0.6;
      s.x = cx + Math.cos(s.angle) * r;
      s.y = cy + Math.sin(s.angle) * r;
      s.prevX = s.x;
      s.prevY = s.y;
      stars.push(s);
    }
  }

  function frame() {
    // Trailing fade gives the streaking motion-blur look.
    ctx.fillStyle = "rgba(2, 4, 14, 0.35)";
    ctx.fillRect(0, 0, w, h);

    ctx.lineCap = "round";
    for (const s of stars) {
      s.prevX = s.x;
      s.prevY = s.y;
      const dx = Math.cos(s.angle);
      const dy = Math.sin(s.angle);
      const dist = Math.hypot(s.x - cx, s.y - cy);
      // Accelerate as stars move outward for a convincing warp.
      const v = reduced ? 0.15 : s.speed * (1 + dist / 220);
      s.x += dx * v;
      s.y += dy * v;

      const offEdge = s.x < -40 || s.x > w + 40 || s.y < -40 || s.y > h + 40;
      if (offEdge) {
        spawn(s);
        continue;
      }

      const brightness = Math.min(1, 0.25 + dist / 320);
      const width = Math.min(2.4, 0.4 + dist / 280);
      ctx.strokeStyle = `rgba(${180 + brightness * 60}, ${205 + brightness * 40}, 255, ${brightness})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(s.prevX, s.prevY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
    requestAnimationFrame(frame);
  }

  resize();
  init();
  window.addEventListener("resize", () => {
    resize();
    init();
  });
  requestAnimationFrame(frame);
}
