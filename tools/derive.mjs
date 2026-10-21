// derive.mjs — rebuild the derived layers (readable/ + src/ + split-spec.json)
// from the rive-city capture (PLAN §3/§5). RIVE CITY
// (https://rive-city-j6lc8r.uat.rive.to/) is capture-class: a Rive hosted-player
// deployment (rive.to UAT) whose entire app is one minified IIFE
// (_player/hosted.js) plus two binary Rive scene payloads (file.riv — the city
// artboard — and _player/drawer.riv — the page-controls artboard) and the
// player stylesheet. §0.4 fork-over-mirror was checked on 2026-10-12: the page
// and its JS carry no public source-repo reference (the only outbound link is
// https://rive.app/ from the drawer's "build" button), so the mirror stands.
// The capture is untouched; every source file is re-hashed against
// .upstream/manifest.json before it is rendered, so a drifted capture fails
// loudly instead of being silently re-derived.
//
// Pipeline:
//   _player/hosted.js -> pinned prettier 3.9.6 (module API — the CLI respects
//                        .gitignore and can silently echo its input), single
//                        pass, verified idempotent -> readable/_player/hosted.pretty.js
//                        (capture root is the repo root — DISK_PREFIX "" — so the
//                        served path IS the disk path and the derived layers MIRROR
//                        it: real subdirectories + served filename kept).
//   _player/hosted.css -> readable/_player/hosted.pretty.css, wholeFile
//                        section (stylesheet rule: stylesheets are never sliced).
//   the minified IIFE    -> statement-aligned slices src/_player/hosted-NN.js at the
//                        top-level declaration boundaries of the IIFE BODY
//                        (the whole file is one `(function(){…})()` expression,
//                        so the wrapper open/close lines are non-standalone and
//                        are indexed as skipped sections). Windows are ~100-140
//                        lines here (the whole app is 496 readable lines; the
//                        dead-world fleet window of 250-350 would yield only
//                        two slices — recorded divergence). Every slice parses
//                        standalone with `node --input-type=module --check -`
//                        and round-trips byte-exact to its readable line range
//                        through the recorded semantic rename map (rename-map.json
//                        re-applied on every re-cut; apply -> recover -> derive -> gates).
//   binary payloads      -> hashed notRendered records (file.riv, drawer.riv,
//                        favicon.ico): no pretty pass, sha256 + bytes only.
//   entry document       -> inline <script>/<style> scan (byte ranges + sha256):
//                        index.html references external scripts only (the CDN
//                        rive.js and /_player/hosted.js) — zero inline content
//                        blocks, so there are no *-inline-N twins.
//
// The CDN dependency https://cdn.jsdelivr.net/npm/@rive-app/webgl2@2.x.x/rive.js
// stays CDN (standing vendor rule: a CDN dependency is not backfilled into the
// capture); it is recorded in README.md and split-spec.json, not fetched.
//
// src/ identifiers are semantic names from the PLAN §5 rename campaign where the
// bytes allow (tools/names.json + tools/apply-names.mjs -> rename-map.json);
// binary .riv payloads stay hashed records. usage:
//   node tools/derive.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyRecordedMap } from "./engine/rename-layer.mjs";
// ── --check: prove the committed derived layer is current, writing NOTHING ─
// This tool used to ignore its command line entirely, so `node tools/derive.mjs
// --check` was a full in-place re-derivation: it rewrote readable/ + src/ +
// split-spec.json and (on a mirror whose derive does not re-apply the recorded
// rename map) stripped the rename layer off src/ -- damage that looks
// legitimate, because the files still parse. --check now runs the mirror's
// documented rebuild chain in a throwaway scratch copy OUTSIDE the mirror and
// compares the result with the committed tree; it writes nothing here.
if (process.argv.includes("--check")) {
  const { runDeriveCheck } = await import("./derive-check.mjs");
  process.exit(await runDeriveCheck());
}

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, "..");
const PINNED = "3.9.6";
const MIN_WINDOW = 100;
const MAX_WINDOW = 140; // small app: the whole hosted.js is one 496-line IIFE
const TODAY = "2026-10-12";

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const readLines = (abs) => {
  const t = fs.readFileSync(abs, "utf8");
  const l = t.split("\n");
  if (l.length && l[l.length - 1] === "") l.pop();
  return l;
};
const linesOf = (text) => text.replace(/\n$/, "").split("\n");
const lineOf = (text, offset) => text.slice(0, offset).split("\n").length;

// capture-relative name -> readable twin name. The capture root is the repo
// root (DISK_PREFIX ""), so the served path IS the disk path and the derived
// layers MIRROR it: real subdirectories and the served filename are kept
// (PLAN §5, served-path rule — taipei-rush-tokyo precedent, 2026-10-14).
const tagOf = (capRel) => capRel.replace(/\.(js|css)$/i, "");
const prettyRelFor = (capRel) =>
  "readable/" + tagOf(capRel) + (/\.css$/i.test(capRel) ? ".pretty.css" : ".pretty.js");

// write a derived file at its repo-relative posix path, creating subdirs
function writeDerived(rel, text) {
  const abs = path.join(proj, rel.split("/").join(path.sep));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text);
}

// ── recorded semantic rename map (optional input; see engine header) ────
// derive re-cuts src/ BY RE-APPLYING this map, so a re-cut reproduces the
// committed (renamed) slices byte-for-byte — the pipeline order is
// apply -> recover -> derive -> gates.
function loadRenameMap() {
  const p = path.join(proj, "rename-map.json");
  if (!fs.existsSync(p)) return { files: {}, scoped: {}, present: false };
  const rm = JSON.parse(fs.readFileSync(p, "utf8"));
  return { files: rm.files || {}, scoped: rm.scoped || {}, present: true };
}
const recordsFor = (rm, srcRel) => {
  const files = rm.files[srcRel];
  const scoped = rm.scoped[srcRel];
  if (!files && !scoped) return null;
  return { files, scoped };
};
// The authored binding map (tools/names.json): chunk capture rel -> {old: new}
// for the chunk's top-level bindings. Recorded into split-spec per source as
// `renameBindings` (only the rules that actually fired) so the reconstruction
// gates can rename index-only skipped sections too — their local-side names
// reference the renamed bindings and are not part of any src slice (proposal
// (t)(1)). Empty here (the wrapper sections carry no bindings), but carried.
function loadNames() {
  const p = path.join(here, "names.json");
  if (!fs.existsSync(p)) return {};
  const all = JSON.parse(fs.readFileSync(p, "utf8"));
  return { byCapture: all.app || {} };
}

// ── pinned prettier (module API, exactly 3.9.6) ─────────────────────────
async function loadPrettier() {
  const candidates = [
    process.env.PRETTIER_MJS,
    path.join(proj, "node_modules", "prettier", "index.mjs"),
    "D:/repos/mirrors/metropolygonia/node_modules/prettier/index.mjs",
  ].filter(Boolean);
  for (const c of candidates) {
    if (!fs.existsSync(c)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(c), "package.json"), "utf8"));
      if (pkg.version !== PINNED) continue;
      const mod = (await import(pathToFileURL(c).href)).default;
      if (mod.version === PINNED) return { mod, at: c };
    } catch {
      /* try next */
    }
  }
  throw new Error(`pinned prettier ${PINNED} not found (set PRETTIER_MJS to its index.mjs)`);
}

// single pass + idempotency proof: prettier output must be a fixed point of
// the same call, so audit's one-pass re-render is byte-exact by construction
async function formatOnce(prettier, text, parser) {
  const out = await prettier.format(text, { parser });
  const again = await prettier.format(out, { parser });
  if (again !== out) throw new Error(`prettier ${parser} is not idempotent on this input`);
  return out;
}

// ── parse check: the exact standalone gate (ESM stdin) ──────────────────
function parses(text) {
  const r = spawnSync(process.execPath, ["--input-type=module", "--check", "-"], {
    input: text,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { ok: r.status === 0, why: (r.stderr || "").trim().split("\n").slice(-3).join(" | ") };
}

// ── markers for titles (top tokens, lowercase; fleet convention) ────────
const STOP = new Set(
  ("function return typeof undefined object string number boolean prototype length value default " +
    "exports import this that with from then else case break continue delete instanceof constructor " +
    "arguments void null true false call apply name type text target window document globalthis self " +
    "require module async await yield static class const let var new for while switch throw try catch " +
    "finally extends super using debugger of in do if has own hasown get set")
    .split(" ")
    .filter(Boolean),
);
function markers(text, n = 2) {
  // URLs/identifiers living inside string literals (import paths, asset names)
  // are not code tokens — strip quoted strings before counting
  const code = text.replace(/`[^`]*`|"[^"\n]*"|'[^'\n]*'/g, " ");
  const counts = new Map();
  for (const m of code.matchAll(/[A-Za-z][A-Za-z0-9_]{2,}/g)) {
    const w = m[0].toLowerCase();
    if (STOP.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}
const markerText = (ms) => ms.map(([w, c]) => `${w}(${c})`).join(", ");

// ── windowize: cut only at statement starts; ≤MAX lines, a single ───────
// ── oversized declaration is a window of its own ────────────────────────
function windowize(stmts) {
  const out = [];
  let cur = null;
  for (const s of stmts) {
    if (!cur) {
      cur = { first: s, last: s, count: 1, startLine: s.startLine, endLine: s.endLine };
      continue;
    }
    const projected = s.endLine - cur.startLine + 1;
    if (projected > MAX_WINDOW) {
      out.push(cur);
      cur = { first: s, last: s, count: 1, startLine: s.startLine, endLine: s.endLine };
    } else {
      cur.last = s;
      cur.count++;
      cur.endLine = s.endLine;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// ── inline block scan (byte-exact, over the raw entry buffer) ───────────
function scanBlocks(buf) {
  const blocks = [];
  for (const [open, close, kind] of [
    ["<script", "</script", "script"],
    ["<style", "</style", "style"],
  ]) {
    let p = 0;
    let n = 0;
    while (true) {
      const i = buf.indexOf(open, p);
      if (i < 0) break;
      const after = buf[i + open.length];
      const boundary =
        after === 0x3e || after === 0x2f || after === 0x20 || after === 0x09 || after === 0x0a || after === 0x0d;
      if (!boundary) {
        p = i + open.length;
        continue;
      }
      const tagEnd = buf.indexOf(">", i);
      if (tagEnd < 0) break;
      const j = buf.indexOf(close, tagEnd + 1);
      if (j < 0) throw new Error(`unterminated <${kind}> opened at byte ${i}`);
      const tag = buf.subarray(i, tagEnd + 1).toString("utf8");
      const external = /\bsrc\s*=\s*["']/i.test(tag);
      if (external) {
        blocks.push({ kind, external: true, tag, openStart: i, contentStart: tagEnd + 1, contentEnd: j });
      } else {
        n++;
        const content = buf.subarray(tagEnd + 1, j);
        blocks.push({
          kind: /\btype\s*=\s*["']importmap["']/i.test(tag) ? "importmap" : kind,
          external: false,
          block: n,
          tag,
          openStart: i,
          contentStart: tagEnd + 1,
          contentEnd: j,
          bytes: content.length,
          sha256: sha256(content),
          text: content.toString("utf8"),
        });
      }
      p = j + close.length;
    }
  }
  return blocks.sort((a, b) => a.openStart - b.openStart);
}

// ── content-anchored classification of the minified IIFE (guards fail loudly) ──
// rive-city has no vendor JS files: the only JS is the app's own player glue.
const WHOLE_FILE = {};

async function main() {
  const { mod: prettier, at } = await loadPrettier();
  console.log(`pinned prettier ${PINNED} (${at})`);
  const renameMap = loadRenameMap();
  const names = loadNames();

  const manifest = JSON.parse(fs.readFileSync(path.join(proj, ".upstream", "manifest.json"), "utf8"));
  const captured = Object.keys(manifest.files).map((r) => r.split(path.sep).join("/")).sort();
  const captureBytes = (rel) => {
    const abs = path.join(proj, rel);
    if (!fs.existsSync(abs)) throw new Error(`capture file missing: ${rel}`);
    const buf = fs.readFileSync(abs);
    if (sha256(buf) !== manifest.files[rel].sha256)
      throw new Error(`${rel} on disk does not match .upstream/manifest.json — re-verify the capture first`);
    return buf;
  };

  const readableDir = path.join(proj, "readable");
  const srcDir = path.join(proj, "src");
  fs.mkdirSync(readableDir, { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });
  const written = { readable: new Set(), src: new Set() };

  const sources = [];
  const sections = [];
  const notRendered = [];
  const payloads = [];
  let inlineFiles = [];
  let slicedTotal = 0;
  let skippedTotal = 0;

  const jsRelsAll = captured.filter((r) => /\.js$/i.test(r));
  const cssRels = captured.filter((r) => /\.css$/i.test(r));
  const htmlRels = captured.filter((r) => /\.html$/i.test(r));
  const binaryRels = captured.filter((r) => !/\.(js|css|html)$/i.test(r));
  const jsRels = jsRelsAll.slice().sort((a, b) => a.localeCompare(b));

  // ── binary payloads: hashed notRendered records (no pretty pass) ────────
  for (const rel of binaryRels) {
    const buf = captureBytes(rel);
    const bytes = buf.length;
    const sha = sha256(buf);
    notRendered.push({
      capture: rel,
      kind: "binary-payload",
      mediaType: rel.endsWith(".riv") ? "application/x-rive" : "application/octet-stream",
      bytes,
      sha256: sha,
      rendered: false,
      reason:
        rel.endsWith(".riv")
          ? "binary Rive scene payload — decoded at runtime by the CDN rive.js runtime; recorded by bytes + sha256, no pretty/slice pass"
          : "binary favicon payload — recorded by bytes + sha256, no pretty/slice pass",
    });
    payloads.push({ capture: rel, bytes, sha256: sha });
    console.log(`derive: ${rel} (${bytes} B) -> notRendered (binary payload, hashed)`);
  }

  // ── 1) JS: the minified app IIFE -> statement-aligned slices ────────────
  for (const rel of jsRels) {
    const buf = captureBytes(rel);
    const text = buf.toString("utf8");
    if (!Buffer.from(text, "utf8").equals(buf)) throw new Error(`${rel} does not round-trip through utf8`);
    const tag = tagOf(rel);
    const cls = WHOLE_FILE[tag];
    if (cls) throw new Error(`${rel}: unexpected whole-file class in this project`);
    const pretty = await formatOnce(prettier, text, "babel");
    if (pretty === text)
      throw new Error(`${rel}: prettier output is byte-identical to the capture — nothing to derive`);
    const sourceFile = prettyRelFor(rel);
    writeDerived(sourceFile, pretty);
    written.readable.add(sourceFile);
    const lines = linesOf(pretty);

    // ── IIFE shape detection (content-anchored: a shape change fails loudly) ──
    const dbg = await prettier.__debug.parse(pretty, { parser: "babel" });
    const top = (dbg.ast.program || dbg.ast).body;
    if (top.length !== 1 || top[0].type !== "ExpressionStatement")
      throw new Error(`${rel}: readable is not a single top-level statement — shape changed`);
    const call = top[0].expression;
    if (!call || call.type !== "CallExpression")
      throw new Error(`${rel}: top-level statement is not the IIFE call — shape changed`);
    let callee = call.callee;
    if (callee && callee.type === "ParenthesizedExpression") callee = callee.expression;
    if (!callee || callee.type !== "FunctionExpression" || !callee.body || callee.body.type !== "BlockStatement")
      throw new Error(`${rel}: IIFE callee is not a function expression with a block body — shape changed`);
    const bodyStmts = callee.body.body;
    if (!bodyStmts.length) throw new Error(`${rel}: IIFE body is empty — shape changed`);
    // Babel keeps the "use strict" prologue in body.directives (not body.body),
    // so the directive line lands in the skipped opener section, not in a slice.
    const directives = callee.body.directives || [];
    if (!directives.some((d) => d.value && d.value.value === "use strict"))
      throw new Error(`${rel}: IIFE body does not open with the "use strict" directive — shape changed`);
    const stmts = bodyStmts.map((n) => ({
      node: n,
      startLine: lineOf(pretty, n.start),
      endLine: lineOf(pretty, n.end),
      text: pretty.slice(n.start, n.end),
    }));
    for (let i = 1; i < stmts.length; i++)
      if (stmts[i].startLine <= stmts[i - 1].endLine)
        throw new Error(`${rel}: statements ${i - 1}/${i} share a line — cannot slice at line boundaries`);

    // ── the SERVED capture's own bytes for the wrapper regions ──────────
    // The public-export-name gate cannot use a pristine that is not a .js
    // file, and every section's sourceFile must be a readable pretty (the
    // mirror's own audit pins that), so an index-only tail's pristine is
    // always the reading copy. A tail that records NO text therefore falls
    // back to the pristine's own lines: the pristine compared with itself, a
    // comparison that can never fail. `text` breaks that tautology — it
    // records the SERVED capture's own bytes for the tail's region, which is
    // a different file from the pristine.
    //
    // The capture's own IIFE body statements give the byte offsets of the two
    // wrapper regions (the opener ends where the body's first statement
    // begins; the closer starts where the body's last statement ends).
    const capDbg = await prettier.__debug.parse(text, { parser: "babel" });
    const capTop = (capDbg.ast.program || capDbg.ast).body;
    if (capTop.length !== 1 || capTop[0].type !== "ExpressionStatement")
      throw new Error(`${rel}: capture is not a single top-level statement — shape changed`);
    const capCall = capTop[0].expression;
    if (!capCall || capCall.type !== "CallExpression")
      throw new Error(`${rel}: capture top-level statement is not the IIFE call — shape changed`);
    let capCallee = capCall.callee;
    if (capCallee && capCallee.type === "ParenthesizedExpression") capCallee = capCallee.expression;
    if (!capCallee || capCallee.type !== "FunctionExpression" || !capCallee.body)
      throw new Error(`${rel}: capture IIFE callee is not a function expression — shape changed`);
    const capBody = capCallee.body.body;
    if (capBody.length !== bodyStmts.length)
      throw new Error(`${rel}: capture carries ${capBody.length} IIFE body statement(s), the reading copy ${bodyStmts.length} — shape changed`);
    const capOpenText = text.slice(0, capBody[0].start);
    const capCloseText = text.slice(capBody[capBody.length - 1].end);

    // non-standalone wrapper lines: the IIFE opener (before the body's first
    // statement) and the `})();` closer (after the last one) -> skipped sections
    const openSec = {
      kind: "skip",
      file: `${tag}-iife-open.js`,
      title: `${tag} — IIFE opener + "use strict" (not sliced)`,
      desc: `Lines 1-${stmts[0].startLine - 1} of ${sourceFile}. The IIFE opener \`(function () {\` and its \`"use strict";\` directive — non-standalone as a slice (the opener is an unterminated function expression), so it is indexed only; the body's declarations are the slices.`,
      A: 1,
      B: stmts[0].startLine - 1,
      text: capOpenText,
    };
    const openText = lines.slice(0, openSec.B).join("\n");
    if (!openText.includes("(function") || !openText.includes('"use strict"'))
      throw new Error(`${rel}: IIFE opener section does not carry the wrapper + directive — shape changed`);
    const lastStmt = stmts[stmts.length - 1];
    const closeSec = {
      kind: "skip",
      file: `${tag}-iife-close.js`,
      title: `${tag} — IIFE closer (not sliced)`,
      desc: `Lines ${lastStmt.endLine + 1}-${lines.length} of ${sourceFile}. The IIFE invocation closer \`})();\` — non-standalone (it closes the wrapper opened on line 1), so it is indexed only.`,
      A: lastStmt.endLine + 1,
      B: lines.length,
      text: capCloseText,
    };
    if (openSec.A > openSec.B || closeSec.A > closeSec.B)
      throw new Error(`${rel}: IIFE wrapper occupies no line range — shape changed`);

    // runs of body statements -> windows (declaration-aligned)
    const slices = windowize(stmts);

    // blocks in line order, then re-tile so every line of the pretty is owned
    const blocks = [
      openSec,
      closeSec,
      ...slices.map((w) => ({ kind: "slice", A: w.startLine, B: w.endLine, count: w.count })),
    ];
    blocks.sort((a, b) => a.A - b.A);
    for (let i = 0; i < blocks.length; i++) {
      if (i === 0) blocks[i].A = 1;
      if (i + 1 < blocks.length) blocks[i].B = blocks[i + 1].A - 1;
      else blocks[i].B = lines.length;
    }

    let nn = 0;
    let perFileSkipped = 0;
    let perFileRenamed = 0;
    const targetsByOld = new Map(); // old name -> Set(targets) seen in this chunk's recorded map
    const noteTarget = (old, target) => {
      if (!targetsByOld.has(old)) targetsByOld.set(old, new Set());
      targetsByOld.get(old).add(target);
    };
    for (const b of blocks) {
      if (b.kind === "slice") {
        nn++;
        const num = String(nn).padStart(2, "0");
        const file = `${tag}-${num}.js`;
        const rawBody = lines.slice(b.A - 1, b.B).join("\n") + "\n";
        // re-cut THROUGH the recorded rename map: a re-cut must reproduce the
        // committed (renamed) slice byte-for-byte, or the pipeline is not
        // reproducible (apply -> recover -> derive -> gates).
        const record = recordsFor(renameMap, file);
        const body = record ? applyRecordedMap(rawBody, record) : rawBody;
        if (record) {
          perFileRenamed++;
          for (const [old, target] of Object.entries(record.files || {})) noteTarget(old, target);
          for (const [old, hits] of Object.entries(record.scoped || {}))
            for (const [, target] of hits) noteTarget(old, target);
        }
        const ms = markers(body);
        const topWord = ms.length ? ms[0][0] : /^\s*import\b/.test(body) ? "imports" : tag.toLowerCase();
        const oversized = b.count === 1 && b.B - b.A + 1 > MAX_WINDOW;
        const sliceText =
          `// ${tag} ${num} — ${topWord}\n` +
          `// Lines ${b.A}-${b.B} of ${sourceFile} (statement-aligned).\n` +
          body;
        const chk = parses(sliceText);
        if (!chk.ok) throw new Error(`generated src/${file} does not parse standalone: ${chk.why}`);
        writeDerived(path.posix.join("src", file), sliceText);
        written.src.add(path.posix.join("src", file));
        sections.push({
          file,
          title: `${tag} ${num} — ${topWord}`,
          desc: `${oversized ? "Oversized single declaration (kept whole). " : ""}Lines ${b.A}-${b.B}. Markers: ${markerText(ms)}.${record ? " Range re-cut through the recorded semantic rename map." : ""}`,
          startLine: b.A,
          endLine: b.B,
          sourceFile,
        });
      } else {
        perFileSkipped++;
        sections.push({
          file: b.file,
          skipped: true,
          title: b.title,
          desc: b.desc,
          startLine: b.A,
          endLine: b.B,
          sourceFile,
          firstLine: lines[b.A - 1],
          lastLine: lines[b.B - 1],
          // the SERVED capture's own bytes for this region — the derived text
          // the public-export-name gate compares against the pristine, so the
          // tail is never rebuilt from the pristine's own lines.
          ...(b.text ? { text: b.text } : {}),
        });
      }
    }
    slicedTotal += nn;
    skippedTotal += perFileSkipped;
    // ── the READING-COPY shape: the served chunk is the pristine ─────────
    // A whole-file section whose `file` IS the reading copy and whose
    // `origin` names the capture is the shape the frozen export gate reads
    // for a LIVE capture-to-rendering comparison: the gate walks the CAPTURE
    // as the pristine and the reading copy as the derived text, so a change
    // to the served code is caught. It records no `sourceFile`: the reading
    // copy IS the derived text and there is no slice to cut out of it.
    sections.push({
      file: sourceFile,
      wholeFile: true,
      origin: rel,
      title: `${tag} — served chunk (reading copy, whole-file)`,
      desc: `Lines 1-${lines.length} of ${sourceFile}. The reading copy of the served chunk ${rel} — the whole capture, rendered. Recorded in the READING-COPY shape: the PRISTINE is the captured chunk (${rel}) and the DERIVED text is this reading copy, so the public-export-name gate compares the served file's own export table with the reading copy's — two different files, not a file with itself.`,
      note: `whole-file (reading-copy shape): the pristine is the captured chunk (${rel}), the derived text is the reading copy`,
      startLine: 1,
      endLine: lines.length,
    });
    // the authored app rules that actually fired (evidence: their targets appear
    // in this chunk's recorded map) -> the chunk-level binding map recorded in
    // the spec, used by the reconstruction gates for index-only skipped sections.
    const authored = names.byCapture?.[rel] || {};
    const renameBindings = {};
    for (const [old, target] of Object.entries(authored))
      if (targetsByOld.get(old)?.has(target)) renameBindings[old] = target;
    sources.push({
      sourceFile,
      capture: rel,
      captureKind: "file",
      captureSha256: manifest.files[rel].sha256,
      captureBytes: buf.length,
      prettyLines: lines.length,
      prettyBytes: Buffer.byteLength(pretty, "utf8"),
      prettyPasses: 1,
      idempotent: true,
      tag,
      slices: nn,
      renameBindings,
      derived:
        `readable + ${nn} statement-aligned slice(s) of the IIFE body` +
        (perFileRenamed ? ` (${perFileRenamed} through the recorded rename map)` : "") +
        (perFileSkipped ? ` + ${perFileSkipped} skipped wrapper section(s)` : ""),
    });
    console.log(
      `derive: ${rel} -> ${sourceFile} (${lines.length} lines, ${nn} slices${perFileRenamed ? `, ${perFileRenamed} renamed` : ""}, ${perFileSkipped} skipped wrapper)`,
    );
  }

  // ── 2) CSS: readable pretty, wholeFile section (stylesheet rule) ────────
  for (const rel of cssRels) {
    const buf = captureBytes(rel);
    const text = buf.toString("utf8");
    const pretty = await formatOnce(prettier, text, "css");
    if (pretty === text) throw new Error(`${rel}: prettier output is byte-identical to the capture`);
    const sourceFile = prettyRelFor(rel);
    writeDerived(sourceFile, pretty);
    written.readable.add(sourceFile);
    const lines = linesOf(pretty);
    const tag = tagOf(rel);
    sections.push({
      file: `${tag}.css`,
      wholeFile: true,
      title: `${tag} — stylesheet (whole-file, never sliced)`,
      desc: `Lines 1-${lines.length} of ${sourceFile}. Whole-file (stylesheet rule): the capture stylesheet is indexed whole in readable/, never sliced.`,
      note: "whole-file (stylesheet, not sliced): CSS is indexed whole in readable/",
      startLine: 1,
      endLine: lines.length,
      sourceFile,
    });
    sources.push({
      sourceFile,
      capture: rel,
      captureKind: "file",
      captureSha256: manifest.files[rel].sha256,
      captureBytes: buf.length,
      prettyLines: lines.length,
      prettyBytes: Buffer.byteLength(pretty, "utf8"),
      prettyPasses: 1,
      idempotent: true,
      tag,
      slices: 0,
      derived: "readable only (stylesheet, wholeFile)",
    });
    console.log(`derive: ${rel} -> ${sourceFile} (${lines.length} lines, wholeFile stylesheet)`);
  }

  // ── 3) HTML entry document: inline <script>/<style> scan + twins ───────
  for (const rel of htmlRels) {
    const buf = captureBytes(rel);
    const blocks = scanBlocks(buf);
    const inline = blocks.filter((b) => !b.external);
    const external = blocks.filter((b) => b.external);
    inlineFiles.push(rel);
    for (const b of external)
      console.log(`derive: ${rel}: external ${b.kind} (not derived): ${b.tag.slice(0, 90)}`);
    if (!inline.length) {
      console.log(`derive: ${rel}: no inline <script>/<style> content blocks — no inline twins`);
      continue;
    }
    const entryTag = rel.replace(/\.html$/i, "").split("/").join("__");
    for (const b of inline) {
      const isImportmap = b.kind === "importmap";
      const parser = isImportmap ? "json" : b.kind;
      const DATA_TYPES = new Set(["application/ld+json", "application/json", "importmap", "speculationrules"]);
      const type = (/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(b.tag)?.[1] ?? "").toLowerCase();
      if (parser === "script" && DATA_TYPES.has(type)) {
        notRendered.push({
          capture: rel,
          kind: "inline-data",
          type,
          byteStart: b.contentStart,
          byteEnd: b.contentEnd,
          bytes: b.bytes,
          sha256: b.sha256,
          rendered: false,
          reason: `typed data block (<script type="${type}">) — data, not JS/CSS; recorded with range + sha256, no pretty pass`,
        });
        continue;
      }
      const tag = `${entryTag}-inline-${b.block}`;
      const prettyFile = `${tag}.pretty.${isImportmap ? "json" : b.kind === "style" ? "css" : "js"}`;
      const pretty = await formatOnce(prettier, b.text, parser);
      if (pretty === b.text)
        throw new Error(`readable/${prettyFile} would be byte-identical to its capture source`);
      fs.writeFileSync(path.join(readableDir, prettyFile), pretty);
      written.readable.add("readable/" + prettyFile);
      const lines = linesOf(pretty);
      const prettyBuf = Buffer.from(pretty, "utf8");
      sections.push({
        file: `${tag}.${isImportmap ? "json" : b.kind === "style" ? "css" : "js"}`,
        wholeFile: true,
        title: `${tag} — inline ${b.kind} block (whole-file, never sliced)`,
        desc: `Lines 1-${lines.length} of readable/${prettyFile}. Whole-file: the entry document's inline ${b.kind} block (${b.bytes} B at bytes ${b.contentStart}-${b.contentEnd} of ${rel}) is indexed whole and never sliced.`,
        note: `whole-file (entry inline ${b.kind} block, not sliced)`,
        startLine: 1,
        endLine: lines.length,
        sourceFile: `readable/${prettyFile}`,
      });
      sources.push({
        sourceFile: `readable/${prettyFile}`,
        capture: rel,
        captureKind: `inline-${b.kind}`,
        captureByteStart: b.contentStart,
        captureByteEnd: b.contentEnd,
        captureSha256: b.sha256,
        captureBytes: b.bytes,
        prettyLines: lines.length,
        prettyBytes: prettyBuf.length,
        prettySha256: sha256(prettyBuf),
        tag,
        slices: 0,
        derived: "readable only (inline block, wholeFile)",
      });
    }
  }

  // ── 4) prune orphan derived files (capture untouched) ──────────────────
  let pruned = 0;
  const walkDerived = (dir, out = []) => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkDerived(p, out);
      else out.push(path.relative(proj, p).split(path.sep).join("/"));
    }
    return out;
  };
  for (const [dir, keep, exts] of [
    [readableDir, written.readable, /\.(pretty\.js|pretty\.css)$/],
    [srcDir, written.src, /\.js$/],
  ]) {
    for (const rel of walkDerived(dir)) {
      if (exts.test(path.basename(rel)) && !keep.has(rel)) {
        fs.rmSync(path.join(proj, rel.split("/").join(path.sep)));
        pruned++;
        console.log(`derive: pruned orphan derived file ${rel}`);
      }
    }
  }

  // ── 5) split-spec.json (2-space indent + trailing newline) ─────────────
  const appJs = sources.filter((s) => s.derived.startsWith("readable +"));
  const cssSources = sources.filter((s) => s.sourceFile.endsWith(".pretty.css"));
  const spec = {
    project: "rive-city",
    kind: "statement-aligned-slices",
    defaultFile: `src/${sections.find((s) => !s.wholeFile && !s.skipped).file}`,
    note:
      "RIVE CITY (https://rive-city-j6lc8r.uat.rive.to/) is capture-class: a Rive hosted-player deployment " +
      "(rive.to UAT, ephemeral) whose whole app is one minified IIFE (_player/hosted.js — the player host/glue), " +
      "plus two binary Rive scene payloads (file.riv — the city artboard — and _player/drawer.riv — the controls " +
      "artboard), the player stylesheet and the favicon. §0.4 fork-over-mirror was checked on 2026-10-12: the page " +
      "and its JS carry no public source-repo reference (the only outbound link is https://rive.app/ from the " +
      "drawer's build button), so the mirror stands. The CDN dependency " +
      "https://cdn.jsdelivr.net/npm/@rive-app/webgl2@2.x.x/rive.js stays CDN (standing vendor rule — a CDN " +
      "dependency is not backfilled into the capture); it is documented here and in README.md. Derived pipeline: " +
      "capture → pinned prettier 3.9.6 (module API, default options, single pass verified idempotent — never the " +
      "CLI: it respects .gitignore and can silently echo its input) → readable/<served path>.pretty.js|css per " +
      "captured JS/CSS file (capture root == repo root — DISK_PREFIX \"\" — so the served path IS the disk path and " +
      "the derived layers MIRROR it: real subdirectories + served filename kept; every pretty provably NOT " +
      "byte-identical to its capture source) → statement-aligned slices src/<served path>-NN.js of the " +
      "IIFE BODY (the whole file is one (function(){…})() expression, so the top-level declaration boundaries " +
      "are the body's statements; wrapper-open and wrapper-close lines are non-standalone and are indexed as " +
      "skipped sections). Windows are ~100-140 lines — a recorded divergence from the fleet's 250-350 window, " +
      "because the whole app is 496 readable lines and the larger window would yield only two slices. Every " +
      "slice parses standalone under `node --input-type=module --check -` and round-trips byte-exact to its " +
      "recorded readable line range through the recorded semantic rename map (rename-map.json, re-applied on " +
      "every re-cut; apply -> recover -> derive -> gates). Binary payloads (file.riv, _player/drawer.riv, " +
      "_player/favicon.ico) are hashed notRendered records — no pretty/slice pass. Stylesheet rule — " +
      "_player/hosted.css is wholeFile. " +
      "Inline <script>/<style> scan: index.html references external scripts only (the CDN rive.js and " +
      "/_player/hosted.js) — zero inline content blocks, so there are no *-inline-N twins and no " +
      "index-inline-map.json. src/ identifiers are semantic names from the PLAN §5 rename campaign where the " +
      "bytes allow (tools/names.json -> tools/apply-names.mjs -> rename-map.json); binary .riv payloads stay " +
      "hashed records. Capture bytes are untouched by " +
      "everything above; re-cut with `node tools/derive.mjs` after any capture refresh. `node tools/audit.js` " +
      "is the gate.",
    renderOptions: {
      _default:
        "prettier 3.9.6, module API, default options, single pass (re-format verified idempotent at derive time) — never the CLI: it respects .gitignore and can silently echo its input",
      js: "parser babel, no plugins",
      css: "parser css, no plugins",
      json: "parser json, no plugins (inline importmap blocks, if any)",
    },
    source:
      `readable/: ${sources.filter((s) => s.sourceFile?.endsWith(".pretty.js")).length} JS pretties ` +
      `(${appJs.length} app file(s) sliced) + ${cssSources.length} CSS pretties; ` +
      `src/: ${appJs.reduce((n, s) => n + s.slices, 0)} statement-aligned slices across ${appJs.length} app file(s); ` +
      `${sections.filter((s) => s.skipped).length} skipped section(s) (IIFE wrapper open/close); ` +
      `${sections.filter((s) => s.wholeFile).length} wholeFile section(s) (stylesheet); ` +
      `capture: ${captured.length} files under .upstream/manifest.json; ` +
      `binary payloads (notRendered, hashed): ${payloads.map((p) => `${p.capture} (${p.bytes} B)`).join(", ")}; ` +
      `inline scan: ${inlineFiles.join(", ")} (0 inline content blocks); ` +
      `CDN (stays CDN, not captured): https://cdn.jsdelivr.net/npm/@rive-app/webgl2@2.x.x/rive.js.`,
    inline: {
      scanned: inlineFiles,
      contentBlocks: 0,
      notRendered: notRendered.length,
      note:
        "no inline <script>/<style> content blocks in the captured entry document — external script references " +
        "only (CDN rive.js + /_player/hosted.js), so there are no *-inline-N twins and no " +
        "readable/index-inline-map.json",
    },
    rename: {
      map: "rename-map.json",
      present: renameMap.present,
      flatNames: Object.values(renameMap.files).reduce((n, m) => n + Object.keys(m).length, 0),
      scopedOccurrences: Object.values(renameMap.scoped).reduce(
        (n, m) => n + Object.values(m).reduce((k, hits) => k + hits.length, 0),
        0,
      ),
      note:
        "Semantic renames recovered from the committed slices (tools/recover-scoped-map.mjs) and re-applied on " +
        "every re-cut (tools/engine/rename-layer.mjs applyRecordedMap); authored in tools/names.json and applied " +
        "by tools/apply-names.mjs. `files` is a word-boundary map, `scoped` addresses token indices. Binary .riv " +
        "payloads are not code and stay hashed notRendered records; the CDN rive.js runtime is not captured.",
    },
    sources,
    sections,
    notRendered,
  };
  fs.writeFileSync(path.join(proj, "split-spec.json"), JSON.stringify(spec, null, 2) + "\n");

  // ── 6) self-check (tools/audit.js is the authoritative gate) ────────────
  let bad = 0;
  const bySource = new Map();
  for (const s of sections) {
    // the reading-copy shape records no sourceFile (the reading copy IS the
    // derived text): it owns no range of any pretty and is not tiled.
    if (typeof s.sourceFile !== "string") continue;
    if (!bySource.has(s.sourceFile)) bySource.set(s.sourceFile, []);
    bySource.get(s.sourceFile).push(s);
  }
  for (const [sourceFile, list] of bySource) {
    const lines = readLines(path.join(proj, sourceFile));
    const sorted = [...list].sort((a, b) => a.startLine - b.startLine);
    if (sorted[0].startLine !== 1) {
      console.error(`TILING FAIL ${sourceFile}: starts at line ${sorted[0].startLine}`);
      bad++;
    }
    for (let i = 1; i < sorted.length; i++)
      if (sorted[i].startLine !== sorted[i - 1].endLine + 1) {
        console.error(`TILING FAIL ${sourceFile}: gap/overlap at ${sorted[i].file}`);
        bad++;
      }
    if (sorted[sorted.length - 1].endLine !== lines.length) {
      console.error(`TILING FAIL ${sourceFile}: does not reach EOF (${lines.length})`);
      bad++;
    }
  }
  let parsed = 0;
  let ranged = 0;
  let roundOK = 0;
  for (const s of sections) {
    if (s.wholeFile || s.skipped) continue;
    ranged++;
    const abs = path.join(proj, "src", s.file);
    const text = fs.readFileSync(abs, "utf8");
    const nl2 = text.indexOf("\n", text.indexOf("\n") + 1);
    const body = text.slice(nl2 + 1);
    const raw = readLines(path.join(proj, s.sourceFile)).slice(s.startLine - 1, s.endLine).join("\n") + "\n";
    const record = recordsFor(renameMap, s.file);
    const expected = record ? applyRecordedMap(raw, record) : raw;
    if (body !== expected) {
      console.error(`ROUND-TRIP FAIL ${s.file}`);
      bad++;
    } else roundOK++;
    if (!parses(text).ok) {
      console.error(`PARSE FAIL src/${s.file}`);
      bad++;
    } else parsed++;
  }
  let prettyParsed = 0;
  for (const s of sources) {
    if (!s.sourceFile?.endsWith(".pretty.js")) continue;
    if (!parses(fs.readFileSync(path.join(proj, s.sourceFile), "utf8")).ok) {
      console.error(`PARSE FAIL ${s.sourceFile}`);
      bad++;
    } else prettyParsed++;
  }
  console.log(
    `derive: ${written.readable.size} readable file(s), ${written.src.size} src slices ` +
      `(${parsed}/${ranged} parse standalone, ${roundOK}/${ranged} round-trip byte-exact through the recorded map), ` +
      `${skippedTotal} skipped, ${sections.filter((s) => s.wholeFile).length} wholeFile, ` +
      `${prettyParsed} pretty js parse clean, ${notRendered.length} notRendered, ${pruned} orphan(s) pruned — ` +
      `self-check ${bad ? bad + " FAILURE(S)" : "clean"}`,
  );
  if (bad) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
