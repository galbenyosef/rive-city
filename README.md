# RIVE CITY — offline mirror

Full mirror of **RIVE CITY** — a cinematic Rive WebGL2 city scene served by the
rive.to hosted player.

Source: https://rive-city-j6lc8r.uat.rive.to/

![RIVE CITY](docs/cover.png)

## Stack

- **Rive WebGL2 runtime** — `https://cdn.jsdelivr.net/npm/@rive-app/webgl2@2.x.x/rive.js`
  is loaded by the entry document and **stays a CDN dependency** (standing vendor
  rule: a CDN dependency is not backfilled into the capture; today the URL resolves
  to a 559,005 B bundle). Without internet the page cannot boot its runtime — the
  29.6 MB scene itself is captured locally.
- **rive.to hosted-player glue** — `_player/hosted.js`, one minified IIFE: finds
  `canvas[data-src]`, loads the `.riv` through `rive.RiveFile`, drives fit modes
  (`layout` / `contain` / `cover`), keyboard input (moveX/run/jump counters),
  the resolution watcher, and the page-controls drawer.
- **Two binary Rive artboards** — `file.riv` (the city scene + watermark) and
  `_player/drawer.riv` (the drawer controls UI: fit buttons, fullscreen, copy,
  hide, remove, build).
- **No framework, no build step** — static HTML, one IIFE, one stylesheet.

## What this is

RIVE CITY (rive-city-j6lc8r.uat.rive.to) is a **Rive demo deployment on the rive.to
hosted player** (UAT): a continuously animating, cinematic flythrough of a fog-lit
city — skyscraper canyons, flying cars with red light streaks, rooftop details — with
the RIVE / "ENTER THE CITY" wordmark baked into the artboard, and a dockable
page-controls drawer rendered from a second `.riv`. It is an **interactive artboard,
not a game**: the scene autoplays and loops; interaction is the player chrome (fit
mode, fullscreen, copy link, hide/remove/dock the drawer) plus pointer/keyboard input
wired into the artboard's view model. Captured whole — entry, player JS/CSS, favicon
and both Rive payloads: **6 files, 29,657,691 bytes (~28.3 MiB)**, dominated by
`file.riv` (29,616,149 B).

**UAT / ephemeral note:** the origin is a Rive **UAT** deployment (`rive-city`, id
`j6lc8r`) — UAT deploys are ephemeral by nature and may vanish or change without
notice. This mirror is the point-in-time capture (2026-10-12); the drift probe
documents what changed while the deploy lived.

External at runtime: the jsdelivr `rive.js` script (stays CDN, above),
a `preconnect` hint to `unpkg.com` (nothing is ever fetched from it), the
`POST /_v?…` analytics beacon (host-side, 204, not content), and the drawer's
build button which opens `https://rive.app/` in a new tab. No same-origin
reference is left uncaptured.

## Layout

- `index.html` — the served entry document (origin root; served path == disk path)
- `_player/` — `hosted.js` (player glue IIFE), `hosted.css`, `drawer.riv` (controls
  artboard), `favicon.ico`
- `file.riv` — the city scene payload (root-served, fetched by the player)
- `.upstream/manifest.json` — sha256 for every captured file
- `readable/` — prettified derived layer (pinned prettier 3.9.6), **mirroring the
  served path**: `readable/_player/hosted.pretty.js` (the player IIFE) and
  `readable/_player/hosted.pretty.css` (the stylesheet)
- `src/` + `split-spec.json` — statement-aligned slices of the player IIFE with
  the recorded derivation spec: `src/_player/hosted-01.js` … `-05.js`, with
  semantic identifiers (PLAN §5 rename campaign)
- `rename-map.json` — the recovered semantic rename map (word-boundary +
  token-index records) `src/` is re-cut through
- `tools/names.json` — the authored rename rules (capture rel → {minified: semantic})
- `tools/derive.mjs` — rebuild `readable/` + `src/` + `split-spec.json`
  (re-applies `rename-map.json`)
- `tools/apply-names.mjs` — apply `tools/names.json` to the pristine `src/` slices
- `tools/recover-scoped-map.mjs` — recover `rename-map.json` from the committed slices
- `tools/verify-rename.mjs` / `tools/check-chunk.mjs` — rename-layer gates
- `tools/update.mjs` — read-only drift probe against the live origin
- `tools/verify.mjs` — re-hash the capture against the manifest
- `tools/audit.js` — integrity gate for the derived layers (`AUDIT PASS`)
- `tools/check-links.mjs` — link gate: every scope of the derived layer exports
  only names the layer declares
- `tools/serve.mjs` — loopback static server for the serve/boot probe
- `legacy/2026-10-14/` — the superseded flattened derived layers (pre served-path)
- `_mirror-report.json` — capture record (requests, fetches, external gaps)

## Assets

- **scenes (binary Rive artboards)** — 2 file(s): `file.riv` (the city scene,
  29,616,149 B), `_player/drawer.riv` (page-controls UI artboard, 9,513 B)
- **styles** — 1 file: `_player/hosted.css`
- **icons** — 1 file: `_player/favicon.ico`
- **audio** — none — the scene is silent (no audio files, no audio fetch)
- **fonts** — none as files: the RIVE wordmark/letters are vector art baked into
  the artboards (no font file is shipped or fetched)
- **data/document** — `index.html` (the entry document)

## Run

Serve the repo root through any static file server (the capture is a static site;
no build step). The entry is served at `/` and `_player/` + `file.riv` must sit
next to it, exactly as captured:

```
npx serve .
```

Then open `http://localhost:3000/` (needs internet for the CDN `rive.js`; the
scene payload loads from the local capture). Booting takes ~30-45 s — `file.riv`
is 29.6 MB and decodes into ~50 MB of WebGL textures.

## Verify

```
node tools/verify.mjs            # re-hash the capture against the manifest
node tools/audit.js              # derived-layer integrity gate (AUDIT PASS)
node tools/verify-rename.mjs --all   # every slice reproduces through rename-map.json
node tools/check-chunk.mjs --all     # cross-slice calls still resolve after renames
node tools/check-exports.mjs     # the derived layer still exports every public name
node tools/check-links.mjs       # every scope of the derived layer exports only names the layer declares
node tools/derive.mjs            # re-cut readable/ + src/ + split-spec.json (reproducible)
```

`check-links.mjs` guards the one class the export-name gate cannot see: a
layer file whose export statement names a binding the layer never declares is
a hard SyntaxError at link time, and the file cannot be imported at all. The
layer here is a CLASSIC-SCRIPT layer — five slices cut from one readable
module, the body of a single IIFE, with the wrapper's opening and closing
recorded as skipped sections — and it carries no export statement anywhere, so
the class is structurally absent today and the gate says so (1 scope, 0 export
tables). It is deployed because it is this mirror's only watch on the export
side of the layer, and it fires the moment a slice carries an export table
that names a binding the module does not declare. The gate also knows the
mirror's capture: a file at the mirror root that the capture manifest claims
is the served capture, never a layer file.


## Updating from upstream

```
node tools/update.mjs     # read-only drift probe: what changed upstream
```

The probe never rewrites the capture — a mirror is a point-in-time snapshot.
**The origin is a UAT deploy on rive.to: it may be gone at any time.** When it is,
the probe reports `live-missing` / `HTTP 404` for every file — that is expected and
still documents what the deploy served while it lived. Refreshing (while the deploy
is up) means re-fetching the full closure into a fresh tree and re-cutting the
readable/src layers on top of the new bytes.

### 2026-10-12 derivation + boot record

Both derived layers are in place, cut from the recorded capture (capture bytes
untouched — `node tools/verify.mjs` re-hashes all 6 files, `0 problems`):

- `readable/` — pinned prettier 3.9.6 (module API, default options, single pass
  verified idempotent — never the CLI, it respects `.gitignore` and can silently
  echo its input) rendered the player IIFE to `readable/_player/hosted.pretty.js`
  (495 lines) and the stylesheet to `readable/_player/hosted.pretty.css`
  (269 lines); the derived layers **mirror the served path** (capture root ==
  repo root — `DISK_PREFIX ""`), so the real `_player/` subdirectory and the
  served filename are kept (PLAN §5 served-path rule). Both pretties are
  provably not byte copies of their sources and re-render byte-exact.
- `src/` — **5 statement-aligned slices** (`src/_player/hosted-01.js` …
  `-05.js`, exact 2-line provenance header) of the IIFE **body**, recorded in
  `split-spec.json` (8 sections): the whole app is one `(function(){…})()`
  expression, so the wrapper opener + `"use strict"` (lines 1-2) and the `})();`
  closer (line 495) are **skipped sections** (non-standalone), and everything
  between is sliced at top-level declaration boundaries — 5/5 parse standalone
  (`node --input-type=module --check -`) and round-trip byte-exact to their
  readable line ranges through the recorded rename map. Window size is ~100-140
  lines (a recorded divergence from the fleet's 250-350 window: the whole app is
  496 readable lines and the larger window would yield only two slices). This is
  a player-host glue file — there is no game/app JS to reverse beyond it, so
  `src/` is legitimately small.
- Binary/non-code payloads are **hashed `notRendered` records**, never sliced:
  `file.riv`, `_player/drawer.riv`, `_player/favicon.ico` (bytes + sha256, matched
  by the audit against the capture). The stylesheet is a wholeFile section
  (stylesheet rule). The CDN `rive.js` stays CDN and is not in the capture.
- The entry document references external scripts only (CDN `rive.js` +
  `/_player/hosted.js`) — zero inline `<script>`/`<style>` content blocks, so
  there are no `*-inline-N` twins and no `index-inline-map.json`.
- Closure: the `.riv` payloads were found from the entry document
  (`canvas data-src="/file.riv"`, `preload`) and from a string scan of
  `hosted.js` (`"/_player/drawer.riv"`), and the runtime fetches were confirmed
  with an opencli browser network log while the player booted (GET `/file.riv`
  200, GET `/_player/drawer.riv` 200, POST `/_v?…` 204; the `blob:` URLs in the
  log are in-memory decoded images, not files).
- Gates: `node tools/verify.mjs` → `6 files checked, 0 problems`;
  `node tools/audit.js` → `AUDIT PASS` (5/5 round-trips, 2/2 pretties re-render
  byte-exact, 3/3 binary records match the capture, 2/2 skipped wrapper sections
  re-verified). Serve probe — mirror root served on loopback, `/`, `/_player/hosted.js`,
  `/_player/hosted.css`, `/_player/favicon.ico`, `/_player/drawer.riv` and `file.riv`
  all over HTTP 200 with exact capture byte counts; listener PID killed, port 8731
  proven closed (netstat + connection refused).
- Boot test: the mirror was booted in the opencli browser on loopback — the WebGL2
  canvas draws the same scene as the live origin (city flythrough, flying cars, the
  RIVE wordmark), the drawer mounts after the watermark animation, and interaction
  was exercised (pointer hover/click on the drawer controls → "Copy URL" tip state;
  the drawer is draggable/dockable per the host script). Evidence:
  `docs/boot-2026-10-12.png` (active scene) and `docs/cover.png` (scene in play with
  the controls drawer visible). It is an interactive non-game artboard — the cover
  shows the scene in its most active state, honestly, not a menu or loading shot.
- §0.4 fork-over-mirror checked 2026-10-12: the page, the player JS and both `.riv`
  payloads carry **no public source-repo reference** (scanned for github.com /
  gitlab / sourceMappingURL — none); the only outbound product link is
  `https://rive.app/` (the drawer's build button), and `rive.to` redirects to the
  rive.app marketing site with no repo reference either. No forkable upstream repo
  exists, so the mirror stands.

### 2026-10-14 structure + served-path + rename campaign

The capture bytes are unchanged (the 29.6 MB `file.riv` is the whole scene; the
only JS is the player IIFE — there is no inline runtime, the Rive runtime is the
CDN `rive.js` global, not an import). This pass converged the derived layers
toward the real project shape:

- **Served-path mirroring (PLAN §5).** `readable/` and `src/` now keep the served
  subdirectory + filename (`readable/_player/hosted.pretty.js`,
  `src/_player/hosted-01.js` …) instead of the flattened `_player__hosted` form
  (taipei-rush-tokyo precedent). The superseded flattened layers are archived
  byte-for-byte under `legacy/2026-10-14/{src,readable}/` + `legacy/2026-10-14/split-spec.json`.
- **Rename campaign (PLAN §5).** All **40 program-scope (IIFE-body) bindings** of
  `_player/hosted.js` are renamed to semantic names in `tools/names.json`
  (`g→readDataAttr`, `V→mountDrawer`, `M→KEY_COUNTERS`, `P→init`, …), applied by
  `tools/apply-names.mjs` (IIFE-aware app scope: the app's top-level bindings live
  in the IIFE callee's function scope, one level below the literal program), and
  recovered by `tools/recover-scoped-map.mjs` into `rename-map.json` — **75
  word-boundary records + 1 token-index record** (`x` in slice 02 sits where `x`
  is also a property access `u.x`, so it is addressed by exact token index). The
  local minified names inside functions (`e`, `n`, `t`, …) are not renamed (they
  are per-scope scratch bindings), and the binary `.riv` payloads and the CDN
  runtime are never candidates.
- **derive re-applies the map** (`apply -> recover -> derive -> gates`): a re-cut
  reproduces the committed renamed slices byte-for-byte, and `tools/audit.js`
  re-proves every slice through `rename-map.json` (never weakened).
- Gate tails (2026-10-14):

```
$ node tools/verify.mjs
6 files checked, 0 problems

$ node tools/verify-rename.mjs --all
readable/_player/hosted.pretty.js: 5 slice(s), 5 renamed, reproduces: 5/5, references ok: YES, bindings ok: YES
verify-rename: 5/5 slice(s) reproduce byte-exact, 5 renamed slice(s) (1 indexed occurrence(s)), 1/1 chunk(s) references+bindings YES

$ node tools/check-chunk.mjs --all
readable/_player/hosted.pretty.js: 5 ranged slice(s) (7 section(s) in the reconstruction), 5 substituted
  cross-slice calls resolve: YES
check-chunk: 1 chunk(s), 5 slice body(ies) substituted — all cross-slice calls resolve

$ node tools/audit.js
AUDIT PASS — 8 spec sections (5/5 src↔pretty round-trips byte-exact through the recorded rename map, 5 renamed slice(s) re-proved from rename-map.json (1 indexed map(s) honest), 2/2 pretty sources tiled contiguously, 2/2 skipped IIFE-wrapper sections re-verified textually, 5/5 src slices + 1/1 readable/*.pretty.js parse standalone (node --input-type=module --check -), 2/2 pretties provably distinct from their capture source, 3/3 binary payload records match the capture bytes, 3 index-only wholeFile/skipped sections carry no src file, 0 inline content block(s) (no twins needed), 0/0 imports resolve inside the capture (0 whitelisted machinery), 2/2 pretties re-render byte-exact under pinned prettier 3.9.6, capture manifest free of derived layers)

$ node tools/record-manifest.mjs --check
record-manifest --check: PASS — 6 capture file(s) recorded, walk agrees byte-for-byte, no derived path leaked
```

  `node tools/derive.mjs` re-run is byte-identical (`src/` + `readable/` +
  `split-spec.json` hashed before/after — no diff). Serve probe: all 6 served
  paths over HTTP 200 with exact capture byte counts (listener PID killed, port
  8731 closed). The rename task is **closed** as far as the bytes allow.
- Drift probe (2026-10-14): `node tools/update.mjs` → `up to date: 6 captured
  files identical upstream` — the UAT deploy is still live today and its bytes
  match the capture exactly (it may vanish at any time; the probe is read-only
  and never rewrites the capture).
- Honest gaps: the app surface is tiny by construction — a rive.to hosted-player
  harness, not a game — so the rename campaign has exactly 40 top-level names to
  name (no module graph, no authored sources to recover). The minified local
  scratch bindings inside functions (`e`, `n`, `t`, …) and the two binary `.riv`
  artboards are left as-is: there is nothing to name them from beyond their use
  sites, and the `.riv` payloads are binary scene data, not code.

### 2026-10-20 rename-layer re-sync (PLAN §5 campaign, current fleet guards)

The 40-name worklist in `tools/names.json` was re-run end to end under the
mirror's toolchain re-synced from the fleet's current set
(`mirrors-standard/templates/rename-campaign/`). The guards the fleet gained
after this mirror's 2026-10-14 pass are now the ones that judge its names:

- **(ah)** — the program scope is re-rooted at a top-level IIFE callee ONLY
  when the *entire* program is one expression statement calling a function, so
  a flat module keeps the literal program scope. This capture **is** one
  whole-program IIFE (`(function () { … })();`), so the re-rooting that puts the
  app's 40 bindings in reach stands; the guard only refuses the loose shape.
- **(aj)** — a labeled statement's *body* is walked (the label identifier is a
  name position and is skipped). Without it, an identifier inside a labeled loop
  could be renamed at some references and not others.
- **wonderforge** (engine) — `...HM(c)` is a *call*, not a property read; the
  property-access guard no longer matches the third dot of a spread, which used
  to demote a clean word-boundary rename to the index-addressed map.

The per-mirror adaptations are kept as they were: the `app` rule set stays
keyed by **capture rel** (`_player/hosted.js` — the fleet idiom, this capture
has one app chunk), the marker stop-list keeps `rive` (the runtime global must
not dominate slice markers), and no name was added, removed or substituted.

**Result: 40 of 40 names applied, 0 refused.** The writer's preflight judges
every program-scope binding of the chunk ELIGIBLE, `apply-names --all` writes
**114 identifier splices** and reproduces every committed slice byte-for-byte,
`recover-scoped-map.mjs` re-recovers `rename-map.json` byte-identically (75
word-boundary records + 1 indexed record), and `derive.mjs` re-cuts `src/` +
`readable/` + `split-spec.json` byte-identically. The guard re-sync changed no
output — it only strengthened the judgement. Gate tails (2026-10-20):

```
$ node tools/apply-names.mjs --list
app chunk _player/hosted.js (readable/_player/hosted.pretty.js): 40 program-scope name(s), 40 ELIGIBLE, 0 refused

$ node tools/apply-names.mjs --all
_player/hosted-01.js: no change (already applied)
… (5/5 slices)
apply-names: 5 file(s) visited, 0 changed, 0 rule group(s), 114 identifier splice(s) (app: 40 name(s) over 1 chunk(s), 114 splice(s))

$ node tools/verify-rename.mjs --all
readable/_player/hosted.pretty.js: 5 slice(s), 5 renamed, reproduces: 5/5, references ok: YES, bindings ok: YES
verify-rename: 5/5 slice(s) reproduce byte-exact, 5 renamed slice(s) (1 indexed occurrence(s)), 1/1 chunk(s) references+bindings YES

$ node tools/check-chunk.mjs --all
readable/_player/hosted.pretty.js: 5 ranged slice(s) (7 section(s) in the reconstruction), 5 substituted
  cross-slice calls resolve: YES
check-chunk: 1 chunk(s), 5 slice body(ies) substituted — all cross-slice calls resolve

$ node tools/refcheck.mjs          # no shadowing / duplicate / shorthand drift — clean
$ node tools/derive.mjs --check    # re-derives in a throwaway scratch copy outside the mirror and compares with the committed tree — byte-identical, writes nothing
$ node tools/audit.js
AUDIT PASS — 8 spec sections (5/5 src↔pretty round-trips byte-exact through the recorded rename map, 5 renamed slice(s) re-proved from rename-map.json (1 indexed map(s) honest), 2/2 pretty sources tiled contiguously, 2/2 skipped IIFE-wrapper sections re-verified textually, 5/5 src slices + 1/1 readable/*.pretty.js parse standalone (node --input-type=module --check -), 2/2 pretties provably distinct from their capture source, 3/3 binary payload records match the capture bytes, 3 index-only wholeFile/skipped sections carry no src file, 0 inline content block(s) (no twins needed), 0/0 imports resolve inside the capture (0 whitelisted machinery), 2/2 pretties re-render byte-exact under pinned prettier 3.9.6, capture manifest free of derived layers)

$ node tools/verify.mjs
6 files checked, 0 problems

$ node tools/record-manifest.mjs --check
record-manifest --check: PASS — 6 capture file(s) recorded, walk agrees byte-for-byte, no derived path leaked
```

Serve probe: all 6 served paths over HTTP 200 with exact capture byte counts
(`/` 908, `_player/hosted.js` 10 132, `_player/hosted.css` 5 903,
`_player/favicon.ico` 15 086, `_player/drawer.riv` 9 513, `file.riv`
29 616 149) — listener killed, port closed.

- **Drift (2026-10-20):** the UAT deploy is still live and `_player/hosted.js`
  has been rebuilt upstream — 10 170 B vs the captured 10 132 B
  (sha `a30c3820…` vs `b2395675…`). The 35 differing pretty lines are all the
  minifier's short-name reassignment (`D↔I`, `H↔F`, `W↔z`, `O↔Y`, …) on
  identical logic — the app was rebuilt, not changed. The capture is **not**
  refreshed: a mirror is a point-in-time snapshot, and the 40 semantic names
  are bound to the captured bytes.

## Boot test (2026-10-27)

- Entry: `http://127.0.0.1:4925/` served by `tools/serve.mjs` with the network blocked (`MAP * 127.0.0.1`).
- Outcome: **blocked** — the status overlay stayed on its error state reading "This animation could not be loaded." and the canvas remained at its default size; the CDN runtime never loaded.
- Evidence: body 35 chars (the error string, not content); canvas 300x150 (default, never sized by the player); 0 console errors; 0 failed same-origin requests, 1 blocked cross-origin (`https://cdn.jsdelivr.net/npm/@rive-app/webgl2@2.x.x/rive.js`, transferSize 0); screenshot `docs/boot-2026-10-27.png`.
- Gaps seen: none — `/`, `/_player/hosted.css`, `/_player/hosted.js`, `/_player/favicon.ico` and `/file.riv` all loaded 200 from the capture; the only failure is the documented CDN `rive.js`, which is expected under the offline rule.

This confirms the mirror's standing claim: the capture is complete (the 29.6 MB scene loads locally) but the page cannot boot its Rive runtime without internet, because `rive.js` stays a CDN dependency. The 2026-10-12 online boot record above still stands; this test only proves the offline boundary.

### 2026-10-31 drift probe + offline boot — refused refresh (trust gate)

Census: **1 changed of 6 checked, 0 missing**. The changed file is
`_player/hosted.js` — a third upstream rebuild of the player glue, and **not**
rotating noise: it is 10 950 B / sha `c43cf207…` against the captured 10 132 B /
`b2395675…` (`last-modified Sat, 24 Oct 2026 04:30:01 GMT`, CloudFront/S3,
`content-type: application/javascript`). The other five files are byte-identical
upstream, `index.html` included, so this is not a soft-404 shell or a
nonce-token artifact.

What the rebuilt glue actually adds (532 readable lines vs 496, pinned prettier,
idempotent): a **runtime loader** — `B()` walks jsdelivr candidates and `T()`
injects a `<script>` (prefers `@rive-app/webgl2-threads@2.x.x` when
`window.crossOriginIsolated`, honours a `?runtime=x.y.z` pin, falls back on
`onerror`); `focusOptions: { allowFocusInterrupt: true }` plus a
`canvas.focus({preventScroll})` on load; and `data-muted` support that holds
`volume = 0` until a **trusted** pointerdown/keydown. Real feature drift, not a
minifier short-name reshuffle.

**Nothing was written.** The mandatory trust gate is not satisfiable for this
capture: a dry run against the live origin reproduces **5/6 files byte-for-byte**
(`file.riv` 29 616 149 B, `_player/drawer.riv` 9 513 B, `_player/favicon.ico`
15 086 B, `_player/hosted.css` 5 903 B, `index.html` 908 B — the capture path is
faithful), but `_player/hosted.js` is **still served and no longer matches the
current capture**, which is precisely the gate's stop condition. The blocker is
structural, not a missing tool: the derived layer is bound to the captured bytes.
Re-deriving the refreshed file with the mirror's own tool fails hard —

```
$ node tools/derive.mjs
Error: rename map addresses token 278 as "x" but the range has id("k")
```

`rename-map.json` (75 word-boundary records + 1 token-index record) and the
`split-spec.json` section ranges (cut against the 496-line pretty) are keyed on the
old build's identifiers, and `tools/names.json`'s 40 semantic names are authored
against them. Refreshing `hosted.js` therefore requires **re-authoring the rename
campaign**, not a mechanical re-cut; a silent re-cut would mis-bind names and
would fail `audit.js`/`verify-rename.mjs`. Consistent with the mirror's
point-in-time policy (2026-10-20 entry: a rebuild is recorded, not absorbed), the
capture stays at the 2026-10-12 bytes and the drift is documented here.

Gates on the untouched tree (2026-10-31):

```
$ node tools/verify.mjs                 -> 6 files checked, 0 problems
$ node tools/audit.js                   -> AUDIT PASS (9 spec sections)
$ node tools/verify-rename.mjs --all    -> 5/5 slices reproduce byte-exact, references/bindings YES
$ node tools/check-chunk.mjs --all      -> 5 slices substituted, cross-slice calls resolve
$ node tools/check-exports.mjs          -> 0 export tables, no public name lost
$ node tools/check-links.mjs            -> every export table names a declared binding: YES
$ node tools/refcheck.mjs               -> clean
$ node tools/derive.mjs --check         -> DERIVE CHECK PASS (scratch copy inside the workspace tmp/, nothing written)
$ node tools/record-manifest.mjs --check -> PASS, 6 capture files, no derived path leaked
```

Offline boot (2026-10-31): served by `tools/serve.mjs` on
`http://127.0.0.1:4747/`, headless Chromium with
`--host-resolver-rules="MAP * 127.0.0.1"`. All six capture paths answered
HTTP 200 with exact capture byte counts. Outcome: **blocked as expected** — body
text 45 chars (`rive-city This animation could not be loaded.`), `<canvas
data-src="/file.riv">` still unsized (no `width`/`height`, default 300×150), no
`#rive-drawer` mounted, because the CDN `rive.js` runtime is unreachable with the
network mapped away. The listener was stopped and port 4747 proven closed
(`netstat` no LISTENING, `curl` exit 000). Evidence:
`docs/boot-2026-10-31-refresh.png`.

## Mirror conventions

- **Capture layer** — the captured files are byte-exact copies of what the origin
  served; nothing in them is edited.
- **Readable layer** — `readable/` is derived (prettified) and never shipped to a
  browser; it exists so the bundle can actually be read.
- **Provenance** — `.upstream/manifest.json` records sha256 for each captured
  artifact, and `tools/verify.mjs` re-checks it.
- **Drift** — `tools/update.mjs` is read-only: it reports what changed upstream
  and never rewrites the capture.
- **Vendor/CDN** — the rive.js CDN dependency stays CDN; it is documented, not
  backfilled. Vendor bytes are never re-minified or re-hosted.

## Fleet status

<!-- mirror-status:start — feeds _standard/REPO-INDEX.md. Update ONLY your own mirror's block; never edit the shared index (PLAN §8). Rebuild: node _standard/build-index.mjs -->
<!-- cols: cls=classification · ver=verify 0 problems · upd=drift probe · man=manifest · rdbl=readable re-derived · src=reversed src · boot=boot test · top=offline-mirror topic · tag=backup tag · staged=staged not committed -->
| # | repo | cls | ver | upd | man | rdbl | src | boot | top | tag | staged |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 290 | rive-city | mirror | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
<!-- mirror-status:end -->
