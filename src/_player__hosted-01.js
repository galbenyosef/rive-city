// _player__hosted 01 — distance
// Lines 3-94 of readable/_player__hosted.pretty.js (statement-aligned).
  function g(e, n, t) {
    const o = e.getAttribute("data-" + n);
    return o === null || o === "" ? t : o;
  }
  function y(e) {
    const n = document.getElementById("rive-status");
    if (!n) return;
    ((n.hidden = !1), n.classList.add("error"));
    const t = n.querySelector(".message");
    t && (t.textContent = e);
  }
  function B() {
    const e = document.getElementById("rive-status");
    e && (e.hidden = !0);
  }
  const h = ["layout", "contain", "cover"],
    E = [];
  let C = !1;
  function D() {
    const e = navigator.userAgent;
    return /iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(e) ||
      (/Macintosh/.test(e) && navigator.maxTouchPoints > 1)
      ? "tablet"
      : /Mobi|iPhone|iPod|Android/i.test(e)
        ? "mobile"
        : "desktop";
  }
  function I() {
    try {
      const e = new URL(document.referrer).hostname;
      return e === window.location.hostname ? void 0 : e;
    } catch {
      return;
    }
  }
  function _() {
    if (C || typeof navigator.sendBeacon != "function") return;
    C = !0;
    const e = new URL(window.location.href).searchParams,
      n = {
        d: D(),
        r: I(),
        us: e.get("utm_source"),
        um: e.get("utm_medium"),
        uc: e.get("utm_campaign"),
      },
      t = new URLSearchParams();
    Object.keys(n).forEach(function (o) {
      const s = n[o];
      s && t.set(o, s.slice(0, 100));
    });
    try {
      navigator.sendBeacon("/_v?" + t.toString());
    } catch {}
  }
  function H() {
    const e = new URL(window.location.href).searchParams.get("fit");
    return h.includes(e) ? e : void 0;
  }
  function R(e) {
    E.forEach(function (t) {
      ((t.instance.layout = new rive.Layout({
        fit: e,
        alignment: g(t.canvas, "alignment", "center"),
      })),
        e !== "layout" && t.instance.resetArtboardSize(),
        t.instance.resizeDrawingSurfaceToCanvas());
    });
    const n = new URL(window.location.href);
    (n.searchParams.set("fit", e), window.history.replaceState(null, "", n));
  }
  const W = "/_player/drawer.riv",
    z = "https://rive.app/",
    F = 22,
    X = 1500,
    S = { fitLayout: "layout", fitContain: "contain", fitCover: "cover" },
    K = 600,
    Y = 800,
    p = 8,
    O = 48,
    U = { bottom: Math.PI / 2, left: Math.PI, right: 0, float: Math.PI / 2 },
    v = 24;
  let b = null;
  function x(e) {
    return [
      { side: "bottom", distance: window.innerHeight - e.bottom },
      { side: "left", distance: e.left },
      { side: "right", distance: window.innerWidth - e.right },
    ].reduce(function (n, t) {
      return t.distance < n.distance ? t : n;
    });
  }
