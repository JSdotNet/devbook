// bundle.workflow.test.mjs — the bundle's planning and cap, driven through a fake agent.
//
//   node --test plugins/delivery-schedule/skills/schedule-bundle/bundle.workflow.test.mjs
//
// The script runs under the host's Workflow tool, which hands it `args`, `agent`, `phase`, and
// `log` as globals. Here the same body runs as an async function with fakes for each, so the
// selection, deduplication, preconditions, prompt assembly, and cap are tested as written.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = (await readFile(path.join(HERE, "bundle.workflow.js"), "utf8")).replace(/^export const meta\s*=/m, "const meta =");
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const body = new AsyncFunction("args", "agent", "parallel", "pipeline", "phase", "log", SOURCE);

const JOBS = ["devbook-validate", "tech-update", "devbook-verify", "prose-check", "instruction-review", "weekly-update", "change-report"];
const WRITERS = new Set(["devbook-validate", "tech-update", "prose-check", "instruction-review"]);
const DIGEST = new Set(["weekly-update", "change-report"]);
const PREAMBLE = 'You are the scheduled run "{{title}}" for {{repo}}, cloned at `{{checkout}}`, base {{base}}, branch schedule/{{name}}/.';

const schedules = Object.fromEntries(JOBS.map((j) => [j, { title: `Title of ${j}`, body: `Run the ${j} skill for {{repo}}.` }]));

const checkout = (p, origin, extra = {}) => ({
  path: p, exists: true, toplevel: p, commonDirParent: p, origin, base: "main", stamped: true,
  enabled: JOBS, overrides: [], facts: { devbook: true, tech: true, units: true }, ...extra,
});

const tick = (ms) => new Promise((r) => setTimeout(r, ms));

// Runs the script. `reports` is what the plan agent returns; `onJob(label, n)` decides each
// job's result, `n` its start order. Returns the script's result and what the fake observed.
async function run({ checkouts, reports, onJob, jobs = JOBS, scheds = schedules }) {
  const seen = { starts: [], prompts: {}, running: [], maxRunning: 0, maxWriters: 0, sameRepoWriters: false, digestBeforeMainDone: false, finished: [] };
  const agent = async (prompt, opts) => {
    if (opts.label === "plan") return { checkouts: reports };
    const [job, repo] = opts.label.split(":");
    const n = seen.starts.length;
    seen.starts.push(opts.label);
    seen.prompts[opts.label] = prompt;
    const me = { job, repo };
    seen.running.push(me);
    const writers = seen.running.filter((r) => WRITERS.has(r.job));
    seen.maxRunning = Math.max(seen.maxRunning, seen.running.length);
    seen.maxWriters = Math.max(seen.maxWriters, writers.length);
    if (new Set(writers.map((w) => w.repo)).size !== writers.length) seen.sameRepoWriters = true;
    if (DIGEST.has(job) && seen.running.some((r) => !DIGEST.has(r.job))) seen.digestBeforeMainDone = true;
    try {
      await tick(1 + ((n * 7) % 5));
      return onJob ? onJob(opts.label, n, seen) : { outcome: "done", pullRequest: "", summary: "finished", report: `report of ${opts.label}` };
    } finally {
      seen.running.splice(seen.running.indexOf(me), 1);
      seen.finished.push(opts.label);
    }
  };
  const logs = [];
  const result = await body(
    { bundle: { name: "sunday-devbook-review", title: "Sunday devbook review", jobs }, schedules: scheds, preamble: PREAMBLE, checkouts },
    agent, null, null, () => {}, (m) => logs.push(m),
  );
  return { result, seen, logs };
}

const cell = (result, repo, job) => result.cells.find((c) => c.repo === repo && c.job === job);

test("runs only the jobs a repository selects, and assembles each prompt without a pickup gate", async () => {
  const { result, seen } = await run({
    checkouts: ["D:/Repos/devbook"],
    reports: [checkout("D:/Repos/devbook", "https://github.com/JSdotNet/devbook.git", { enabled: ["devbook-validate", "weekly-update"] })],
  });
  assert.deepEqual(seen.starts, ["devbook-validate:JSdotNet/devbook", "weekly-update:JSdotNet/devbook"]);
  assert.equal(cell(result, "JSdotNet/devbook", "tech-update").state, "not-selected");
  assert.equal(cell(result, "JSdotNet/devbook", "devbook-validate").state, "done");
  const prompt = seen.prompts["devbook-validate:JSdotNet/devbook"];
  assert.ok(prompt.startsWith('You are the scheduled run "Title of devbook-validate" for JSdotNet/devbook, cloned at `D:/Repos/devbook`, base main, branch schedule/devbook-validate/.'));
  assert.ok(prompt.includes("Run the devbook-validate skill for JSdotNet/devbook."));
  assert.match(prompt, /\nMode: bundle\n/);
  assert.match(prompt, /take the `worktree add` branch/);
  assert.match(prompt, /draft pull request, never ready for review/);
  assert.ok(!prompt.includes("{{"), "every placeholder is substituted");
  assert.ok(!/pick(ed)? up|Skipped:/.test(prompt), "no pickup gate");
});

test("substitutes maxResolve from the repository's override, else the schedule's field", async () => {
  const scheds = { ...schedules, "devbook-validate": { title: "V", body: "Resolve {{maxResolve}} items.", maxResolve: 10 }, "tech-update": { title: "T", body: "Resolve {{maxResolve}} items.", maxResolve: 10 } };
  const { seen } = await run({
    scheds,
    checkouts: ["D:/a"],
    reports: [checkout("D:/a", "https://github.com/o/a", { enabled: ["devbook-validate", "tech-update"], overrides: [{ name: "devbook-validate", maxResolve: 3 }] })],
  });
  assert.match(seen.prompts["devbook-validate:o/a"], /Resolve 3 items\./);
  assert.match(seen.prompts["tech-update:o/a"], /Resolve 10 items\./);
});

test("runs a repository once per origin, the first main checkout winning, and skips what is not one", async () => {
  const { result } = await run({
    checkouts: ["D:/Repos/devbook", "D:/Repos/devbook-wt-schedule", "D:/Repos/ai-agent-stack", "D:/Repos/wt", "D:/Repos/plain", "D:/Repos/gone", "D:/Repos/backlog", "D:/Repos/unread"],
    reports: [
      checkout("D:/Repos/devbook", "https://github.com/JSdotNet/devbook.git"),
      checkout("D:/Repos/devbook-wt-schedule", "git@github.com:JSdotNet/devbook.git"),
      checkout("D:\\Repos\\ai-agent-stack\\", "ssh://git@github.com/jsdotnet/DEVBOOK"),
      checkout("D:/Repos/wt", "https://github.com/o/wt", { toplevel: "D:/Repos/wt", commonDirParent: "D:/Repos/main" }),
      checkout("D:/Repos/plain", "https://github.com/o/plain", { stamped: false }),
      checkout("D:/Repos/gone", "", { exists: false }),
      checkout("D:/Repos/backlog", "https://github.com/JSdotNet/Backlog"),
    ],
  });
  assert.deepEqual(result.repos.map((r) => r.repo), ["JSdotNet/devbook", "JSdotNet/Backlog"]);
  assert.equal(result.repos[0].checkout, "D:/Repos/devbook");
  const reasons = Object.fromEntries(result.skippedCheckouts.map((s) => [s.path, s.reason]));
  assert.match(reasons["D:/Repos/devbook-wt-schedule"], /same `origin` as D:\/Repos\/devbook/);
  assert.match(reasons["D:/Repos/ai-agent-stack"], /same `origin`/);
  assert.match(reasons["D:/Repos/wt"], /worktree/);
  assert.match(reasons["D:/Repos/plain"], /components\.schedule/);
  assert.equal(reasons["D:/Repos/gone"], "missing");
  assert.equal(reasons["D:/Repos/unread"], "not read");
  assert.equal(result.cells.filter((c) => c.repo === "JSdotNet/devbook").length, JOBS.length);
});

test("checks each job's precondition before any subagent starts", async () => {
  const { result, seen } = await run({
    checkouts: ["D:/a", "D:/b"],
    reports: [
      checkout("D:/a", "https://github.com/o/a", { facts: { devbook: true, tech: false, units: true } }),
      checkout("D:/b", "https://github.com/o/b", { facts: { devbook: false, tech: false, units: false } }),
    ],
  });
  assert.deepEqual(cell(result, "o/a", "tech-update"), { repo: "o/a", job: "tech-update", state: "skipped", reason: "no `tech/` folder", pullRequest: "", report: "" });
  for (const job of ["devbook-validate", "devbook-verify", "prose-check"]) assert.equal(cell(result, "o/b", job).reason, "devbook not adopted");
  assert.ok(!seen.starts.some((l) => l.startsWith("tech-update:")));
  assert.ok(!seen.starts.some((l) => l.endsWith(":o/b") && !["instruction-review", "weekly-update", "change-report"].includes(l.split(":")[0])));
  assert.equal(cell(result, "o/a", "devbook-verify").state, "done");
});

test("holds the cap: four at once, two writers, never two writers in one repository, digest last", async () => {
  const names = ["a", "b", "c", "d", "e", "f"];
  const { result, seen } = await run({
    checkouts: names.map((n) => `D:/${n}`),
    reports: names.map((n) => checkout(`D:/${n}`, `https://github.com/o/${n}`)),
  });
  assert.equal(seen.starts.length, names.length * JOBS.length);
  assert.ok(seen.maxRunning <= 4, `ran ${seen.maxRunning} at once`);
  assert.equal(seen.maxRunning, 4, "the cap is used, not just respected");
  assert.ok(seen.maxWriters <= 2, `ran ${seen.maxWriters} writers at once`);
  assert.equal(seen.sameRepoWriters, false);
  assert.equal(seen.digestBeforeMainDone, false);
  assert.deepEqual(result.peak, { agents: 4, writers: 2 });
  // Started in bundle order: no job starts before every cell of an earlier non-digest job was eligible.
  const firstDigest = seen.starts.findIndex((l) => DIGEST.has(l.split(":")[0]));
  assert.ok(seen.starts.slice(firstDigest).every((l) => DIGEST.has(l.split(":")[0])));
  assert.equal(seen.starts[0], "devbook-validate:o/a");
  assert.ok(result.cells.every((c) => c.state === "done"));
});

test("runs one repository's writers one at a time, readers beside them", async () => {
  const { seen } = await run({ checkouts: ["D:/a"], reports: [checkout("D:/a", "https://github.com/o/a")] });
  assert.equal(seen.maxWriters, 1);
  assert.equal(seen.sameRepoWriters, false);
  assert.ok(seen.maxRunning >= 2, "a reader runs beside the writer");
});

test("at the usage limit starts nothing new and marks the rest not run", async () => {
  const { result, seen } = await run({
    checkouts: ["D:/a", "D:/b", "D:/c"],
    reports: ["a", "b", "c"].map((n) => checkout(`D:/${n}`, `https://github.com/o/${n}`)),
    onJob: (label, n, s) => {
      if (n === 2) { s.startsAtLimit = s.starts.length; return { outcome: "usage-limit", pullRequest: "", summary: "usage limit", report: "" }; }
      return { outcome: "draft", pullRequest: `https://github.com/o/x/pull/${n}`, summary: "landed", report: "r" };
    },
  });
  assert.equal(result.stoppedBy, "usage limit");
  assert.equal(seen.starts.length, seen.startsAtLimit, "nothing starts once the limit is seen");
  const notRun = result.cells.filter((c) => c.state === "not-run");
  assert.equal(notRun.length, 3 * JOBS.length - seen.starts.length + 1);
  assert.ok(notRun.every((c) => c.reason === "usage limit"));
  assert.ok(result.cells.filter((c) => c.state === "draft").every((c) => c.pullRequest.startsWith("https://")));
  assert.equal(result.cells.filter((c) => c.state === "queued").length, 0);
});

test("reads a thrown usage-limit error as the limit, and two empty agents in a row as well", async () => {
  const thrown = await run({
    checkouts: ["D:/a"],
    reports: [checkout("D:/a", "https://github.com/o/a")],
    onJob: (label, n) => { if (n === 0) throw new Error("Claude usage limit reached"); return { outcome: "done", pullRequest: "", summary: "ok", report: "" }; },
  });
  assert.equal(thrown.result.stoppedBy, "usage limit");
  assert.equal(cell(thrown.result, "o/a", "devbook-validate").state, "not-run");

  const empty = await run({
    checkouts: ["D:/a"],
    reports: [checkout("D:/a", "https://github.com/o/a", { enabled: ["devbook-validate", "tech-update", "devbook-verify", "weekly-update"] })],
    onJob: () => null,
  });
  assert.equal(cell(empty.result, "o/a", "devbook-validate").state, "failed");
  assert.equal(empty.result.stoppedBy, "two agents in a row returned nothing");
  assert.equal(cell(empty.result, "o/a", "weekly-update").state, "not-run");
});

test("one failed job is one cell, and the run carries on", async () => {
  const { result } = await run({
    checkouts: ["D:/a"],
    reports: [checkout("D:/a", "https://github.com/o/a")],
    onJob: (label) => (label.startsWith("tech-update:") ? null : { outcome: "done", pullRequest: "", summary: "ok", report: "" }),
  });
  assert.equal(cell(result, "o/a", "tech-update").state, "failed");
  assert.equal(result.stoppedBy, null);
  assert.equal(result.cells.filter((c) => c.state === "done").length, JOBS.length - 1);
});

test("a plan that returns nothing runs nothing and says why per checkout", async () => {
  const { result, seen } = await run({ checkouts: ["D:/a"], reports: undefined });
  assert.equal(seen.starts.length, 0);
  assert.deepEqual(result.skippedCheckouts, [{ path: "D:/a", reason: "not read" }]);
});
