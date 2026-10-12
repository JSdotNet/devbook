#!/usr/bin/env node
// Type-check a function-hook plugin (a mod) from a worktree.
//
//   node tools/typecheck-mod.mjs plugins/<name>
//
// A mod's tsconfig.json extends .claude-plugin/types/tsconfig.json, which the engine writes
// only beside a mod it loads. A worktree's copy is never loaded, so that folder is absent and
// tsc has nothing to read. This takes the engine's declarations from .claude-plugin/types/
// when the engine did lay it, else from where Claude Code unpacks its plugin-authoring skill
// (the newest version on this machine), writes a tsconfig carrying the options those
// declarations name to a temp folder, and runs tsc over the mod's hooks/ and types/.
// `claude plugin test <dir>` runs its tests; `claude plugin validate --strict <dir>` its shape.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = process.argv[2];
if (!dir || !existsSync(path.join(dir, ".claude-plugin", "plugin.json"))) {
  console.error("usage: node tools/typecheck-mod.mjs plugins/<name>");
  process.exit(2);
}
const plugin = path.resolve(dir);
if (!existsSync(path.join(plugin, "hooks"))) {
  console.error(`${dir} has no hooks/ folder: it is not a mod.`);
  process.exit(2);
}

const semverKey = (v) => v.split(".").map((n) => n.padStart(6, "0")).join(".");

function bundledDeclarations() {
  const root = path.join(tmpdir(), "claude", "bundled-skills");
  if (!existsSync(root)) return null;
  const versions = readdirSync(root).filter((v) => /^\d+\.\d+\.\d+$/.test(v));
  versions.sort((a, b) => (semverKey(a) < semverKey(b) ? 1 : -1));
  for (const v of versions) {
    const found = readdirSync(path.join(root, v))
      .map((h) => path.join(root, v, h, "plugin-authoring", "types", "claude-code.d.ts"))
      .filter((f) => existsSync(f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    if (found.length) return found[0];
  }
  return null;
}

const laid = path.join(plugin, ".claude-plugin", "types");
const declarations = existsSync(laid) ? laid : bundledDeclarations();
if (!declarations) {
  console.error(
    "No engine declarations: neither .claude-plugin/types/ beside the mod nor a plugin-authoring\n" +
      "skill under the temp folder's claude/bundled-skills/. Load plugin-authoring once and rerun.",
  );
  process.exit(2);
}

const include = [declarations, path.join(plugin, "hooks"), path.join(plugin, "types")]
  .filter((p) => existsSync(p))
  .map((p) => p.replaceAll("\\", "/"));
const work = mkdtempSync(path.join(tmpdir(), "typecheck-mod-"));
writeFileSync(
  path.join(work, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      target: "es2023", lib: ["es2023"], types: [],
      module: "esnext", moduleResolution: "bundler",
      strict: true, noUncheckedIndexedAccess: true,
      noEmit: true, skipLibCheck: true,
      jsx: "react", jsxFactory: "h", jsxFragmentFactory: "Fragment",
    },
    include,
  }, null, 2),
);

console.log(`declarations: ${declarations}`);
const run = spawnSync("npx", ["-y", "--prefer-offline", "-p", "typescript@5", "tsc", "-p", work], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
rmSync(work, { recursive: true, force: true });
if (run.status === 0) console.log(`tsc: ${dir} is clean`);
process.exit(run.status ?? 1);
