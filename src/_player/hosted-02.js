// _player/hosted 02 — classlist
// Lines 95-224 of readable/_player/hosted.pretty.js (statement-aligned).
  function N(e, n, t, o) {
    const s = document.documentElement;
    let u = null,
      a = null;
    const i = function (c, w) {
        const d = e.getBoundingClientRect(),
          f = Math.min(
            Math.max(c, d.width / 2 + p),
            window.innerWidth - d.width / 2 - p,
          ),
          T = Math.min(
            Math.max(w, d.height / 2 + p),
            window.innerHeight - d.height / 2 - p,
          );
        ((a = { x: f / window.innerWidth, y: T / window.innerHeight }),
          s.style.setProperty("--drawer-x", f + "px"),
          s.style.setProperty("--drawer-y", T + "px"),
          e.classList.toggle("tips-below", T < 60));
      },
      l = function (c) {
        return c.clientX - n.getBoundingClientRect().left < F;
      },
      m = function (c) {
        i(c.clientX - u.x, c.clientY - u.y);
      },
      r = function () {
        ((u = null),
          window.removeEventListener("pointermove", m),
          window.removeEventListener("pointerup", r),
          window.removeEventListener("pointercancel", r));
        const c = x(e.getBoundingClientRect());
        (t(c.distance < O ? c.side : "float"),
          e.getBoundingClientRect(),
          e.classList.remove("dragging"));
      };
    (n.addEventListener("pointermove", function (c) {
      e.classList.toggle("on-grip", l(c));
    }),
      n.addEventListener("pointerdown", function (c) {
        if (c.button !== 0 || u !== null || !l(c)) return;
        const w = e.getBoundingClientRect(),
          d = w.left + w.width / 2,
          f = w.top + w.height / 2;
        ((u = { x: c.clientX - d, y: c.clientY - f }),
          o(!1),
          i(d, f),
          t("float"),
          e.classList.add("dragging"),
          window.addEventListener("pointermove", m),
          window.addEventListener("pointerup", r),
          window.addEventListener("pointercancel", r));
      }),
      window.addEventListener("resize", function () {
        a !== null &&
          e.isConnected &&
          i(a.x * window.innerWidth, a.y * window.innerHeight);
      }));
  }
  function G(e, n) {
    (n.addEventListener("pointerenter", function (t) {
      t.pointerType === "mouse" && e.classList.add("peek");
    }),
      n.addEventListener("pointerdown", function () {
        e.classList.add("peek");
      }),
      document.addEventListener("pointermove", function (t) {
        if (
          t.pointerType !== "mouse" ||
          !e.classList.contains("peek") ||
          e.classList.contains("dragging")
        )
          return;
        const o = e.getBoundingClientRect();
        (t.clientX < o.left - v ||
          t.clientX > o.right + v ||
          t.clientY < o.top - v ||
          t.clientY > o.bottom + v) &&
          e.classList.remove("peek");
      }),
      document.addEventListener("pointerdown", function (t) {
        !e.contains(t.target) && t.target !== n && e.classList.remove("peek");
      }));
  }
  function q(e, n, t) {
    const o = t.properties
      .filter(function (i) {
        return i.type === "boolean" && i.name.startsWith("hover");
      })
      .map(function (i) {
        return t.boolean(i.name);
      });
    let s = null,
      u = null;
    const a = function () {
      const i = o.some(function (m) {
        return m.value;
      });
      let l = s || (i ? t.string("tip").value : "");
      (l === "Hide" && e.classList.contains("hidden") && (l = "Dock"),
        (n.textContent = l),
        (n.style.left = t.number("tipX").value + "px"),
        n.classList.toggle("shown", !!l));
    };
    return (
      o.concat(t.string("tip")).forEach(function (i) {
        i.on(a);
      }),
      function (i) {
        ((s = i),
          a(),
          window.clearTimeout(u),
          (u = window.setTimeout(function () {
            ((s = null), (t.boolean("copied").value = !1), a());
          }, X)));
      }
    );
  }
  function j(e) {
    const n = document.documentElement;
    if (!n.requestFullscreen) {
      e("Not available here");
      return;
    }
    (document.fullscreenElement
      ? document.exitFullscreen()
      : n.requestFullscreen()
    ).catch(function () {
      e("Blocked");
    });
  }
