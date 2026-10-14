// probe-structure.mjs — read-only structure probe over the capture + the
// readable layer: what the captured code actually exposes (module signatures,
// top-level statements, source maps), where the recorded slice boundaries fall,
// and which identifiers the rename campaign may address.
//
// Evidence tool for the 2026-10-14 structure + rename pass (PLAN §5). It
// writes nothing; every fact it prints is re-derivable from the capture.
// The rename-candidate verdicts (eligible / refused + why) come from
// `node tools/apply-names.mjs --list <capture rel>` — the writer's own
// preflight, so the evidence and the guard can never disagree.
//
// usage: node tools/probe-structure.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAcorn } from "./lib-acorn.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, "..");
const acorn = await getAcorn();

const spec = JSON.parse(fs.readFileSync(path.join(proj, "split-spec.json"), "utf8"));
const cache = new Map();
const linesOf = (rel) => {
  if (!cache.has(rel)) cache.set(rel, fs.readFileSync(path.join(proj, rel), "utf8").split("\n"));
  return cache.get(rel);
};

// ── 1) bundle-shape signatures ──────────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(path.join(proj, ".upstream", "manifest.json"), "utf8"));
const capRels = Object.keys(manifest.files)
  .filter((r) => /\.(js|css|html)$/.test(r))
  .sort();
console.log("captured code surface:");
for (const rel of capRels) {
  const text = fs.readFileSync(path.join(proj, rel), "utf8");
  const sigs = {
    sourceMappingURL: /sourceMappingURL/.test(text),
    "import(": (text.match(/\bimport\s*\(/g) || []).length,
    "bare import": (text.match(/(^|[;{}\s])import\s*["'`]/g) || []).length,
    "from-import": (text.match(/\bfrom\s*["'`]/g) || []).length,
    "export-from": (text.match(/\bexport\s+\{[^}]*\}\s*from\b/g) || []).length,
    exportTable: (text.match(/\bexport\s*\{/g) || []).length,
    __vite__mapDeps: (text.match(/__vite__mapDeps/g) || []).length,
    modulepreload: (text.match(/modulepreload/g) || []).length,
    __webpack_require__: (text.match(/__webpack_require__/g) || []).length,
    __turbopack: (text.match(/__turbopack|turbopack_/g) || []).length,
    "push([": (text.match(/\.push\(\[/g) || []).length,
    newURLWorker: (text.match(/new URL\([^)]*import\.meta\.url/g) || []).length,
  };
  console.log(`  ${rel}: ${JSON.stringify(sigs)}`);
}
const mapFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "legacy", "readable", "src", "docs", "tools"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".map")) mapFiles.push(path.relative(proj, p).split(path.sep).join("/"));
  }
})(proj);
console.log(`  *.map files in the capture: ${mapFiles.length}${mapFiles.length ? " — " + mapFiles.join(", ") : ""}`);

// ── 2) top-level statements of every sliced module + recorded boundaries ─
const bySource = new Map();
for (const s of spec.sections) {
  if (s.wholeFile || s.skipped || typeof s.startLine !== "number") continue;
  if (!bySource.has(s.sourceFile)) bySource.set(s.sourceFile, []);
  bySource.get(s.sourceFile).push(s);
}
for (const [sourceFile, sectionsRaw] of [...bySource].sort()) {
  const fullText = linesOf(sourceFile).join("\n");
  let ast;
  try {
    ast = acorn.parse(fullText, { ecmaVersion: 2023, sourceType: "module", locations: true });
  } catch {
    ast = acorn.parse(fullText, { ecmaVersion: 2023, sourceType: "script", locations: true });
  }
  const starts = [0];
  for (let i = 0; i < fullText.length; i++) if (fullText[i] === "\n") starts.push(i + 1);
  const lineOf = (off) => {
    let lo = 0,
      hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= off) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const stmts = ast.body.map((n, i) => ({ i, type: n.type, startLine: lineOf(n.start), endLine: lineOf(n.end - 1) }));
  const importCount = ast.body.filter((n) => n.type === "ImportDeclaration").length;
  const exportCount = ast.body.filter((n) => n.type === "ExportNamedDeclaration" || n.type === "ExportDefaultDeclaration").length;
  console.log(`\n${sourceFile}: ${stmts.length} top-level statements (${importCount} import(s), ${exportCount} export(s)), ${linesOf(sourceFile).length} lines`);
  const bounds = [...sectionsRaw]
    .sort((a, b) => a.startLine - b.startLine)
    .map((s) => [s.file, s.startLine, s.endLine, s.wholeFile ? "wholeFile" : s.skipped ? "skipped" : "ranged"]);
  console.log("recorded section boundaries -> statement indices:");
  for (const [file, a, b, kind] of bounds) {
    const first = stmts.find((s) => s.startLine === a);
    const last = stmts.find((s) => s.endLine === b);
    console.log(`  ${file.padEnd(44)} lines ${String(a).padStart(5)}-${String(b).padStart(5)}  stmt#${first ? first.i : "??"}..${last ? last.i : "??"}  ${kind}`);
  }
  const shared = stmts.filter((s, k) => k > 0 && s.startLine <= stmts[k - 1].endLine);
  console.log(`statements sharing a line: ${shared.length}`);
  const ranged = bounds.filter(([, , , kind]) => kind === "ranged").map(([, a, b]) => [a, b]);
  const whole = bounds.filter(([, , , kind]) => kind === "wholeFile").map(([, a, b]) => [a, b]);
  const skipped = bounds.filter(([, , , kind]) => kind === "skipped").map(([, a, b]) => [a, b]);
  const fmt = (rs) => rs.map(([a, b]) => `${a}-${b}`).join(", ") || "(none)";
  console.log(`ranged regions: ${fmt(ranged)}`);
  console.log(`wholeFile regions: ${fmt(whole)}`);
  console.log(`skipped sections: ${fmt(skipped)}`);
  console.log(`rename-eligible program-scope names: run \`node tools/apply-names.mjs --list ${spec.sources.find((s) => s.sourceFile === sourceFile)?.capture ?? "?"}\` (the writer's own preflight; this probe does not duplicate the scope walk).`);
}

// ── 3) template substitutions with braces inside the ranged regions ─────
const SKIP_KEYS = new Set(["type", "start", "end", "loc", "range", "raw"]);
let found = 0;
for (const [sourceFile, sectionsRaw] of [...bySource].sort()) {
  const ranged = sectionsRaw.map((s) => [s.startLine, s.endLine]);
  const inRanged = (l) => ranged.some(([a, b]) => l >= a && l <= b);
  const fullText = linesOf(sourceFile).join("\n");
  let ast;
  try {
    ast = acorn.parse(fullText, { ecmaVersion: 2023, sourceType: "module", locations: true });
  } catch {
    ast = acorn.parse(fullText, { ecmaVersion: 2023, sourceType: "script", locations: true });
  }
  (function scanTemplates(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const c of node) scanTemplates(c);
      return;
    }
    if (typeof node.type !== "string") {
      for (const k of Object.keys(node)) if (!SKIP_KEYS.has(k)) scanTemplates(node[k]);
      return;
    }
    if (node.type === "TemplateLiteral") {
      for (const e of node.expressions) {
        const l = e.loc.start.line;
        if (inRanged(l)) {
          const t = fullText.slice(e.start, e.end);
          if (t.includes("{")) {
            found++;
            console.log(`  ${sourceFile} line ${l}: \${{ ${t.slice(0, 80)}${t.length > 80 ? "…" : ""} }}`);
          }
        }
      }
    }
    for (const k of Object.keys(node)) if (!SKIP_KEYS.has(k)) scanTemplates(node[k]);
  })(ast);
}
console.log(`\ntemplate substitutions containing \`{\` inside ranged regions: ${found}`);
