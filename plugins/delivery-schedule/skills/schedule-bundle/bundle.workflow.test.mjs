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
const SATURDAY = ["devbook-update", "package-update", "security-review"];
const WEEKDAY = ["issue-sweep", "merge-review"];
const WRITERS = new Set(["devbook-validate", "tech-update", "prose-check", "instruction-review", "devbook-update", "package-update", "issue-sweep"]);
const DIGEST = new Set(["weekly-update", "change-report"]);
const PREAMBLE = 'You are the scheduled run "{{title}}" for {{repo}}, cloned at `{{checkout}}`, base {{base}}, branch schedule/{{name}}/.';

const schedules = Object.fromEntries([...JOBS, ...SATURDAY, ...WEEKDAY].map((j) => [j, { title: `Title of ${j}`, body: `Run the ${j} skill for {{repo}}.` }]));

const checkout = (p, origin, extra = {}) => ({
  path: p, exists: true, toplevel: p, commonDirParent: p, origin, nameWithOwner: "", base: "main", stamped: true,
  enabled: [...JOBS, ...SATURDAY, ...WEEKDAY], overrides: [], facts: { devbook: true, tech: true, units: true, nuget: true }, ...extra,
});

const tick = (ms) => new Promise((r) => setTimeout(r, ms));

// Runs the script. `reports` is what the plan agent returns; `onJob(label, n)` decides each
// job's result, `n` its start order. Returns the script's result and what the fake observed.
async function run({ checkouts, reports, onJob, jobs = JOBS, scheds = schedules, name = "sunday-devbook-review", title = "Sunday devbook review" }) {
  const seen = { starts: [], prompts: {}, running: [], maxRunning: 0, maxWriters: 0, sameRepoWriters: false, sameRepoJobs: false, digestBeforeMainDone: false, finished: [] };
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
    if (new Set(seen.running.map((r) => r.repo)).size !== seen.running.length) seen.sameRepoJobs = true;
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
    { bundle: { name, title, jobs }, schedules: scheds, preamble: PREAMBLE, checkouts },
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
  assert.match(prompt, /read its own `AGENTS\.md` and `CLAUDE\.md`/);
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
    checkouts: ["D:/Repos/devbook", "D:/Repos/devbook-wt-schedule", "D:/Repos/ai-agent-stack", "D:/Repos/wt", "D:/Repos/plain", "D:/Repos/gone", "D:/Repos/backlog", "D:/Repos/azure", "D:/Repos/unread"],
    reports: [
      checkout("D:/Repos/devbook", "https://github.com/JSdotNet/devbook.git"),
      checkout("D:/Repos/devbook-wt-schedule", "git@github.com:JSdotNet/devbook.git"),
      checkout("D:\\Repos\\ai-agent-stack\\", "ssh://git@github.com/jsdotnet/DEVBOOK"),
      checkout("D:/Repos/wt", "https://github.com/o/wt", { toplevel: "D:/Repos/wt", commonDirParent: "D:/Repos/main" }),
      checkout("D:/Repos/plain", "https://github.com/o/plain", { stamped: false }),
      checkout("D:/Repos/gone", "", { exists: false }),
      checkout("D:/Repos/backlog", "https://github.com/jsdotnet/backlog", { nameWithOwner: "JSdotNet/Backlog" }),
      checkout("D:/Repos/azure", "https://dev.azure.com/org/project/_git/repo"),
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
  assert.match(reasons["D:/Repos/azure"], /is not `<host>\/<owner>\/<repo>`/);
  assert.equal(result.cells.filter((c) => c.repo === "JSdotNet/devbook").length, JOBS.length);
});

test("checks each job's precondition before any subagent starts", async () => {
  const { result, seen } = await run({
    checkouts: ["D:/a", "D:/b"],
    reports: [
      checkout("D:/a", "https://github.com/o/a", { facts: { devbook: true, tech: false, units: true, nuget: true } }),
      checkout("D:/b", "https://github.com/o/b", { facts: { devbook: false, tech: false, units: false, nuget: true } }),
    ],
  });
  assert.deepEqual(cell(result, "o/a", "tech-update"), { repo: "o/a", job: "tech-update", state: "skipped", reason: "no `tech/` folder", pullRequest: "", report: "" });
  for (const job of ["devbook-validate", "devbook-verify", "prose-check"]) assert.equal(cell(result, "o/b", job).reason, "devbook not adopted");
  assert.ok(!seen.starts.some((l) => l.startsWith("tech-update:")));
  assert.ok(!seen.starts.some((l) => l.endsWith(":o/b") && !["instruction-review", "weekly-update", "change-report"].includes(l.split(":")[0])));
  assert.equal(cell(result, "o/a", "devbook-verify").state, "done");
});

test("holds the cap: four at once, two writers, one job per repository, digest last", async () => {
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
  assert.equal(seen.sameRepoJobs, false);
  assert.equal(seen.digestBeforeMainDone, false);
  assert.deepEqual(result.peak, { agents: 4, writers: 2 });
  // The digest starts only once every other job has settled, and the first start is the first cell.
  const firstDigest = seen.starts.findIndex((l) => DIGEST.has(l.split(":")[0]));
  assert.ok(seen.starts.slice(firstDigest).every((l) => DIGEST.has(l.split(":")[0])));
  assert.equal(seen.starts[0], "devbook-validate:o/a");
  assert.ok(result.cells.every((c) => c.state === "done"));
});

test("runs one repository's jobs one at a time, in bundle order", async () => {
  const { seen } = await run({ checkouts: ["D:/a"], reports: [checkout("D:/a", "https://github.com/o/a")] });
  assert.equal(seen.maxRunning, 1);
  assert.deepEqual(seen.starts, JOBS.map((j) => `${j}:o/a`));
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
  assert.equal(empty.result.stoppedBy, "two agents in a row returned nothing");
  assert.deepEqual(empty.result.cells.filter((c) => c.state !== "not-selected").map((c) => c.state), ["not-run", "not-run", "not-run", "not-run"]);
  assert.equal(empty.seen.starts.length, 2, "nothing starts after the second empty agent");
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

const saturday = (opts) => run({ jobs: SATURDAY, name: "saturday-code-health", title: "Saturday code health", ...opts });

test("Saturday code health: the stack update starts first in each repository, though a reader could fill the slot", async () => {
  const names = ["a", "b", "c", "d", "e"];
  const { result, seen } = await saturday({
    checkouts: names.map((n) => `D:/${n}`),
    reports: names.map((n) => checkout(`D:/${n}`, `https://github.com/o/${n}`)),
  });
  assert.equal(seen.starts.length, names.length * SATURDAY.length);
  for (const n of names) {
    const mine = seen.starts.filter((l) => l.endsWith(`:o/${n}`)).map((l) => l.split(":")[0]);
    assert.deepEqual(mine, SATURDAY, `o/${n} ran its jobs in bundle order`);
    const updated = seen.finished.indexOf(`devbook-update:o/${n}`);
    assert.ok(updated >= 0 && seen.finished.indexOf(`package-update:o/${n}`) > updated && seen.finished.indexOf(`security-review:o/${n}`) > updated);
  }
  assert.ok(seen.maxWriters <= 2 && seen.maxRunning <= 4);
  assert.equal(seen.sameRepoJobs, false);
  assert.ok(result.cells.every((c) => c.state === "done"));
  assert.deepEqual(result.jobs.map((j) => [j.name, j.writes, j.detail]), [["devbook-update", true, false], ["package-update", true, false], ["security-review", false, true]]);
});

test("Saturday code health: no package manifest skips package update at the precondition, and the rest still run", async () => {
  const { result, seen } = await saturday({
    checkouts: ["D:/a", "D:/b"],
    reports: [
      checkout("D:/a", "https://github.com/o/a"),
      checkout("D:/b", "https://github.com/o/b", { facts: { devbook: true, tech: true, units: true, nuget: false } }),
    ],
  });
  assert.deepEqual(cell(result, "o/b", "package-update"), { repo: "o/b", job: "package-update", state: "skipped", reason: "no .NET package manifest", pullRequest: "", report: "" });
  assert.ok(!seen.starts.includes("package-update:o/b"));
  assert.deepEqual(seen.starts.filter((l) => l.endsWith(":o/b")), ["devbook-update:o/b", "security-review:o/b"]);
  assert.equal(cell(result, "o/a", "package-update").state, "done");
  const prompt = seen.prompts["package-update:o/a"];
  assert.match(prompt, /"All repos · Saturday code health"/);
  assert.match(prompt, /\nMode: bundle\n/);
  assert.match(prompt, /draft pull request, never ready for review/);
});

const weekday = (job, opts) => run({ jobs: [job], name: `weekday-${job}`, title: job === "issue-sweep" ? "Issue sweep" : "Merge review", ...opts });
const six = ["a", "b", "c", "d", "e", "f"];
const sixRepos = { checkouts: six.map((n) => `D:/${n}`), reports: six.map((n) => checkout(`D:/${n}`, `https://github.com/o/${n}`)) };

test("Merge review: a reader, so four repositories run at once, each prompt keeping the verdict comment and nothing else", async () => {
  const { result, seen } = await weekday("merge-review", sixRepos);
  assert.deepEqual(result.jobs.map((j) => [j.name, j.writes]), [["merge-review", false]]);
  assert.equal(seen.maxRunning, 4);
  assert.equal(seen.maxWriters, 0);
  assert.ok(result.cells.every((c) => c.state === "done"));
  const prompt = seen.prompts["merge-review:o/a"];
  assert.match(prompt, /"All repos · Merge review"/);
  assert.match(prompt, /draft pull request, never ready for review/);
  assert.match(prompt, /Open no issue\./);
  assert.match(prompt, /Make the writes this job's own routine makes, and no others: the one verdict comment per pull request head commit/);
  assert.match(prompt, /never approves, requests changes, merges, or pushes/);
  assert.ok(!/Comment on, label, reopen, or close no issue/.test(prompt));
});

test("Issue sweep: a writer, so at most two sweeps run at once, each prompt keeping the routine's labels, comments, closes, and drafts", async () => {
  const { result, seen } = await weekday("issue-sweep", sixRepos);
  assert.deepEqual(result.jobs.map((j) => [j.name, j.writes]), [["issue-sweep", true]]);
  assert.equal(seen.maxWriters, 2);
  assert.equal(seen.maxRunning, 2);
  const prompt = seen.prompts["issue-sweep:o/a"];
  assert.match(prompt, /"All repos · Issue sweep"/);
  assert.match(prompt, /Open no issue\./);
  assert.match(prompt, /classification and marker labels/);
  assert.match(prompt, /likely duplicate/);
  assert.match(prompt, /closes its own procedure makes on high-confidence evidence/);
  assert.match(prompt, /each resolution as a draft pull request, with the claim, outcome, and failure-marker comments and labels `draft-pr-contract\.md` puts on the issue it resolves/);
});

test("a weekend job's prompt writes nothing to an issue", async () => {
  for (const job of [...JOBS, ...SATURDAY]) {
    const { seen } = await run({ jobs: [job], checkouts: ["D:/a"], reports: [checkout("D:/a", "https://github.com/o/a")] });
    const prompt = seen.prompts[`${job}:o/a`];
    assert.match(prompt, /Open no issue\. Comment on, label, reopen, or close no issue\./, job);
    assert.ok(!/Make the writes this job's own routine makes/.test(prompt), job);
  }
});

test("Issue sweep in a bundle resolves each repository's own maxResolve, the stamp's override first", async () => {
  const scheds = { ...schedules, "issue-sweep": { title: "Issue sweep", body: "Run `schedule-issue-sweep` for {{repo}} with `maxResolve {{maxResolve}}`; up to {{maxResolve}} resolved.", maxResolve: 10 } };
  const names = ["a", "b", "c", "d"];
  const overrides = { a: [{ name: "issue-sweep", maxResolve: 3 }], b: [], c: [{ name: "issue-sweep", maxResolve: 0 }], d: [{ name: "merge-review", maxResolve: 2 }] };
  const { seen, logs } = await weekday("issue-sweep", {
    scheds,
    checkouts: names.map((n) => `D:/${n}`),
    reports: names.map((n) => checkout(`D:/${n}`, `https://github.com/o/${n}`, { overrides: overrides[n] })),
  });
  assert.match(seen.prompts["issue-sweep:o/a"], /`maxResolve 3`; up to 3 resolved/);
  assert.match(seen.prompts["issue-sweep:o/b"], /`maxResolve 10`; up to 10 resolved/);
  assert.match(seen.prompts["issue-sweep:o/c"], /`maxResolve 0`; up to 0 resolved/, "0 is an override: triage alone");
  assert.match(seen.prompts["issue-sweep:o/d"], /`maxResolve 10`/, "another schedule's override does not apply");
  assert.ok(!logs.some((l) => /ignored|not a whole number/.test(l)));
});

test("an override for a schedule with no maxResolve field, or not a whole number, is reported and ignored", async () => {
  const scheds = { ...schedules, "issue-sweep": { title: "Issue sweep", body: "Resolve {{maxResolve}}.", maxResolve: 10 }, "merge-review": { title: "Merge review", body: "Review {{repo}}." } };
  const bad = await weekday("issue-sweep", { scheds, checkouts: ["D:/a"], reports: [checkout("D:/a", "https://github.com/o/a", { overrides: [{ name: "issue-sweep", maxResolve: -1 }] })] });
  assert.match(bad.seen.prompts["issue-sweep:o/a"], /Resolve 10\./);
  assert.ok(bad.logs.some((l) => /o\/a: the override maxResolve -1 for issue-sweep is not a whole number/.test(l)));
  const none = await weekday("merge-review", { scheds, checkouts: ["D:/a"], reports: [checkout("D:/a", "https://github.com/o/a", { overrides: [{ name: "merge-review", maxResolve: 4 }] })] });
  assert.match(none.seen.prompts["merge-review:o/a"], /Review o\/a\./);
  assert.ok(none.logs.some((l) => /override maxResolve for merge-review is ignored, since that schedule sets none/.test(l)));
});

// A fake for the cross-bundle lock: `busy[label]` is how many times that cell finds another
// bundle's lock before it is free.
const lockedBy = (busy) => {
  const asked = {};
  return (label, n, s) => {
    asked[label] = (asked[label] || 0) + 1;
    s.asked = asked;
    if (asked[label] <= (busy[label] || 0)) return { outcome: "busy", pullRequest: "", summary: "weekday-issue-sweep issue-sweep 2026-11-18T05:00:00Z", report: "" };
    return { outcome: "done", pullRequest: "", summary: "finished", report: "r" };
  };
};

test("every job's prompt checks the cross-bundle lock before rule 1 and holds it while it runs", async () => {
  const { seen } = await weekday("merge-review", { checkouts: ["D:/a"], reports: [checkout("D:/a", "https://github.com/o/a")] });
  const prompt = seen.prompts["merge-review:o/a"];
  assert.match(prompt, /Before rule 1, check the cross-bundle lock\. Its path is `<common>\/schedule-bundle\.lock`/);
  assert.ok(prompt.includes('`git -C "D:/a" rev-parse --path-format=absolute --git-common-dir`'));
  assert.match(prompt, /names a bundle other than `weekday-merge-review`, and started less than 12 hours ago/);
  assert.match(prompt, /return the outcome `busy`/);
  assert.match(prompt, /write it as `weekday-merge-review merge-review <now, ISO UTC>`/);
  assert.match(prompt, /before you return, whatever the outcome, a usage limit and a failure included, delete it when it still names `weekday-merge-review merge-review`/);
  assert.match(prompt, /delete the lock, then return the outcome `usage-limit`/);
  assert.ok(prompt.indexOf("cross-bundle lock") < prompt.indexOf("In rule 1, take the `worktree add` branch"));
});

test("a busy repository goes to the back of the queue and runs once another job has settled", async () => {
  const names = ["a", "b", "c"];
  const { result, seen } = await weekday("issue-sweep", {
    checkouts: names.map((n) => `D:/${n}`),
    reports: names.map((n) => checkout(`D:/${n}`, `https://github.com/o/${n}`)),
    onJob: lockedBy({ "issue-sweep:o/a": 1 }),
  });
  assert.deepEqual(seen.starts, ["issue-sweep:o/a", "issue-sweep:o/b", "issue-sweep:o/c", "issue-sweep:o/a"]);
  assert.equal(seen.asked["issue-sweep:o/a"], 2, "asked again once, after another job settled");
  assert.ok(result.cells.every((c) => c.state === "done"));
  assert.ok(seen.maxWriters <= 2);
});

test("a repository still busy when nothing else is left is reported not run, and is not asked in a loop", async () => {
  const names = ["a", "b", "c", "d"];
  const { result, seen } = await weekday("merge-review", {
    checkouts: names.map((n) => `D:/${n}`),
    reports: names.map((n) => checkout(`D:/${n}`, `https://github.com/o/${n}`)),
    onJob: lockedBy({ "merge-review:o/b": 99 }),
  });
  const b = cell(result, "o/b", "merge-review");
  assert.equal(b.state, "not-run");
  assert.match(b.reason, /^another bundle's job was still running there: weekday-issue-sweep issue-sweep/);
  assert.ok(seen.asked["merge-review:o/b"] <= names.length, `asked ${seen.asked["merge-review:o/b"]} times`);
  for (const n of ["a", "c", "d"]) assert.equal(cell(result, `o/${n}`, "merge-review").state, "done");
  assert.equal(result.stoppedBy, null);
});

test("a busy repository keeps the bundle's order: its later jobs wait behind the busy one", async () => {
  const { result, seen } = await saturday({
    checkouts: ["D:/a", "D:/b"],
    reports: [checkout("D:/a", "https://github.com/o/a"), checkout("D:/b", "https://github.com/o/b")],
    onJob: lockedBy({ "devbook-update:o/a": 1 }),
  });
  const mine = seen.starts.filter((l) => l.endsWith(":o/a")).map((l) => l.split(":")[0]);
  assert.deepEqual(mine, ["devbook-update", "devbook-update", "package-update", "security-review"]);
  assert.ok(result.cells.every((c) => c.state === "done"));
  assert.equal(seen.sameRepoJobs, false);
});

test("an issue sweep that cannot call Workflow fails as its own cell, named, and the run carries on", async () => {
  const names = ["a", "b"];
  const { result, seen } = await weekday("issue-sweep", {
    checkouts: names.map((n) => `D:/${n}`),
    reports: names.map((n) => checkout(`D:/${n}`, `https://github.com/o/${n}`)),
    onJob: (label) => (label.endsWith(":o/a")
      ? { outcome: "failed", pullRequest: "", summary: "No Workflow in a bundle subagent", report: "" }
      : { outcome: "draft", pullRequest: "https://github.com/o/b/pull/1", summary: "landed", report: "r" }),
  });
  const prompt = seen.prompts["issue-sweep:o/a"];
  assert.match(prompt, /starts its own scripts through the `Workflow` tool/);
  assert.match(prompt, /before any label, comment, close, or branch, and return the outcome `failed` with the summary `no Workflow in a bundle subagent`/);
  const a = cell(result, "o/a", "issue-sweep");
  assert.equal(a.state, "failed");
  assert.match(a.reason, /could not call Workflow from a bundle subagent; the repository keeps its own routine/);
  assert.deepEqual(result.noWorkflow, [{ repo: "o/a", job: "issue-sweep" }]);
  assert.equal(cell(result, "o/b", "issue-sweep").state, "draft");
  assert.equal(result.stoppedBy, null);
});

test("only a job that starts its own scripts carries the Workflow line", async () => {
  const { seen, result } = await weekday("merge-review", {
    checkouts: ["D:/a"],
    reports: [checkout("D:/a", "https://github.com/o/a")],
    onJob: () => ({ outcome: "failed", pullRequest: "", summary: "no Workflow in a bundle subagent", report: "" }),
  });
  assert.ok(!seen.prompts["merge-review:o/a"].includes("`Workflow` tool"));
  assert.equal(cell(result, "o/a", "merge-review").reason, "no Workflow in a bundle subagent");
  assert.deepEqual(result.noWorkflow, []);
});

test("a busy repository waiting at the back is reported not run with the rest when the usage limit stops the run", async () => {
  const names = ["a", "b", "c"];
  const { result } = await weekday("issue-sweep", {
    checkouts: names.map((n) => `D:/${n}`),
    reports: names.map((n) => checkout(`D:/${n}`, `https://github.com/o/${n}`)),
    onJob: (label) => {
      if (label.endsWith(":o/a")) return { outcome: "busy", pullRequest: "", summary: "weekday-merge-review merge-review 2026-11-18T07:00:00Z", report: "" };
      return { outcome: "usage-limit", pullRequest: "", summary: "usage limit", report: "" };
    },
  });
  assert.equal(result.stoppedBy, "usage limit");
  assert.ok(result.cells.every((c) => c.state === "not-run"), JSON.stringify(result.cells.map((c) => c.state)));
  assert.equal(cell(result, "o/a", "issue-sweep").reason, "usage limit");
});
