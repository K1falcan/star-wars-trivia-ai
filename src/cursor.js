// Lightsaber mouse cursor. The native cursor is hidden (see styles.css) and a glowing
// saber element follows the pointer, tilting slightly toward its direction of travel so it
// feels like it's being swung. Falls back to the native cursor on touch devices.

export function startSaberCursor(saberEl) {
  // Touch devices have no hover pointer — leave the default behavior alone.
  if (!window.matchMedia("(pointer: fine)").matches) {
    document.documentElement.classList.add("no-saber");
    return;
  }

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let lastX = x;
  let tilt = -35; // resting blade angle (degrees)

  function render() {
    const dx = x - lastX;
    // Swing the blade based on horizontal velocity, easing back to rest.
    const target = -35 + Math.max(-35, Math.min(35, dx * 2.5));
    tilt += (target - tilt) * 0.2;
    lastX = x;
    saberEl.style.transform = `translate(${x}px, ${y}px) rotate(${tilt}deg)`;
    requestAnimationFrame(render);
  }

  window.addEventListener(
    "mousemove",
    (e) => {
      x = e.clientX;
      y = e.clientY;
      if (saberEl.style.opacity !== "1") saberEl.style.opacity = "1";
    },
    { passive: true }
  );

  // Igniting effect on click (a quick blade flare via a CSS class).
  window.addEventListener("mousedown", () => saberEl.classList.add("ignite"));
  window.addEventListener("mouseup", () => saberEl.classList.remove("ignite"));

  requestAnimationFrame(render);
}
