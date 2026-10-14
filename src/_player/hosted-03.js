// _player/hosted 03 — classlist
// Lines 225-331 of readable/_player/hosted.pretty.js (statement-aligned).
  function mountDrawer(e, n) {
    const t = document.createElement("aside");
    ((t.id = "rive-drawer"), t.setAttribute("aria-label", "Page controls"));
    const o = document.createElement("canvas");
    t.appendChild(o);
    const s = document.createElement("div");
    ((s.id = "rive-drawer-tip"), t.appendChild(s));
    const u = document.createElement("div");
    ((u.id = "rive-drawer-lip"),
      t.classList.add("offstage"),
      document.body.append(t, u),
      t.addEventListener("mousedown", function (i) {
        i.preventDefault();
      }));
    const a = new rive.Rive({
      src: DRAWER_SRC,
      canvas: o,
      autoplay: !0,
      autoBind: !0,
      stateMachines: "Drawer",
      layout: new rive.Layout({ fit: "contain" }),
      onLoad: function () {
        const i = a.viewModelInstance;
        i.number("fit").value = FIT_MODES.indexOf(e);
        const l = a.bounds;
        ((o.style.width = l.maxX - l.minX + "px"),
          (o.style.height = l.maxY - l.minY + "px"),
          a.resizeDrawingSurfaceToCanvas(),
          (drawerInstance = a));
        const m = setupTip(t, s, i),
          r = function (d) {
            (t.setAttribute("data-side", d),
              (i.number("edgeAngle").value = EDGE_ANGLES[d]));
          };
        r("bottom");
        const c = function (d) {
          (d &&
            t.getAttribute("data-side") === "float" &&
            r(nearestEdge(t.getBoundingClientRect()).side),
            t.classList.toggle("hidden", d),
            t.classList.remove("peek"),
            (i.boolean("hidden").value = d));
        };
        if (
          (a.on(rive.EventType.RiveEvent, function (d) {
            const f = d.data.name;
            FIT_EVENTS[f]
              ? (applyFit(FIT_EVENTS[f]), (i.number("fit").value = FIT_MODES.indexOf(FIT_EVENTS[f])))
              : f === "fullscreen"
                ? toggleFullscreen(m)
                : f === "copy" && navigator.clipboard
                  ? navigator.clipboard.writeText(window.location.href).then(
                      function () {
                        ((i.boolean("copied").value = !0), m("Copied"));
                      },
                      function () {
                        m("Copy blocked");
                      },
                    )
                  : f === "toggleHidden"
                    ? c(!t.classList.contains("hidden"))
                    : f === "remove"
                      ? (t.remove(),
                        u.remove(),
                        (drawerInstance = null),
                        window.setTimeout(function () {
                          a.cleanup();
                        }))
                      : f === "build" && window.open(RIVE_APP_URL, "_blank", "noopener");
          }),
          makeDraggable(t, o, r, c),
          setupPeek(t, u),
          n === "docked")
        ) {
          t.classList.remove("offstage");
          return;
        }
        if (n === "hidden" || window.innerWidth < MOBILE_WIDTH) {
          (c(!0), t.classList.remove("offstage"));
          return;
        }
        const w = function () {
          t.classList.remove("offstage");
          const d = window.setTimeout(function () {
            (c(!0), t.matches(":hover") && t.classList.add("peek"));
          }, DRAWER_REVEAL_MS);
          t.addEventListener("pointerdown", function () {
            window.clearTimeout(d);
          });
        };
        document.hidden
          ? document.addEventListener("visibilitychange", w, { once: !0 })
          : w();
      },
      onLoadError: function () {
        (t.remove(), u.remove());
      },
    });
  }
  const LEFT_CODES = ["ArrowLeft", "KeyA"],
    RIGHT_CODES = ["ArrowRight", "KeyD"],
    KEY_COUNTERS = {
      jumpCount: ["Space", "ArrowUp", "KeyW"],
      downCount: ["ArrowDown", "KeyS"],
      actCount: ["KeyE", "Enter"],
      backCount: ["Escape"],
    };
