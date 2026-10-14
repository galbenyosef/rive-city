// _player/hosted 04 — readdataattr
// Lines 332-453 of readable/_player/hosted.pretty.js (statement-aligned).
  function bindKeyboardInput(e) {
    const n = e.viewModelInstance,
      t = n && (n.viewModel("input") || n),
      o = t && t.number("moveX"),
      s = t && t.boolean("run");
    if (!o || !s) return;
    const u = Object.keys(KEY_COUNTERS)
        .map(function (r) {
          return { counter: t.number(r), codes: KEY_COUNTERS[r] };
        })
        .filter(function (r) {
          return r.counter;
        }),
      a = u.reduce(function (r, c) {
        return r.concat(c.codes);
      }, LEFT_CODES.concat(RIGHT_CODES)),
      i = {},
      l = function (r) {
        return r.some(function (c) {
          return i[c];
        });
      },
      m = function () {
        ((o.value = (l(RIGHT_CODES) ? 1 : 0) - (l(LEFT_CODES) ? 1 : 0)),
          (s.value = !!(i.ShiftLeft || i.ShiftRight)));
      };
    (window.addEventListener("keydown", function (r) {
      (r.target.closest && r.target.closest("#rive-drawer")) ||
        (a.includes(r.code) && r.preventDefault(),
        !r.repeat &&
          ((i[r.code] = !0),
          u.forEach(function (c) {
            c.codes.includes(r.code) && (c.counter.value += 1);
          }),
          m()));
    }),
      window.addEventListener("keyup", function (r) {
        ((i[r.code] = !1), m());
      }),
      window.addEventListener("blur", function () {
        (Object.keys(i).forEach(function (r) {
          i[r] = !1;
        }),
          m());
      }));
  }
  function resolveFit(e) {
    const n = readDataAttr(e, "fit", "layout");
    return fitFromUrl() || (FIT_MODES.includes(n) ? n : "layout");
  }
  function stateMachineName(e, n) {
    const t = e.getInstance(),
      o = n ? t.artboardByName(n) : t.defaultArtboard();
    if (!o) return;
    const s = o.stateMachineCount() ? o.stateMachineByIndex(0).name : void 0;
    return (o.delete(), s);
  }
  function watermarkDurationMs(e) {
    const n = e.getInstance().artboardByName("Watermark");
    if (!n) return 0;
    const t = n.animationByName("brandmark"),
      o = t ? (t.duration / t.fps) * 1e3 : 0;
    return (n.delete(), o);
  }
  function createInstance(e, n) {
    let t = !1;
    const o = readDataAttr(e, "artboard"),
      s = resolveFit(e),
      u = {
        riveFile: n,
        canvas: e,
        autoplay: !0,
        autoBind: !0,
        enableGPUCanvas: !0,
        enableMultiTouch: !0,
        stateMachine: readDataAttr(e, "state-machine") || stateMachineName(n, o),
        layout: new rive.Layout({
          fit: s,
          alignment: readDataAttr(e, "alignment", "center"),
        }),
        onLoad: function () {
          ((t = !0),
            instances.push({ instance: a, canvas: e }),
            resolveFit(e) !== s && applyFit(resolveFit(e)),
            hideStatus(),
            sendAnalytics(),
            (!document.activeElement ||
              document.activeElement === document.body) &&
              e.focus({ preventScroll: !0 }),
            window.setTimeout(function () {
              readDataAttr(e, "drawer") !== "none" &&
                !document.getElementById("rive-drawer") &&
                mountDrawer(resolveFit(e), readDataAttr(e, "drawer"));
            }, watermarkDurationMs(n)),
            bindKeyboardInput(a),
            a.resizeDrawingSurfaceToCanvas());
        },
        onLoadError: function () {
          showError("This animation could not be loaded.");
        },
      };
    (o && (u.artboard = o), e.hasAttribute("tabindex") || (e.tabIndex = -1));
    const a = new rive.Rive(u),
      i = function () {
        t && a.resizeDrawingSurfaceToCanvas();
      };
    typeof ResizeObserver == "function"
      ? new ResizeObserver(i).observe(e)
      : window.addEventListener("resize", i);
  }
  function loadCanvas(e) {
    const n = e.getAttribute("data-src");
    if (!n) return;
    const t = new rive.RiveFile({ src: n, enableGPUCanvas: !0 });
    t.init()
      .then(function () {
        createInstance(e, t);
      })
      .catch(function () {
        showError("This animation could not be loaded.");
      });
  }
