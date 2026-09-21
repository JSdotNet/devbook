export const meta = {
  name: 'resolve-issue',
  description: 'Resolve one claimed GitHub issue inside a dedicated worktree, up to a reviewed, tested change set',
  whenToUse:
    'Invoked by the schedule-issue-sweep skill for each issue it resolves, after it has claimed the issue and provisioned a worktree. Not a standalone entrypoint: it expects args.worktree to exist and args.issue to be claimed.',
  phases: [
    { title: 'Scope Discovery', detail: 'read-only sweep for impacted paths and governing instructions' },
    { title: 'Implementation', detail: 'failing test first, then the change' },
    { title: 'Build & Test', detail: 'build and unit tests, with bounded repair attempts' },
    { title: 'Review', detail: 'correctness and guideline lenses, then fix confirmed blockers' },
  ],
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
// args = {
//   worktree:   absolute path to the dedicated worktree (already created)
//   branch:     branch checked out in that worktree
//   baseBranch: branch it was cut from
//   issue:      { repo, number, title, body, labels, url }
//   changeKind: 'bug-fix' | 'new-functionality' | 'dependency-update' | 'none'
//   maxRepairAttempts: integer, default 2
// }

// Fail loudly rather than resolving agents against the wrong tree: an absent worktree path
// would silently anchor every agent to the owner session's own checkout.
if (!args || !args.worktree || !args.issue || !args.issue.number || !args.branch) {
  throw new Error(
    'resolve-issue.workflow.js requires args.worktree (absolute path), args.branch, and ' +
      'args.issue.number. Invoke it through the schedule-issue-sweep skill, which claims ' +
      'the issue and provisions the worktree first.',
  )
}

const wt = args.worktree
const issue = args.issue
const changeKind = args.changeKind || 'new-functionality'
const MAX_REPAIRS = Number.isInteger(args.maxRepairAttempts) ? args.maxRepairAttempts : 2

// Every agent runs in the session's working directory, not the worktree. This preamble is
// prepended to every prompt so each agent anchors its reads, edits, and shell calls to the
// dedicated worktree instead of whatever tree the owner session happens to be in.
const WORKTREE_RULE = `
WORKING TREE — read this first.
All of your work happens in this git worktree and nowhere else:

  ${wt}

- Use absolute paths under that root for every read and edit.
- Prefix every shell command with \`cd "${wt}" && ...\` so builds, tests, and git see the right tree.
- Never edit, build, or run anything outside that root, and never touch another worktree.
- Do NOT commit, push, create a pull request, or run any \`gh\` command. The session that
  started this workflow owns the git and GitHub side effects.
`.trim()

const ISSUE_CONTEXT = `
GitHub issue #${issue.number} in ${issue.repo}: "${issue.title}"
URL: ${issue.url}
Labels: ${(issue.labels || []).join(', ') || 'none'}
Change kind: ${changeKind}
Branch: ${args.branch} (cut from ${args.baseBranch})

Issue body:
${issue.body || '(empty)'}
`.trim()

const SCOPE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'impactedPaths', 'acceptanceCriteria', 'escalate'],
  properties: {
    summary: { type: 'string', description: 'What the issue actually asks for, in your own words' },
    impactedPaths: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'why'],
        properties: { path: { type: 'string' }, why: { type: 'string' } },
      },
    },
    integrationPoints: { type: 'array', items: { type: 'string' } },
    governingInstructions: {
      type: 'array',
      description: 'CLAUDE.md, **/*.instructions.md, ADRs and guidelines that apply to the impacted paths',
      items: { type: 'string' },
    },
    testTargets: {
      type: 'array',
      description: 'Existing test projects or files where the new tests belong',
      items: { type: 'string' },
    },
    acceptanceCriteria: {
      type: 'array',
      description: 'Verifiable criteria derived from the issue; each must be checkable by a test or an observable behaviour',
      items: { type: 'string' },
    },
    escalate: {
      type: 'object',
      additionalProperties: false,
      required: ['needed'],
      properties: {
        needed: { type: 'boolean' },
        reason: { type: 'string' },
        routeTo: {
          type: 'string',
          description: 'flow-spec | flow-code',
        },
      },
    },
    unresolvedQuestions: {
      type: 'array',
      description: 'Decisions this run had to assume rather than confirm; each with the assumption taken',
      items: { type: 'string' },
    },
  },
}

const IMPL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'filesChanged', 'blocked'],
  properties: {
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    testsAdded: { type: 'array', items: { type: 'string' } },
    assumptions: { type: 'array', items: { type: 'string' } },
    blocked: { type: 'boolean', description: 'true when the change could not be completed' },
    blockedReason: { type: 'string' },

    // --- routing signals: evidence for the PR-vs-park decision, judged after the work ---
    criteriaCoverage: {
      type: 'array',
      description: 'One entry per acceptance criterion, naming the test that proves it, or stating that none does',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['criterion', 'coveredByTest'],
        properties: {
          criterion: { type: 'string' },
          coveredByTest: { type: 'boolean' },
          test: { type: 'string', description: 'The test that proves it, when one does' },
        },
      },
    },
    touchesRuntimeSurface: {
      type: 'boolean',
      description:
        'true when the change alters something a unit test cannot prove: rendered UI, a public API or event contract, a data migration, deployment or runtime configuration, or an external integration',
    },
    runtimeSurfaceDetail: { type: 'string', description: 'What surface, and what a human would need to look at' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['buildPassed', 'testsPassed'],
  properties: {
    buildPassed: { type: 'boolean' },
    testsPassed: { type: 'boolean' },
    command: { type: 'string', description: 'The exact build/test command that was run' },
    passedCount: { type: 'integer' },
    failedCount: { type: 'integer' },
    failures: {
      type: 'array',
      description: 'One entry per failing test or compile error, with the message that identifies it',
      items: { type: 'string' },
    },
    notes: { type: 'string' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'file', 'summary'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          file: { type: 'string' },
          line: { type: 'integer' },
          summary: { type: 'string' },
          suggestedFix: { type: 'string' },
        },
      },
    },
  },
}

// ---------------------------------------------------------------------------
// Phase 1 — Scope Discovery (read-only)
// ---------------------------------------------------------------------------
phase('Scope Discovery')

const scope = await agent(
  `${WORKTREE_RULE}

You are doing read-only scope discovery for a GitHub issue. Do not edit any file.

${ISSUE_CONTEXT}

Find, and report as structured findings:
1. The code paths this issue actually touches, each with one line of why.
2. The integration points those paths reach (APIs, handlers, persistence, UI entrypoints).
3. The governing instructions that apply — CLAUDE.md, matching **/*.instructions.md, ADRs,
   coding guidelines. Name the files, not their contents.
4. Where the tests for those paths live.
5. Verifiable acceptance criteria derived from the issue body. Derive them when the issue does
   not state them — missing criteria are a reason to do this step, not to stop.

Escalate ONLY when the change needs a decision this run does not own: a new architectural
decision, a new bounded context or service boundary, a change to the documented domain model
(new aggregate root, changed invariant, renamed ubiquitous-language concept), a cross-cutting
redesign, or knowingly accepting debt instead of fixing it. Adding a field, an entity, or a
method inside an existing aggregate is ordinary work and does NOT escalate. An unwritten spec,
absent acceptance criteria, or a one-sentence issue does NOT escalate — derive and record the
assumption instead.

Report the paths and the conclusion, not file contents.`,
  { label: `scope:#${issue.number}`, phase: 'Scope Discovery', schema: SCOPE_SCHEMA },
)

if (!scope) {
  return { outcome: 'failed', stage: 'Scope Discovery', reason: 'Scope discovery agent returned no result.' }
}

if (scope.escalate && scope.escalate.needed) {
  log(`Escalating #${issue.number}: ${scope.escalate.reason || 'decision not owned by this run'}`)
  return {
    outcome: 'escalated',
    stage: 'Scope Discovery',
    routeTo: scope.escalate.routeTo || 'flow-spec',
    reason: scope.escalate.reason,
    scope,
  }
}

log(`Scope: ${scope.impactedPaths.length} impacted path(s), ${scope.acceptanceCriteria.length} acceptance criteria.`)

const SCOPE_BRIEF = `
Scope summary: ${scope.summary}

Impacted paths:
${scope.impactedPaths.map((p) => `- ${p.path} — ${p.why}`).join('\n')}

Integration points:
${(scope.integrationPoints || []).map((p) => `- ${p}`).join('\n') || '- none identified'}

Governing instructions to follow:
${(scope.governingInstructions || []).map((p) => `- ${p}`).join('\n') || '- none identified'}

Test targets:
${(scope.testTargets || []).map((p) => `- ${p}`).join('\n') || '- none identified'}

Acceptance criteria:
${scope.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`.trim()

// ---------------------------------------------------------------------------
// Phase 2 — Implementation (test first)
// ---------------------------------------------------------------------------
phase('Implementation')

const impl = await agent(
  `${WORKTREE_RULE}

Implement the change for this issue, test first.

${ISSUE_CONTEXT}

${SCOPE_BRIEF}

Work in this order and do not reorder it:
1. Write the failing test(s) that encode the acceptance criteria above, in the test targets named.
2. Run them and confirm they fail for the stated reason — a test that passes before the change
   is not testing the change.
3. Implement the smallest change that makes them pass, following the governing instructions.
4. Re-run those tests.

Match the surrounding code's naming, idiom, and comment density. Do not reformat untouched code,
do not fix unrelated problems, and do not widen the scope beyond the acceptance criteria.

If something genuinely blocks the change, set blocked=true with the reason rather than
implementing a guess. Record every assumption you had to take.

Then report the evidence that decides whether this change can go straight to a pull request or
needs a human to validate it. Report what is true, not what would be convenient:

- criteriaCoverage: for EVERY acceptance criterion above, the test that proves it — or
  coveredByTest=false when no test does. A criterion you verified by reading the code, or by
  running the app, is NOT covered by a test.
- touchesRuntimeSurface: true when the change alters something a unit test cannot prove —
  rendered UI, a public API or event contract, a data migration, deployment or runtime
  configuration, or an external integration. When true, say what a human would need to look at.`,
  { label: `implement:#${issue.number}`, phase: 'Implementation', schema: IMPL_SCHEMA },
)

if (!impl || impl.blocked) {
  return {
    outcome: 'blocked',
    stage: 'Implementation',
    reason: (impl && impl.blockedReason) || 'Implementation agent returned no result.',
    scope,
    implementation: impl,
  }
}

log(`Implementation: ${impl.filesChanged.length} file(s) changed, ${(impl.testsAdded || []).length} test(s) added.`)

// ---------------------------------------------------------------------------
// Phase 3 — Build & Test, with bounded repair
// ---------------------------------------------------------------------------
phase('Build & Test')

let verify = await agent(
  `${WORKTREE_RULE}

Build the solution and run the unit test suite. Report the result exactly as it happened.

${SCOPE_BRIEF}

Discover the build and test commands from the repository itself (solution/project files,
CLAUDE.md, README, CI workflow) rather than assuming a toolchain. Run the full unit suite, not
only the new tests — a change that fixes its own test and breaks three others has not passed.

Do not fix anything. Report failures verbatim enough that another agent can act on them.`,
  { label: `verify:#${issue.number}`, phase: 'Build & Test', schema: VERIFY_SCHEMA },
)

let repairs = 0
while (verify && !(verify.buildPassed && verify.testsPassed) && repairs < MAX_REPAIRS) {
  repairs += 1
  log(`Build/test red — repair attempt ${repairs} of ${MAX_REPAIRS}.`)

  const failureList = (verify.failures || []).map((f) => `- ${f}`).join('\n') || '- (no failure detail reported)'

  const repair = await agent(
    `${WORKTREE_RULE}

The build or the unit tests are failing after the change for issue #${issue.number}.
This is repair attempt ${repairs} of ${MAX_REPAIRS}.

Command run: ${verify.command || '(not reported)'}
Build passed: ${verify.buildPassed}
Tests passed: ${verify.testsPassed}

Failures:
${failureList}

${SCOPE_BRIEF}

Diagnose the actual cause and fix it. Fix the code when the code is wrong; fix the test only
when the test encodes the wrong expectation, and say which you did and why. Never delete,
skip, or weaken a test to make the suite green. If the failure is pre-existing and unrelated
to this change, say so and leave it alone.`,
    { label: `repair-${repairs}:#${issue.number}`, phase: 'Build & Test', schema: IMPL_SCHEMA },
  )

  if (!repair || repair.blocked) {
    return {
      outcome: 'blocked',
      stage: 'Build & Test',
      reason: (repair && repair.blockedReason) || 'Repair agent returned no result.',
      scope,
      implementation: impl,
      verification: verify,
      repairAttempts: repairs,
    }
  }

  verify = await agent(
    `${WORKTREE_RULE}

Re-run the build and the full unit test suite after repair attempt ${repairs} for issue
#${issue.number}. Report the result exactly as it happened. Do not fix anything.`,
    { label: `verify-${repairs}:#${issue.number}`, phase: 'Build & Test', schema: VERIFY_SCHEMA },
  )
}

if (!verify || !verify.buildPassed || !verify.testsPassed) {
  return {
    outcome: 'red',
    stage: 'Build & Test',
    reason: `Build or tests still failing after ${repairs} repair attempt(s).`,
    scope,
    implementation: impl,
    verification: verify,
    repairAttempts: repairs,
  }
}

log(`Build & test green after ${repairs} repair attempt(s).`)

// ---------------------------------------------------------------------------
// Phase 4 — Review, then fix confirmed blockers
// ---------------------------------------------------------------------------
phase('Review')

const LENSES = [
  {
    key: 'correctness',
    brief:
      'Correctness and completeness: does the change actually satisfy every acceptance criterion, ' +
      'and does it break an adjacent behaviour? Look for off-by-one and boundary handling, null and ' +
      'empty cases, error paths, async/await misuse, and state left inconsistent on failure.',
  },
  {
    key: 'guidelines',
    brief:
      'Repository fit: does the change follow the governing instructions named in scope discovery, ' +
      'and does it read like the code around it? Look for duplicated logic that an existing helper ' +
      'already covers, naming that departs from the surrounding module, layering violations, and ' +
      'test coverage that asserts implementation detail instead of behaviour.',
  },
]

const reviews = await parallel(
  LENSES.map((lens) => () =>
    agent(
      `${WORKTREE_RULE}

Review the uncommitted change set for issue #${issue.number} through ONE lens only:

${lens.brief}

Read the diff first: \`cd "${wt}" && git --no-pager diff\` and \`git --no-pager status --short\`.

${SCOPE_BRIEF}

Report only defects you can point at in the diff, each with the file and a concrete failure
scenario. Do not report style preferences, do not restate what the change does, and do not
report anything outside the diff. An empty findings list is a valid and useful answer.

Severity: 'blocker' means the change is wrong or incomplete as it stands; 'major' means it
works but carries a real risk; 'minor' is everything else.`,
      { label: `review:${lens.key}`, phase: 'Review', schema: REVIEW_SCHEMA },
    ),
  ),
)

const findings = reviews.filter(Boolean).flatMap((r) => r.findings || [])
const blockers = findings.filter((f) => f.severity === 'blocker')
log(`Review: ${findings.length} finding(s), ${blockers.length} blocker(s).`)

let reviewFixVerification = null

if (blockers.length > 0) {
  const fix = await agent(
    `${WORKTREE_RULE}

Review of the change set for issue #${issue.number} raised ${blockers.length} blocking finding(s).
Fix each one, then re-run the build and the full unit test suite and confirm they are green.

Blocking findings:
${blockers.map((f, i) => `${i + 1}. [${f.file}${f.line ? ':' + f.line : ''}] ${f.summary}${f.suggestedFix ? ' — suggested: ' + f.suggestedFix : ''}`).join('\n')}

${SCOPE_BRIEF}

Fix only these findings. If one of them is wrong — the reviewer misread the code — say so and
leave that code alone rather than changing correct code to satisfy a bad finding.`,
    { label: `review-fix:#${issue.number}`, phase: 'Review', schema: IMPL_SCHEMA },
  )

  if (!fix || fix.blocked) {
    return {
      outcome: 'blocked',
      stage: 'Review',
      reason: (fix && fix.blockedReason) || 'Review-fix agent returned no result.',
      scope,
      implementation: impl,
      verification: verify,
      findings,
      repairAttempts: repairs,
    }
  }

  reviewFixVerification = await agent(
    `${WORKTREE_RULE}

Re-run the build and the full unit test suite after the review fixes for issue #${issue.number}.
Report the result exactly as it happened. Do not fix anything.`,
    { label: `verify-review-fix:#${issue.number}`, phase: 'Review', schema: VERIFY_SCHEMA },
  )

  if (!reviewFixVerification || !reviewFixVerification.buildPassed || !reviewFixVerification.testsPassed) {
    return {
      outcome: 'red',
      stage: 'Review',
      reason: 'Build or tests went red after applying review fixes.',
      scope,
      implementation: impl,
      verification: reviewFixVerification || verify,
      findings,
      repairAttempts: repairs,
    }
  }

  impl.filesChanged = Array.from(new Set([...impl.filesChanged, ...(fix.filesChanged || [])]))
  impl.summary = `${impl.summary}\n\nReview fixes: ${fix.summary}`
}

// ---------------------------------------------------------------------------
// Routing — evidence-based, decided on what the change turned out to be
// ---------------------------------------------------------------------------
// A green build is the entry ticket, not the decision. The question is narrower: did the
// change prove itself? Anything the test suite cannot demonstrate is a reason for a human to
// look before this becomes a merge candidate.

const assumptions = [...(scope.unresolvedQuestions || []), ...(impl.assumptions || [])]
const coverage = impl.criteriaCoverage || []
const uncovered = coverage.filter((c) => !c.coveredByTest)
const majorFindings = findings.filter((f) => f.severity === 'major')

const parkReasons = []
if (coverage.length === 0) {
  parkReasons.push('The implementation reported no criterion-to-test mapping, so nothing proves the criteria are met.')
}
if (uncovered.length > 0) {
  parkReasons.push(`${uncovered.length} acceptance criterion/criteria have no test proving them: ${uncovered.map((c) => `"${c.criterion}"`).join('; ')}`)
}
if (impl.touchesRuntimeSurface) {
  parkReasons.push(`The change touches a runtime surface a unit test cannot prove: ${impl.runtimeSurfaceDetail || 'unspecified'}`)
}
if (assumptions.length > 0) {
  parkReasons.push(`The run took ${assumptions.length} assumption(s) instead of asking: ${assumptions.join('; ')}`)
}
if (majorFindings.length > 0) {
  parkReasons.push(`Review left ${majorFindings.length} major finding(s) unfixed: ${majorFindings.map((f) => `${f.file} — ${f.summary}`).join('; ')}`)
}

const route = parkReasons.length === 0 ? 'small-fix' : 'needs-validation'
log(route === 'small-fix' ? 'Routing: small fix — self-proving, eligible for a pull request.' : `Routing: needs validation — ${parkReasons.length} reason(s).`)

// ---------------------------------------------------------------------------
// Result — handed back to the owner session, which commits and then PRs or parks
// ---------------------------------------------------------------------------
return {
  outcome: 'ready',
  route,
  parkReasons,
  criteriaCoverage: coverage,
  touchesRuntimeSurface: Boolean(impl.touchesRuntimeSurface),
  issue: { number: issue.number, title: issue.title, url: issue.url, repo: issue.repo },
  branch: args.branch,
  baseBranch: args.baseBranch,
  worktree: wt,
  changeKind,
  scope,
  implementation: impl,
  verification: reviewFixVerification || verify,
  repairAttempts: repairs,
  findings,
  openFindings: findings.filter((f) => f.severity !== 'blocker'),
  assumptions,
}
