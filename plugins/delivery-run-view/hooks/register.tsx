import type { EngineInterface, Register } from 'claude-code'

import type { FlowLink, FlowMode, FlowRun, FlowStage, FlowWorker } from '../types'

const PANE = 'delivery-run-view'
const POLL_MS = 3000
const MAX_RUNS = 8
/** Another checkout's run alerts only while it moved in the last day, so a parked run does not ring forever. */
const FRESH_MS = 24 * 60 * 60 * 1000
const MAX_OTHER_RUNS = 40
/** The short clip a gate plays, shipped beside the module. */
const GATE_SOUND = 'sounds/gate.wav'

/** The surfaces that write run files under the profile, in the shape the dashboard defines. */
const SURFACES = ['delivery-surface-dashboard', 'backlog']

const RUNS = { plugin: 'delivery-run-view', key: 'runs' } as const
const SELECTED = { plugin: 'delivery-run-view', key: 'selected' } as const
/** The stage whose detail is open; -1 follows the run (the active stage, else the last one reached). */
const FOCUS = { plugin: 'delivery-run-view', key: 'focus' } as const
const SEEN = { plugin: 'delivery-run-view', key: 'seen' } as const

// ── Vocabulary ───────────────────────────────────────────────────────────────

type Tone = 'done' | 'active' | 'waiting' | 'blocked' | 'skipped' | 'pending'

const tone = (status: string): Tone => {
  const s = (status || '').toLowerCase().replace(/[\s_-]/g, '')
  if (['done', 'completed', 'complete', 'passed', 'approved', 'success'].includes(s)) return 'done'
  if (['awaitingapproval', 'waiting', 'pendingapproval'].includes(s)) return 'waiting'
  if (['inprogress', 'running', 'active', 'started'].includes(s)) return 'active'
  if (['blocked', 'failed', 'error', 'rejected', 'aborted'].includes(s)) return 'blocked'
  if (s === 'skipped') return 'skipped'
  return 'pending'
}

const COLOR: Record<Tone, string> = {
  done: 'green',
  active: 'yellow',
  waiting: 'magenta',
  blocked: 'red',
  skipped: 'gray',
  pending: 'gray',
}

const MARK: Record<Tone, string> = { done: '✓', active: '●', waiting: '◆', blocked: '✗', skipped: '–', pending: '○' }

/** One word per way a phase runs; colour repeats it, never replaces it. */
const MODE_LABEL: Record<FlowMode, string> = { inline: 'inline', delegate: 'delegate', fork: 'fork', gate: 'gate' }
const MODE_COLOR: Record<FlowMode, string> = { inline: 'gray', delegate: 'cyan', fork: 'blue', gate: 'magenta' }

const isQuiet = (t: Tone) => t === 'pending' || t === 'skipped'

/**
 * A stage's tone with the gate read in: no surface records `awaiting_approval`, so a gate stage
 * in progress is the run waiting on its person.
 */
const stageTone = (s: FlowStage): Tone => {
  const t = tone(s.status)
  return s.mode === 'gate' && t === 'active' ? 'waiting' : t
}

const isPersonalValidation = (s: FlowStage) => /personal validation/i.test(s.name)

const duration = (ms: number | null | undefined) => {
  if (!ms || ms <= 0) return ''
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

const tokens = (n: number | null | undefined) =>
  !n ? '' : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

const shortModel = (model: string | null | undefined) =>
  (model || '').replace(/^claude-/, '').replace(/-\d{8}$/, '').replace(/-(\d+)-(\d+)$/, ' $1.$2')

// ── Reading the run files ────────────────────────────────────────────────────

const slugOf = (root: string) =>
  (root.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || 'project').replace(/[^a-zA-Z0-9._-]/g, '-')

/** The state folder the surfaces keep for a checkout: `<slug>-<8 hex>`, the hash of the path. */
const HASHED = /^(.+)-[0-9a-f]{8}$/

type StateDir = { runs: string; slug: string }

/** Every checkout's state folders, under every surface that writes run files. */
async function stateDirs($: EngineInterface): Promise<StateDir[]> {
  const config = await $.env.get('CLAUDE_CONFIG_DIR')
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
  const profile = (config || `${home}/.claude`).replace(/\\/g, '/')
  const dirs: StateDir[] = []

  for (const surface of SURFACES) {
    const base = `${profile}/${surface}`
    if (!(await $.fs.exists(base))) continue
    for (const entry of await $.fs.list(base)) {
      const slug = entry.kind === 'dir' ? HASHED.exec(entry.name)?.[1] : undefined
      if (slug) dirs.push({ runs: `${base}/${entry.name}/runs`, slug })
    }
  }
  return dirs
}

/**
 * The runs the pane shows — this worktree's own, or the main checkout's when it has none, so
 * the pane is never empty in a fresh worktree — and every other checkout's open runs that
 * moved in the last day, which only the gate alert reads.
 */
async function loadRuns($: EngineInterface, isForced: boolean): Promise<{ shown: FlowRun[]; others: FlowRun[] }> {
  const root = (await $.session.root()).replace(/\\/g, '/')
  const dirs = await stateDirs($)
  const of = (slug: string) => dirs.filter(d => d.slug === slug)
  const [main = root] = root.split('/.claude/worktrees/')

  let mine = of(slugOf(root))
  let shown = await readRuns($, mine)
  if (shown.length === 0 && main !== root) {
    mine = of(slugOf(main))
    shown = await readRuns($, mine)
  }
  const now = await $.clock.now()
  if (isForced || now - othersAt >= OTHERS_MS) {
    othersAt = now
    const rest = dirs.filter(d => !mine.includes(d))
    others = (await readRuns($, rest, { since: now - FRESH_MS, limit: MAX_OTHER_RUNS })).filter(r => tone(r.status) !== 'done')
  }
  return { shown, others }
}

/** A profile holds hundreds of checkout folders, so the other checkouts are listed on every fifth poll, or on /flows. */
const OTHERS_MS = 5 * POLL_MS
let othersAt = -Infinity
let others: FlowRun[] = []

/** Stage titles whose phase skill is not their slug, and the stage names an engine before 1.18.0 used. */
const PHASE_ALIASES: Record<string, string> = {
  'create-pull-request': 'create-pr',
  'scope-discovery': 'scope',
  implementation: 'implement',
  validation: 'verify',
  verification: 'spec-check',
  'work-item-update': 'report-back',
}

const phaseKeys = (name: string) => {
  const slug = name.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const phase = PHASE_ALIASES[slug] ?? slug
  return [name, slug, phase, `phase-${phase}`]
}

const names = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(v => (typeof v === 'string' ? v : String((v as any)?.skill ?? (v as any)?.id ?? ''))).filter(Boolean) : []

/**
 * The `runContext.phases` entry for a stage: the qualifier it ran under first, then the bare
 * key, then a qualified `phase-<id>:<q>` entry when it is the only one.
 */
function resolvedEntry(raw: any, name: string, qualifier: unknown): any {
  const flowMap = raw.runContext?.phases?.[raw.skillId] ?? raw.runContext?.phases ?? {}
  const keys = phaseKeys(name)
  const ranUnder = typeof qualifier === 'string' ? flowMap?.[`${keys[3]}:${qualifier}`] : undefined
  if (ranUnder) return ranUnder
  const exact = keys.map(k => flowMap?.[k]).find(Boolean)
  if (exact) return exact
  const qualified = Object.keys(flowMap ?? {}).filter(k => k.startsWith(`${keys[3]}:`))
  const [only] = qualified
  return qualified.length === 1 && only ? flowMap[only] : null
}

/** An effort runner carries the bound agent's body at one effort: `delivery:runner-<effort>`. */
const RUNNER = /^delivery:runner-([a-z]+)$/

/**
 * The worker that did the phase's work: the bound agent when it ran, or an effort runner
 * carrying it, else the longest-running, so a log monitor beside the agent does not name the phase.
 */
const boundWorker = (workers: FlowWorker[], agent: string | null | undefined) =>
  workers.find(w => agent && w.name === agent) ??
  workers.find(w => RUNNER.test(w.name)) ??
  [...workers].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0]

/** The model family, so an alias (`opus`) and the id telemetry records (`opus 5.5`) compare equal. */
const family = (model: string) => model.split(/[\s[]/)[0]

/**
 * How a stage ran. Read from the run when it says — a stage's `execution`, what actually ran,
 * over the resolved `runContext.phases` entry, what the config asked for — and otherwise
 * inferred: a stage a sub-agent worked in was delegated, Personal Validation is the gate, the
 * rest ran inline. Sub-agents that ran under the gate are a revise round's, and say so.
 */
function stageOf(raw: any, s: any, index: number): FlowStage {
  const name = String(s.name ?? '?')
  const ran = s.execution && typeof s.execution === 'object' ? s.execution : {}
  const resolved = resolvedEntry(raw, name, ran.qualifier)
  const execution = { ...(resolved ?? {}), ...ran }
  const isGate = /personal validation/i.test(name) || execution.mode === 'gate'

  const insights: any[] = Array.isArray(raw.insights) ? raw.insights : []
  const workers: FlowWorker[] = insights
    .filter(i => i.kind === 'agent' && i.stageIndex === index)
    .map(i => ({
      name: String(i.agentDisplayName || i.agentName || 'agent'),
      model: shortModel(i.model),
      durationMs: typeof i.durationMs === 'number' ? i.durationMs : null,
      tokens: typeof i.totalTokens === 'number' ? i.totalTokens : null,
      toolCalls: typeof i.totalToolCalls === 'number' ? i.totalToolCalls : null,
      isFailed: i.status === 'failed',
      isRevise: isGate,
    }))
  const declared: string[] = Array.isArray(s.agents) ? s.agents.map(String) : []
  for (const agent of declared) {
    if (!workers.some(w => w.name === agent)) {
      workers.push({ name: agent, model: '', durationMs: null, tokens: null, toolCalls: null, isFailed: false, isRevise: isGate })
    }
  }

  const recorded = execution.runs && !Array.isArray(execution.runs) ? execution.runs : execution.mode
  const mode: FlowMode = isGate
    ? 'gate'
    : recorded === 'fork' || recorded === 'delegate' || recorded === 'inline'
      ? recorded
      : workers.length > 0
        ? 'delegate'
        : 'inline'

  // What ran comes from the stage's own record, then from the sub-agents observed, and only
  // with neither from what was resolved — so a configured agent that never ran is not shown as if it had.
  const worker = mode === 'delegate' || mode === 'fork' ? boundWorker(workers, ran.agent ?? resolved?.agent) : undefined
  const runnerEffort = worker ? RUNNER.exec(worker.name)?.[1] : undefined
  const workerAgent = runnerEffort ? (resolved?.agent ?? 'general-purpose') : worker?.name
  const agent = ran.agent ?? workerAgent ?? resolved?.agent ?? null
  const model = shortModel(ran.model) || worker?.model || shortModel(resolved?.model) || null
  const effort = ran.effort ?? runnerEffort ?? resolved?.effort ?? null
  const configured = resolved
    ? { agent: resolved.agent ?? null, model: shortModel(resolved.model) || null, effort: resolved.effort ?? null }
    : null
  const mismatch: string[] = []
  if (configured && !isGate && tone(String(s.status ?? '')) !== 'pending') {
    if (configured.agent && agent !== configured.agent) mismatch.push('agent')
    if (configured.model && model && family(model) !== family(configured.model)) mismatch.push('model')
    if (configured.effort && (ran.effort ?? runnerEffort) && effort !== configured.effort) mismatch.push('effort')
  }

  return {
    name,
    status: String(s.status ?? 'pending'),
    mode,
    isModeRecorded: recorded !== undefined || isGate,
    agent,
    model,
    effort,
    skill: execution.skill ?? null,
    mcp: execution.mcp === null ? [] : execution.mcp === undefined ? null : names(execution.mcp),
    before: names(execution.before),
    after: names(execution.after),
    fallback: execution.fallback ?? null,
    configured,
    mismatch,
    passes: typeof s.doneCount === 'number' ? s.doneCount : 0,
    round: count(ran.round, 1),
    blockers: count(ran.blockers, 0),
    defectsFound: count(ran.defectsFound, 0),
    durationMs: typeof s.durationMs === 'number' ? s.durationMs : null,
    outputTokens: raw.tokenUsage?.byStage?.[index]?.total?.outputTokens ?? null,
    toolCalls: insights.filter(i => i.kind === 'tool' && i.stageIndex === index).length,
    workers,
    scenarios: Array.isArray(s.scenarios) ? s.scenarios.map((c: any) => ({ name: String(c.name), status: String(c.status) })) : [],
    links: Array.isArray(s.links) ? s.links.map(linkOf).filter((l: FlowLink) => l.label || l.url) : [],
    output: String(s.output ?? '').slice(0, 600),
  }
}

/** A stage count from `execution`: a whole number at or above `min`, else unrecorded. */
const count = (value: unknown, min: number) => (Number.isInteger(value) && (value as number) >= min ? (value as number) : null)

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** What the pass found, for the phase row: `round 2 · 1 blocker`, `0 defects`; empty when the stage records none. */
function countsOf(s: FlowStage): string {
  return [
    s.round !== null ? `round ${s.round}` : '',
    s.blockers !== null ? plural(s.blockers, 'blocker') : '',
    s.defectsFound !== null ? plural(s.defectsFound, 'defect') : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

const linkOf = (l: any): FlowLink =>
  typeof l === 'string'
    ? { label: l, url: /^[a-z][a-z0-9+.-]*:/i.test(l) ? l : '' }
    : { label: String(l?.label ?? l?.url ?? ''), url: String(l?.url ?? '') }

/** What a `Link` takes: `https:`, or `http://localhost`. Any other URL — `127.0.0.1`, a demo's `file:` — is drawn as text. */
const isLinkable = (url: string) => /^(https:|http:\/\/localhost(?=[:/]|$))/i.test(url)

const LIST_LINE =/^\s*(?:[-*•]|\d+[.)])\s+/

/**
 * The open items the Ready stage handed to the gate: the text after `Open items`, split on
 * `(1)` numbering or on list lines, else taken whole; with no such marker, its list lines.
 */
function openItemsOf(output: unknown): string[] {
  const text = String(output ?? '')
  const listed = (body: string) => body.split('\n').filter(l => LIST_LINE.test(l)).map(l => l.replace(LIST_LINE, ''))
  const marker = /open items?[^:]*:/i.exec(text)
  if (!marker) return listed(text)
  const rest = text.slice(marker.index + marker[0].length).trim()
  const items = rest.includes('(1)')
    ? rest.split(/\s*\(\d+\)\s*/)
    : listed(rest).length > 0
      ? listed(rest)
      : [rest]
  return items.map(item => item.trim().replace(/[;.]$/, '')).filter(Boolean)
}

/** Each run file parsed, by path, kept while its modification time holds: every checkout is polled. */
const parsed = new Map<string, { mtimeMs: number; run: FlowRun }>()

type ReadOptions = { since?: number; limit?: number }

async function readRuns($: EngineInterface, dirs: StateDir[], options: ReadOptions = {}): Promise<FlowRun[]> {
  const sessionId = await $.session.id()
  const byId = new Map<string, FlowRun>()

  for (const { runs: dir, slug } of dirs) {
    if (!(await $.fs.exists(dir))) continue
    const files = (await $.fs.list(dir))
      .filter(f => f.kind === 'file' && f.name.endsWith('.json') && f.mtimeMs >= (options.since ?? 0))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, 20)

    for (const file of files) {
      const path = `${dir}/${file.name}`
      const cached = parsed.get(path)
      const run = cached?.mtimeMs === file.mtimeMs ? cached.run : await parseRun($, path, slug, sessionId)
      if (!run) continue
      parsed.set(path, { mtimeMs: file.mtimeMs, run })
      const known = byId.get(run.id)
      if (!known || known.updatedAt < run.updatedAt) byId.set(run.id, run)
    }
  }

  return [...byId.values()]
    .sort((a, b) =>
      a.isThisSession !== b.isThisSession ? (a.isThisSession ? -1 : 1) : b.updatedAt.localeCompare(a.updatedAt),
    )
    .slice(0, options.limit ?? MAX_RUNS)
}

/** One run file as the view draws it; undefined for a file that is not a run, or is mid-write and read again next poll. */
async function parseRun($: EngineInterface, path: string, slug: string, sessionId: string): Promise<FlowRun | undefined> {
  try {
    const raw = JSON.parse(String(await $.fs.read(path)))
    if (!raw?.id || !Array.isArray(raw.stages)) return undefined
    const stages: any[] = raw.stages
    return {
      id: raw.id,
      skillId: raw.skillId ?? 'flow',
      title: raw.title || raw.originalPrompt || raw.id,
      repo: String(raw.repo ?? '').split('/').pop() || slug,
      status: raw.status ?? '',
      changeKind: raw.changeKind ?? '',
      approval: raw.approval?.state ?? '',
      updatedAt: raw.updatedAt ?? '',
      startedAt: raw.startedAt ?? '',
      isThisSession: Array.isArray(raw.sessionIds) && raw.sessionIds.includes(sessionId),
      contextPeak: raw.context?.peakTokens ?? null,
      contextLimit: raw.context?.tokenLimit ?? null,
      openItems: openItemsOf(stages.find(s => /^ready$/i.test(String(s?.name ?? '')))?.output),
      stages: stages.map((s, i) => stageOf(raw, s, i)),
    }
  } catch {
    return undefined
  }
}

// ── /flows-demo: a flow-code run in memory only, in the shape the surface contract records ──
// It is built as a run file and read through stageOf, so the demo draws what a real run would.
// Scope shows a fallback: the configured architect is not installed, so general-purpose ran.

const DEMO_STEP_MS = 4000
type DemoStage = [name: string, phase: string, output: string]
const DEMO_STAGES: DemoStage[] = [
  ['Update Base', 'phase-update-base', 'Fast-forwarded to origin/main (bfcf9b8b).'],
  ['Scope', 'phase-scope', 'Kind: feature. 4 acceptance criteria, 3 seams, 5 devbook chapters selected.'],
  ['Implement', 'phase-implement', 'Red-green at 3 seams; backend first, then the UI against its interface summary.'],
  ['Review', 'phase-review', 'Pass 1: 1 blocker (rule: ui-components.md, Tasks/Editor.razor:88) → back to implement. Pass 2: clean, 2 advisories.'],
  ['Build & Test', 'phase-build-test', 'Build green, 4,312 tests passed.'],
  ['Verify', 'phase-verify', 'Full depth with capture through Aspire; logs monitored, no errors.'],
  ['Spec Check', 'phase-spec-check', '5 chapters: 4 aligned, 1 code-ahead (reported).'],
  ['Ready', 'phase-ready', 'Budget spent on round 2. Open items: (1) S3 Redo after reload is flaky; (2) features.md is code-ahead on undo history.'],
  ['Personal Validation', 'phase-personal-validation', 'Waiting for your approval. Review links published.'],
  ['Create Pull Request', 'phase-create-pr', 'Pushed and opened the pull request.'],
  ['Report Back', 'phase-report-back', 'Commented on the origin entry and ticked its steps.'],
  ['Summary', 'phase-summary', 'Run summary written.'],
]
const DEMO_PHASES: Record<string, { mode: FlowMode; [field: string]: unknown }> = {
  'phase-update-base': { mode: 'inline', skill: 'delivery:phase-update-base', before: ['devbook:validate'] },
  'phase-scope': { mode: 'delegate', agent: 'architecture:architect', skill: 'delivery:phase-scope', model: 'opus', mcp: ['backlog'] },
  'phase-implement': { mode: 'delegate', agent: 'csharp-coding:coding', skill: 'delivery:phase-implement', model: 'opus', effort: 'high' },
  'phase-review': { mode: 'fork', skill: 'delivery:phase-review' },
  'phase-build-test': { mode: 'delegate', agent: 'general-purpose', runner: 'delivery:runner-low', skill: 'delivery:phase-build-test', model: 'sonnet', effort: 'low', mcp: [] },
  'phase-verify': { mode: 'delegate', agent: 'qa:qa', skill: 'delivery:phase-verify', mcp: ['aspire'] },
  'phase-spec-check': { mode: 'delegate', agent: 'general-purpose', runner: 'delivery:runner-xhigh', skill: 'devbook:verify-change', model: 'opus', effort: 'xhigh' },
  'phase-ready': { mode: 'inline', skill: 'delivery:phase-ready' },
  'phase-personal-validation': { mode: 'gate', skill: 'delivery:phase-personal-validation' },
  'phase-create-pr': { mode: 'inline', skill: 'delivery:phase-create-pr', mcp: ['backlog'] },
  'phase-report-back': { mode: 'delegate', agent: 'general-purpose', skill: 'delivery:phase-report-back', model: 'haiku' },
  'phase-summary': { mode: 'inline', skill: 'delivery:phase-summary', after: ['devbook:update'] },
}
const DEMO_EXECUTION: Record<string, object> = {
  Scope: { agent: 'general-purpose', fallback: 'architecture:architect' },
  Implement: { round: 2 },
  Review: { round: 2, blockers: 0 },
  Verify: { defectsFound: 0 },
}
type DemoWorker = [name: string, model: string, durationMs: number, tokens: number, toolCalls: number]
const DEMO_WORKERS: Record<string, DemoWorker[]> = {
  Scope: [['general-purpose', 'claude-opus-5-5', 141000, 52000, 33]],
  Implement: [
    ['csharp-coding:coding', 'claude-opus-5-5', 192000, 81000, 41],
    ['csharp-coding:coding', 'claude-opus-5-5', 236000, 64000, 37],
  ],
  Review: [['general-purpose', 'claude-opus-5-5', 88000, 30000, 19]],
  'Build & Test': [['delivery:runner-low', 'claude-sonnet-5-5', 263000, 21000, 12]],
  Verify: [
    ['qa:qa-monitor', 'claude-haiku-4-5', 398000, 18000, 22],
    ['qa:qa', 'claude-sonnet-5-5', 411000, 122000, 96],
  ],
  'Spec Check': [['delivery:runner-xhigh', 'claude-opus-5-5', 154000, 40000, 28]],
  'Report Back': [['general-purpose', 'claude-haiku-4-5', 31000, 6000, 5]],
}
let demoStartedAt: number | undefined

function demoRun(now: number): FlowRun {
  const at = Math.floor((now - (demoStartedAt ?? now)) / DEMO_STEP_MS)
  const reviewAt = DEMO_STAGES.findIndex(s => s[0] === 'Review')
  const raw = {
    skillId: 'flow-code',
    runContext: { phases: { 'flow-code': DEMO_PHASES } },
    insights: DEMO_STAGES.flatMap(([name], i) =>
      i > at
        ? []
        : (DEMO_WORKERS[name] ?? []).map(([agentName, model, durationMs, totalTokens, totalToolCalls]) => ({
            kind: 'agent',
            status: 'completed',
            stageIndex: i,
            agentName,
            model,
            durationMs,
            totalTokens,
            totalToolCalls,
          })),
    ),
    tokenUsage: {
      byStage: DEMO_STAGES.map(([, phase], i) => ({
        total: { outputTokens: i < at && DEMO_PHASES[phase]?.mode !== 'inline' ? 12_000 + i * 9_000 : null },
      })),
    },
  }

  return {
    id: 'demo-run',
    skillId: 'flow-code',
    title: 'Demo · Undo (Ctrl+Z) for backlog tasks',
    repo: 'demo',
    status: at >= DEMO_STAGES.length ? 'done' : 'in_progress',
    changeKind: 'feature',
    approval: at > 8 ? 'approved' : at === 8 ? 'pending' : '',
    updatedAt: `demo-${Math.min(at, DEMO_STAGES.length)}`,
    startedAt: new Date(demoStartedAt ?? now).toISOString(),
    isThisSession: true,
    contextPeak: 90_000 + Math.min(at, 12) * 21_000,
    contextLimit: 1_000_000,
    openItems: at > DEMO_STAGES.findIndex(s => s[0] === 'Ready') ? openItemsOf(DEMO_STAGES.find(s => s[0] === 'Ready')?.[2]) : [],
    stages: DEMO_STAGES.map(([name, phase, output], i) => {
      const isGate = DEMO_PHASES[phase]?.mode === 'gate'
      const isReached = i <= at
      const stage = {
        name,
        status: i < at ? 'done' : i === at ? (isGate ? 'awaiting_approval' : 'in_progress') : 'pending',
        doneCount: (i < at ? 1 : 0) + (name === 'Implement' && at > reviewAt ? 1 : 0) + (name === 'Review' && at > reviewAt ? 1 : 0),
        durationMs: i < at ? DEMO_STEP_MS * (4 + ((i * 37) % 60)) : null,
        execution: isReached ? DEMO_EXECUTION[name] : undefined,
        scenarios:
          name === 'Verify' && i < at
            ? [
                { name: 'S1 Undo a status change', status: 'pass' },
                { name: 'S2 Undo a reorder', status: 'pass' },
                { name: 'S3 Redo after reload', status: 'flaky' },
              ]
            : [],
        links: name === 'Personal Validation' && isReached ? [
                { label: 'Backlog board, undo', url: 'http://localhost:5173/board?undo' },
                { label: 'Aspire dashboard', url: 'http://localhost:18888/' },
              ] : [],
        output: isReached ? output : '',
      }
      return { ...stageOf(raw, stage, i), toolCalls: i < at ? 3 + ((i * 13) % 40) : 0 }
    }),
  }
}

// ── What the detail says about how a phase ran ───────────────────────────────

type HowLine = { text: string; isDrift: boolean }
type Field = 'agent' | 'model' | 'effort'

/** The phase's procedure, servers, and chores, then — where they differ — what the run resolved against what ran. */
function how(s: FlowStage): HowLine[] {
  const lines: HowLine[] = []
  const mcp = s.mcp === null ? '' : s.mcp.length === 0 ? 'mcp none' : `mcp ${s.mcp.join(', ')}`
  const facts = [s.skill ? `skill ${s.skill}` : '', mcp].filter(Boolean)
  if (facts.length > 0) lines.push({ text: facts.join(' · '), isDrift: false })
  const chores = [s.before.length ? `before ${s.before.join(', ')}` : '', s.after.length ? `after ${s.after.join(', ')}` : ''].filter(Boolean)
  if (chores.length > 0) lines.push({ text: chores.join(' · '), isDrift: false })
  if (s.fallback) lines.push({ text: `≠ ${s.fallback} did not resolve; ran ${s.agent ?? 'the built-in procedure'}`, isDrift: true })
  const configured = s.configured
  if (configured && s.mismatch.length > 0) {
    const field = (f: Field) => `${f} ${configured[f] ?? 'session'} → ${s[f] ?? 'session'}`
    lines.push({ text: `≠ configured vs ran: ${(s.mismatch as Field[]).map(field).join(' · ')}`, isDrift: true })
  }
  if (!configured && !s.isModeRecorded) {
    lines.push({ text: 'This run records no resolved phases: mode and agent are inferred.', isDrift: false })
  }
  return lines
}

// ── Polling ──────────────────────────────────────────────────────────────────

const signature = (list: FlowRun[]) => list.map(r => `${r.id}@${r.updatedAt}`).join('|')

const currentStage = (run: FlowRun) =>
  run.stages.find(s => ['active', 'waiting', 'blocked'].includes(tone(s.status)))

type Gate = { run: FlowRun; stage: FlowStage; tone: Tone }

const gateLabel = (s: FlowStage) => (isPersonalValidation(s) ? 'PV' : s.name)

/**
 * Every run's stages against the tones seen on the last poll: a stage that turned `waiting` or
 * `blocked` since raises one toast and one sound, and the first poll of a session only takes
 * the baseline. Returns the gates waiting now.
 */
async function alertGates($: EngineInterface, runs: FlowRun[]): Promise<Gate[]> {
  const { value: before } = await $.state.get(SEEN)
  const seen: Record<string, string> = {}
  const waiting: Gate[] = []
  const turned: Gate[] = []

  for (const run of runs) {
    run.stages.forEach((stage, i) => {
      const key = `${run.id}#${i}`
      const t = stageTone(stage)
      seen[key] = t
      if (t === 'waiting') waiting.push({ run, stage, tone: t })
      if ((t === 'waiting' || t === 'blocked') && before && before[key] !== t) turned.push({ run, stage, tone: t })
    })
  }
  if (JSON.stringify(seen) !== JSON.stringify(before ?? {})) await $.state.set(SEEN, seen)

  for (const { run, stage, tone: t } of turned) {
    // One short line: the mark says waiting or blocked, so the words do not repeat it.
    $.ui.toast(`${MARK[t]} ${gateLabel(stage)} ${run.repo} · ${run.title}`, { timeoutMs: 8000 })
  }
  // A surface with no player plays nothing; the toast and the status line still say it.
  if (turned.length > 0) void $.audio.play({ asset: GATE_SOUND }).catch(() => undefined)
  return waiting
}

async function refresh($: EngineInterface, isForced = false) {
  const { shown, others } = await loadRuns($, isForced)
  const fresh = demoStartedAt === undefined ? shown : [demoRun(await $.clock.now()), ...shown].slice(0, MAX_RUNS)
  const { value: current = [] } = await $.state.get(RUNS)
  if (signature(fresh) !== signature(current)) await $.state.set(RUNS, fresh)

  const watched = new Map([...others, ...fresh.filter(r => tone(r.status) !== 'done')].map(r => [r.id, r]))
  const waiting = (await alertGates($, [...watched.values()])).sort((a, b) => Number(b.run.isThisSession) - Number(a.run.isThisSession))
  const [gate] = waiting
  const mine = fresh.find(r => r.isThisSession && tone(r.status) !== 'done')
  const stage = mine ? currentStage(mine) : undefined
  $.ui.status(
    gate
      ? `${MARK.waiting} ${gateLabel(gate.stage)}: ${gate.run.repo} ${gate.run.title}${waiting.length > 1 ? ` +${waiting.length - 1}` : ''}`
      : mine
        ? `${mine.skillId} · ${stage?.name ?? mine.status}`
        : undefined,
  )

  // The pane opens itself once per run of this session, the first time that run appears; closed
  // after that, it stays closed. Another session's run, or the main checkout's, never opens it.
  const unseen = fresh.find(r => r.isThisSession && !openedFor.has(r.id))
  if (unseen) {
    openedFor.add(unseen.id)
    void openPane($)
  }
}

const openedFor = new Set<string>()

const openPane = ($: EngineInterface) => $.ui.open({ id: PANE, title: 'Delivery flows' })

/** The gate's three answers, in the flow-runner's words: approve, revise, decline. */
type GateReply = { key: 'approve' | 'revise' | 'reject'; label: string; text: string; glyph: string; color: string }
const GATE_REPLIES: GateReply[] = [
  { key: 'approve', label: 'Approve', text: 'Personal Validation: approve.', glyph: MARK.done, color: COLOR.done },
  { key: 'revise', label: 'Revise', text: 'Personal Validation: revise.', glyph: '↺', color: 'yellow' },
  { key: 'reject', label: 'Reject', text: 'Personal Validation: decline.', glyph: MARK.blocked, color: COLOR.blocked },
]

/** A press submits the reply as the person's own prompt; the demo's has no session to answer, so it says what it would send. */
async function answerGate($: EngineInterface, run: FlowRun, reply: GateReply) {
  if (run.id === 'demo-run') {
    $.ui.toast(`Demo: would send "${reply.text}"`)
    return
  }
  await $.prompt.submit({ text: reply.text, asUser: true })
}

const isSurfaceTool = (tool: string, op: string) => /delivery-surface-/.test(tool) && tool.endsWith(`__${op}`)

// ── Hooks ────────────────────────────────────────────────────────────────────

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'flows',
      description: "Show this worktree's delivery flow runs as a live phase timeline",
    })
    await $.command.register({
      name: 'flows-demo',
      description: 'Play a simulated flow-code run in the delivery flows pane (in memory only)',
    })
    await refresh($)
    $.clock.every(POLL_MS, () => refresh($))

    return next(e)
  })

  on('command.run', { command: 'flows' }, async $ => {
    await refresh($, true)
    await openPane($)

    return { text: 'Delivery flows pane opened.' }
  })

  on('command.run', { command: 'flows-demo' }, async $ => {
    demoStartedAt = await $.clock.now()
    await $.state.set(SELECTED, 0)
    await $.state.set(FOCUS, -1)
    await refresh($)
    await openPane($)

    return { text: `Simulating a flow-code run: one phase every ${DEMO_STEP_MS / 1000}s, about 50s in all.` }
  })

  // The pane: the whole run, top to bottom — one row per phase, its workers hung under it,
  // and the focused phase opened in place.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link } = $.ui.resolve(e)
    const { value: list = [] } = await $.state.get(RUNS)
    const index =Math.min((await $.state.get(SELECTED)).value ?? 0, Math.max(0, list.length - 1))
    const pinned = (await $.state.get(FOCUS)).value ?? -1
    const run = list[index]
    const columns = (e.props as any)?.bodyColumns ?? e.viewport?.columns ?? 60
    const isWide = columns >= 72

    if (!run) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No delivery runs for this worktree yet.</Text>
          <Text dimColor>A flow-* skill reports its phases here as it runs. /flows-demo plays one.</Text>
        </Box>
      )
    }

    const done = run.stages.filter(s => tone(s.status) === 'done').length
    const live = currentStage(run)
    const focused =
      pinned >= 0 && pinned < run.stages.length
        ? pinned
        : live
          ? run.stages.indexOf(live)
          : run.stages.reduce((last, s, i) => (tone(s.status) === 'pending' ? last : i), 0)
    const gate = run.isThisSession && live && isPersonalValidation(live) && stageTone(live) === 'waiting' ? live : undefined
    const elapsed = run.startedAt && !run.id.startsWith('demo') ? Date.now() - Date.parse(run.startedAt) : null
    const context = run.contextPeak && run.contextLimit ? `${Math.round((run.contextPeak / run.contextLimit) * 100)}% context` : ''
    const facts = [run.skillId, run.changeKind, `${done}/${run.stages.length}`, duration(elapsed), context]
      .filter(Boolean)
      .join(' · ')

    const badge = (s: FlowStage) => (
      <Text color={MODE_COLOR[s.mode]} dimColor={!s.isModeRecorded}>
        {MODE_LABEL[s.mode]}
        {s.isModeRecorded ? '' : '?'}
      </Text>
    )
    const who = (s: FlowStage) =>
      [s.agent, [s.model, s.effort].filter(Boolean).join('/')].filter(Boolean).join(' · ')

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold wrap="truncate-end">
            {run.title}
          </Text>
          {list.length > 1 && (
            <Box flexDirection="row" gap={1} flexShrink={0}>
              <Button key="prev" plain onPress={() => $.state.set(SELECTED, (index - 1 + list.length) % list.length)}>
                ‹
              </Button>
              <Text dimColor>
                {index + 1}/{list.length}
              </Text>
              <Button key="next" plain onPress={() => $.state.set(SELECTED, (index + 1) % list.length)}>
                ›
              </Button>
            </Box>
          )}
        </Box>
        <Text dimColor wrap="truncate-end">
          {facts}
          {run.isThisSession ? ' · this session' : ''}
        </Text>
        <Box flexDirection="row" gap={2} marginBottom={1}>
          <Text color={MODE_COLOR.inline}>inline</Text>
          <Text color={MODE_COLOR.delegate}>delegate</Text>
          <Text color={MODE_COLOR.fork}>fork</Text>
          <Text color={MODE_COLOR.gate}>gate</Text>
          <Text dimColor>? = inferred</Text>
          <Text color="yellow">≠ = not as configured</Text>
        </Box>

        {gate && (
          <Box key="pv" flexDirection="column" marginBottom={1} borderStyle="round" borderColor={COLOR.waiting} paddingX={1}>
            <Text bold color={COLOR.waiting}>
              {MARK.waiting} {gate.name}: your review
            </Text>
            {gate.links.map(l =>
              isLinkable(l.url) ? (
                <Text wrap="truncate-end">
                  ↗ <Link href={l.url} label={l.label || l.url} />
                </Text>
              ) : (
                <Text wrap="truncate-end">
                  ↗ {l.label}
                  {l.label && l.url ? '  ' : ''}
                  <Text dimColor>{l.url}</Text>
                </Text>
              ),
            )}
            {gate.links.length === 0 && <Text dimColor>No review links on the stage yet.</Text>}
            <Text dimColor>Open items from Ready</Text>
            {run.openItems.length > 0 ? (
              run.openItems.map(item => (
                <Text color="yellow" wrap="wrap">
                  • {item}
                </Text>
              ))
            ) : (
              <Text dimColor>None recorded.</Text>
            )}
            <Box flexDirection="row" gap={2} marginTop={1}>
              {GATE_REPLIES.map(reply => (
                // Button takes no colour, so a coloured glyph in front of it carries the tone.
                <Box key={`pv-${reply.key}-row`} flexDirection="row" gap={1}>
                  <Text color={reply.color}>{reply.glyph}</Text>
                  <Button
                    key={`pv-${reply.key}`}
                    variant={reply.key === 'approve' ? 'primary' : 'secondary'}
                    onPress={() => answerGate($, run, reply)}
                  >
                    {reply.label}
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {run.stages.map((s, i) => {
          const t = tone(s.status)
          const isFocused = i === focused
          const rail = i === run.stages.length - 1 ? ' ' : '│'
          const right = [s.passes > 1 ? `↺${s.passes}` : '', duration(s.durationMs)].filter(Boolean).join(' ')
          return (
            <Box key={`p${i}`} flexDirection="column">
              <Box flexDirection="row" gap={1}>
                <Text color={COLOR[t]}>{MARK[t]}</Text>
                <Box flexGrow={1} flexShrink={1}>
                  <Button key={`f${i}`} plain onPress={() => $.state.set(FOCUS, isFocused ? -1 : i)}>
                    {s.name}
                  </Button>
                </Box>
                {badge(s)}
                {(s.mismatch.length > 0 || s.fallback) && <Text color="yellow">≠</Text>}
                {countsOf(s) && (
                  <Text
                    color={s.defectsFound ? 'red' : s.blockers ? 'yellow' : undefined}
                    dimColor={!s.defectsFound && !s.blockers}
                    wrap="truncate-end"
                  >
                    {countsOf(s)}
                  </Text>
                )}
                {isWide && who(s) && (
                  <Text dimColor wrap="truncate-end">
                    {who(s)}
                  </Text>
                )}
                {right && (
                  <Text dimColor={!isQuiet(t)} color={s.passes > 1 ? 'yellow' : undefined}>
                    {right}
                  </Text>
                )}
              </Box>
              {!isWide && who(s) && !isQuiet(t) && (
                <Text dimColor wrap="truncate-end">
                  {rail} {who(s)}
                </Text>
              )}
              {s.workers.map((w, k) => (
                <Text color={w.isFailed ? 'red' : 'cyan'} dimColor={t === 'done' && !isFocused} wrap="truncate-end">
                  {k === s.workers.length - 1 ? '╰─▶' : '├─▶'} {w.name}
                  {[w.isRevise ? 'revise round' : '', w.model, duration(w.durationMs), w.toolCalls ? `${w.toolCalls} tools` : '', tokens(w.tokens)]
                    .filter(Boolean)
                    .map(x => ` · ${x}`)
                    .join('')}
                </Text>
              ))}
              {isFocused && !isQuiet(t) && (
                <Box flexDirection="column" marginLeft={2} marginBottom={1} borderStyle="single" borderColor={COLOR[t]} paddingX={1}>
                  {s.output ? <Text wrap="wrap">{s.output}</Text> : <Text dimColor>No output yet.</Text>}
                  {how(s).map(line => (
                    <Text dimColor={!line.isDrift} color={line.isDrift ? 'yellow' : undefined} wrap="truncate-end">
                      {line.text}
                    </Text>
                  ))}
                  {s.scenarios.map(c => (
                    <Text color={c.status === 'pass' ? 'green' : c.status === 'fail' ? 'red' : 'yellow'} wrap="truncate-end">
                      {c.status === 'pass' ? '✓' : c.status === 'fail' ? '✗' : '~'} {c.name}
                    </Text>
                  ))}
                  {s.links.length > 0 && <Text color="blue">↗ {s.links.map(l => l.label || l.url).join('  ↗ ')}</Text>}
                  {(s.outputTokens || s.toolCalls > 0) && (
                    <Text dimColor>
                      {[s.outputTokens ? `${tokens(s.outputTokens)} output tokens` : '', s.toolCalls ? `${s.toolCalls} tool calls` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  )}
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    )
  })

  // The band: one row above the prompt while this session's run is open — the rail and the phase it is in.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if ((e.props as any)?.hasSurvey) return next(e)
    const { value: list = [] } = await $.state.get(RUNS)
    const run = list.find(r => r.isThisSession && tone(r.status) !== 'done')
    if (!run) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const live = currentStage(run)
    return (
      <Box flexDirection="row" gap={1}>
        <Text bold>{run.skillId}</Text>
        <Box flexDirection="row">
          {run.stages.map(s => (
            <Text color={COLOR[tone(s.status)]}>{s.mode === 'gate' && tone(s.status) === 'pending' ? '◇' : MARK[tone(s.status)]}</Text>
          ))}
        </Box>
        {live && (
          <Text wrap="truncate-end">
            <Text color={COLOR[tone(live.status)]}>{live.name}</Text>
            <Text color={MODE_COLOR[live.mode]}> {MODE_LABEL[live.mode]}</Text>
          </Text>
        )}
        <Button key="open" plain onPress={() => $.ui.open({ id: PANE, title: 'Delivery flows' })}>
          details
        </Button>
      </Box>
    )
  })

  // Inline: a surface call in the transcript reads as the phase change it records, not as JSON.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const props = e.props as any
    const tool = String(props?.tool ?? '')
    const input = (props?.input ?? {}) as any
    const isStage = isSurfaceTool(tool, 'update_stage')
    const isStart = isSurfaceTool(tool, 'start_run')
    if (!isStage && !isStart) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const surface = tool.includes('backlog') ? 'Backlog' : 'dashboard'

    if (isStart) {
      const names: string[] = Array.isArray(input.stages) ? input.stages.map((s: any) => String(s?.name ?? s)) : []
      return (
        <Box flexDirection="column">
          <Text>
            <Text bold>▶ {input.skillId ?? 'flow'}</Text>
            <Text dimColor> started on the {surface} · {names.length} phases</Text>
          </Text>
          {names.length > 0 && (
            <Text dimColor wrap="truncate-end">
              {'  '}
              {names.join(' → ')}
            </Text>
          )}
        </Box>
      )
    }

    const t = tone(String(input.status ?? ''))
    const { value: list = [] } = await $.state.get(RUNS)
    const run = list.find(r => r.isThisSession) ?? list[0]
    const stage =
      run?.stages.find(s => s.name === input.stageName) ??
      (typeof input.stageIndex === 'number' ? run?.stages[input.stageIndex] : undefined)
    const name = input.stageName ?? stage?.name ?? `stage ${input.stageIndex ?? '?'}`
    const scenarios: any[] = Array.isArray(input.scenarios) ? input.scenarios : []
    const passed = scenarios.filter(c => c.status === 'pass').length

    return (
      <Box flexDirection="column">
        <Text wrap="truncate-end">
          <Text color={COLOR[t]}>{MARK[t]} </Text>
          <Text bold>{name}</Text>
          <Text color={COLOR[t]}> {String(input.status ?? '').replace(/_/g, ' ')}</Text>
          {stage && <Text color={MODE_COLOR[stage.mode]}> · {MODE_LABEL[stage.mode]}</Text>}
          {stage?.agent && <Text dimColor> · {stage.agent}</Text>}
          {scenarios.length > 0 && <Text dimColor> · {passed}/{scenarios.length} scenarios pass</Text>}
          <Text dimColor> · {surface}</Text>
        </Text>
        {t !== 'active' && input.output && (
          <Text dimColor wrap="truncate-end">
            {'  '}
            {String(input.output).split('\n')[0]}
          </Text>
        )}
      </Box>
    )
  })
}
