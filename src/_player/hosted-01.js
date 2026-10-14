// _player/hosted 01 — distance
// Lines 3-94 of readable/_player/hosted.pretty.js (statement-aligned).
  function readDataAttr(e, n, t) {
    const o = e.getAttribute("data-" + n);
    return o === null || o === "" ? t : o;
  }
  function showError(e) {
    const n = document.getElementById("rive-status");
    if (!n) return;
    ((n.hidden = !1), n.classList.add("error"));
    const t = n.querySelector(".message");
    t && (t.textContent = e);
  }
  function hideStatus() {
    const e = document.getElementById("rive-status");
    e && (e.hidden = !0);
  }
  const FIT_MODES = ["layout", "contain", "cover"],
    instances = [];
  let analyticsSent = !1;
  function detectDeviceType() {
    const e = navigator.userAgent;
    return /iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(e) ||
      (/Macintosh/.test(e) && navigator.maxTouchPoints > 1)
      ? "tablet"
      : /Mobi|iPhone|iPod|Android/i.test(e)
        ? "mobile"
        : "desktop";
  }
  function referrerHost() {
    try {
      const e = new URL(document.referrer).hostname;
      return e === window.location.hostname ? void 0 : e;
    } catch {
      return;
    }
  }
  function sendAnalytics() {
    if (analyticsSent || typeof navigator.sendBeacon != "function") return;
    analyticsSent = !0;
    const e = new URL(window.location.href).searchParams,
      n = {
        d: detectDeviceType(),
        r: referrerHost(),
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
  function fitFromUrl() {
    const e = new URL(window.location.href).searchParams.get("fit");
    return FIT_MODES.includes(e) ? e : void 0;
  }
  function applyFit(e) {
    instances.forEach(function (t) {
      ((t.instance.layout = new rive.Layout({
        fit: e,
        alignment: readDataAttr(t.canvas, "alignment", "center"),
      })),
        e !== "layout" && t.instance.resetArtboardSize(),
        t.instance.resizeDrawingSurfaceToCanvas());
    });
    const n = new URL(window.location.href);
    (n.searchParams.set("fit", e), window.history.replaceState(null, "", n));
  }
  const DRAWER_SRC = "/_player/drawer.riv",
    RIVE_APP_URL = "https://rive.app/",
    GRIP_WIDTH = 22,
    COPIED_TIP_MS = 1500,
    FIT_EVENTS = { fitLayout: "layout", fitContain: "contain", fitCover: "cover" },
    MOBILE_WIDTH = 600,
    DRAWER_REVEAL_MS = 800,
    DRAG_PADDING = 8,
    DOCK_THRESHOLD = 48,
    EDGE_ANGLES = { bottom: Math.PI / 2, left: Math.PI, right: 0, float: Math.PI / 2 },
    PEEK_MARGIN = 24;
  let drawerInstance = null;
  function nearestEdge(e) {
    return [
      { side: "bottom", distance: window.innerHeight - e.bottom },
      { side: "left", distance: e.left },
      { side: "right", distance: window.innerWidth - e.right },
    ].reduce(function (n, t) {
      return t.distance < n.distance ? t : n;
    });
  }
