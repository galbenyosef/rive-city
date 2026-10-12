// _player__hosted 05 — addeventlistener
// Lines 454-494 of readable/_player__hosted.pretty.js (statement-aligned).
  function te() {
    if (typeof window.matchMedia != "function") return;
    let e = null;
    const n = function () {
        (E.forEach(function (o) {
          o.instance.resizeDrawingSurfaceToCanvas();
        }),
          b && b.resizeDrawingSurfaceToCanvas(),
          t());
      },
      t = function () {
        e &&
          (e.removeEventListener
            ? e.removeEventListener("change", n)
            : e.removeListener(n));
        const o = window.devicePixelRatio || 1;
        ((e = window.matchMedia(
          "(min-resolution: " +
            (o - 0.001) +
            "dppx) and (max-resolution: " +
            (o + 0.001) +
            "dppx)",
        )),
          e.addEventListener
            ? e.addEventListener("change", n)
            : e.addListener(n));
      };
    t();
  }
  function P() {
    if (typeof rive > "u") {
      y("This animation could not be loaded.");
      return;
    }
    const e = document.querySelectorAll("canvas[data-src]");
    for (let n = 0; n < e.length; n += 1) ee(e[n]);
    te();
  }
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", P)
    : P();
