// _player/hosted 04 — addeventlistener
// Lines 332-453 of readable/_player/hosted.pretty.js (statement-aligned).
  function J(e) {
    const n = e.viewModelInstance,
      t = n && (n.viewModel("input") || n),
      o = t && t.number("moveX"),
      s = t && t.boolean("run");
    if (!o || !s) return;
    const u = Object.keys(M)
        .map(function (r) {
          return { counter: t.number(r), codes: M[r] };
        })
        .filter(function (r) {
          return r.counter;
        }),
      a = u.reduce(function (r, c) {
        return r.concat(c.codes);
      }, A.concat(k)),
      i = {},
      l = function (r) {
        return r.some(function (c) {
          return i[c];
        });
      },
      m = function () {
        ((o.value = (l(k) ? 1 : 0) - (l(A) ? 1 : 0)),
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
  function L(e) {
    const n = g(e, "fit", "layout");
    return H() || (h.includes(n) ? n : "layout");
  }
  function Q(e, n) {
    const t = e.getInstance(),
      o = n ? t.artboardByName(n) : t.defaultArtboard();
    if (!o) return;
    const s = o.stateMachineCount() ? o.stateMachineByIndex(0).name : void 0;
    return (o.delete(), s);
  }
  function Z(e) {
    const n = e.getInstance().artboardByName("Watermark");
    if (!n) return 0;
    const t = n.animationByName("brandmark"),
      o = t ? (t.duration / t.fps) * 1e3 : 0;
    return (n.delete(), o);
  }
  function $(e, n) {
    let t = !1;
    const o = g(e, "artboard"),
      s = L(e),
      u = {
        riveFile: n,
        canvas: e,
        autoplay: !0,
        autoBind: !0,
        enableGPUCanvas: !0,
        enableMultiTouch: !0,
        stateMachine: g(e, "state-machine") || Q(n, o),
        layout: new rive.Layout({
          fit: s,
          alignment: g(e, "alignment", "center"),
        }),
        onLoad: function () {
          ((t = !0),
            E.push({ instance: a, canvas: e }),
            L(e) !== s && R(L(e)),
            B(),
            _(),
            (!document.activeElement ||
              document.activeElement === document.body) &&
              e.focus({ preventScroll: !0 }),
            window.setTimeout(function () {
              g(e, "drawer") !== "none" &&
                !document.getElementById("rive-drawer") &&
                V(L(e), g(e, "drawer"));
            }, Z(n)),
            J(a),
            a.resizeDrawingSurfaceToCanvas());
        },
        onLoadError: function () {
          y("This animation could not be loaded.");
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
  function ee(e) {
    const n = e.getAttribute("data-src");
    if (!n) return;
    const t = new rive.RiveFile({ src: n, enableGPUCanvas: !0 });
    t.init()
      .then(function () {
        $(e, t);
      })
      .catch(function () {
        y("This animation could not be loaded.");
      });
  }
