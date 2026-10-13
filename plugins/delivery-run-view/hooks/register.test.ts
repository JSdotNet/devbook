import type { FsEntry, On } from 'claude-code'
import { type Engine, expect, mock, test } from 'claude-code/testing'

import type { FlowRun } from '../types'

const PROFILE = 'C:/Users/dev/.claude'
const SESSION = 'session-1'
const NOW = Date.parse('2026-10-07T12:00:00.000Z')

/** The engine hands a path over in the platform's spelling; the fake profile keys on forward slashes. */
const slashed = (path: string) => path.replace(/\\/g, '/')

const DAY = 24 * 60 * 60 * 1000

const dir = (name: string): FsEntry => ({ name, kind: 'dir', size: 0, mtimeMs: 0, isLink: false })
const file = (name: string, mtimeMs: number): FsEntry => ({ name, kind: 'file', size: 1, mtimeMs, isLink: false })

const runFile = (id: string, sessionIds: string[]) =>
  JSON.stringify({
    id,
    skillId: 'flow-code',
    title: id,
    status: 'in_progress',
    updatedAt: '2026-10-06T21:00:00.000Z',
    sessionIds,
    stages: [{ name: 'Scope', status: 'in_progress' }],
  })

/**
 * A profile holding `files` (path → content) under the surfaces' folders, a worktree at `root`.
 * A file is a day old unless `mtimes` says otherwise; both may change between polls.
 */
function machine(on: On, root: string, files: Record<string, string>, mtimes: Record<string, number> = {}) {
  mock.env(on, { CLAUDE_CONFIG_DIR: PROFILE })
  on('session.root', () => ({ value: root }))
  on('session.id', () => ({ value: SESSION }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))

  const seen = {
    read: [] as string[],
    opened: [] as string[],
    status: [] as (string | undefined)[],
    toasts: [] as string[],
    sounds: [] as unknown[],
    prompts: [] as string[],
  }
  on('ui.status', ($, e) => {
    seen.status.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    seen.toasts.push(e.text)
    return { value: undefined }
  })
  on('audio.play', ($, e) => {
    seen.sounds.push(e.clip)
    return { value: undefined }
  })
  on('prompt.submit', ($, e) => {
    seen.prompts.push(e.text)
    return { text: e.text }
  })

  const paths = Object.keys(files)
  on('fs.exists', ($, e) => ({ value: paths.some(p => p === slashed(e.path) || p.startsWith(`${slashed(e.path)}/`)) }))
  on('fs.read', ($, e) => {
    seen.read.push(slashed(e.path))
    return { value: files[slashed(e.path)] ?? '' }
  })
  on('fs.list', ($, e) => {
    const path = slashed(e.path)
    const children = new Map<string, FsEntry>()
    for (const p of paths.filter(p => p.startsWith(`${path}/`))) {
      const [name = '', ...rest] = p.slice(path.length + 1).split('/')
      children.set(name, rest.length > 0 ? dir(name) : file(name, mtimes[p] ?? NOW - 2 * DAY))
    }
    return { value: [...children.values()] }
  })

  on('ui.open', ($, e) => {
    seen.opened.push(e.id)
    return { value: { isPlaced: true as const } }
  })
  return seen
}

/** The person typing /flows, which polls the run files once more. */
const typedFlows = ($: Engine) => () =>
  $.command.run({ command: 'flows', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } })

const start = ($: Engine, cwd: string) =>
  $.session.start({ cwd, surface: 'desktop', isInteractive: true })

test("discovers the worktree's <slug>-<hash> folder and opens the pane for this session's run", async ($, on) => {
  const root = 'D:/Repos/App/.claude/worktrees/fix-pairing-be2949'
  const seen = machine(on, root, {
    [`${PROFILE}/backlog/fix-pairing-be2949-85435863/runs/run-a.json`]: runFile('run-a', [SESSION]),
    [`${PROFILE}/backlog/other-worktree-0123abcd/runs/run-b.json`]: runFile('run-b', [SESSION]),
  })

  await start($, root)

  expect(seen.read).toEqual([`${PROFILE}/backlog/fix-pairing-be2949-85435863/runs/run-a.json`])
  expect(seen.status.at(-1)).toBe('flow-code · Scope')
  expect(seen.opened).toEqual(['delivery-run-view'])
})

test("shows the main checkout's runs in a fresh worktree without opening the pane for them", async ($, on) => {
  const root = 'D:/Repos/App/.claude/worktrees/fresh-c0ffee'
  const seen = machine(on, root, {
    [`${PROFILE}/delivery-surface-dashboard/App-43b9057e/runs/run-m.json`]: runFile('run-m', ['an-older-session']),
  })

  await start($, root)

  expect(seen.read).toEqual([`${PROFILE}/delivery-surface-dashboard/App-43b9057e/runs/run-m.json`])
  expect(seen.status.at(-1)).toBeUndefined()
  expect(seen.opened).toEqual([])
})

/** The runs the plugin stored, kept by a state stub beneath it. */
function storedRuns(on: On) {
  const state = new Map<string, unknown>()
  on('state.set', ($, e) => {
    state.set(e.key, e.value)
    return { value: { isSet: true as const, version: state.size } }
  })
  on('state.get', ($, e) => ({ value: { value: state.get(e.key) as any, version: 0 } }))
  return () => (state.get('runs') ?? []) as FlowRun[]
}
const ROOT = 'D:/Repos/App/.claude/worktrees/phase-view-5f00d1'
const at = (name: string) => `${PROFILE}/backlog/phase-view-5f00d1-0badc0de/runs/${name}`

const agentRan = (stageIndex: number, agentName: string, durationMs: number) =>
  ({ kind: 'agent', status: 'completed', stageIndex, agentName, model: 'claude-opus-5-5', durationMs })

test('reads how each phase resolved and ran, and marks where they differ', async ($, on) => {
  const runs = storedRuns(on)
  machine(on, ROOT, {
    [at('run-p.json')]: JSON.stringify({
      id: 'run-p',
      skillId: 'flow-code',
      updatedAt: '2026-10-07T10:00:00.000Z',
      sessionIds: [SESSION],
      runContext: {
        phases: {
          'flow-code': {
            'phase-update-base': { mode: 'inline', skill: 'delivery:phase-update-base', before: ['devbook:validate'] },
            'phase-implement': { mode: 'delegate', agent: 'csharp-coding:coding', skill: 'delivery:phase-implement', model: 'opus' },
            'phase-build-test': { mode: 'delegate', agent: 'general-purpose', mcp: null },
            'phase-create-pr': { mode: 'inline', mcp: ['backlog'] },
          },
        },
      },
      stages: [
        { name: 'Update Base', status: 'done' },
        { name: 'Implement', status: 'done', execution: { agent: 'general-purpose', fallback: 'csharp-coding:coding' } },
        { name: 'Build & Test', status: 'done' },
        { name: 'Create Pull Request', status: 'pending' },
      ],
      insights: [agentRan(1, 'general-purpose', 9000), agentRan(2, 'general-purpose', 4000)],
    }),
  })

  await start($, ROOT)
  const [run] = runs()
  const [base, implement, buildTest, pr] = run!.stages

  expect([base!.mode, base!.isModeRecorded, base!.before]).toEqual(['inline', true, ['devbook:validate']])
  expect([implement!.agent, implement!.skill, implement!.model, implement!.fallback]).toEqual([
    'general-purpose', 'delivery:phase-implement', 'opus 5.5', 'csharp-coding:coding',
  ])
  expect(implement!.configured?.agent).toBe('csharp-coding:coding')
  expect(implement!.mismatch).toEqual(['agent'])
  expect([buildTest!.mode, buildTest!.mcp, buildTest!.mismatch]).toEqual(['delegate', [], []])
  expect(pr!.mcp).toEqual(['backlog'])
})

test('reads the round, blockers, and defects a stage records, and ignores what is not a count', async ($, on) => {
  const runs = storedRuns(on)
  machine(on, ROOT, {
    [at('run-q.json')]: JSON.stringify({
      id: 'run-q',
      skillId: 'flow-code',
      updatedAt: '2026-10-07T10:00:00.000Z',
      sessionIds: [SESSION],
      stages: [
        { name: 'Implement', status: 'done', execution: { mode: 'fork', round: 2 } },
        { name: 'Review', status: 'done', execution: { mode: 'fork', round: 2, blockers: 1 } },
        { name: 'Verify', status: 'done', execution: { mode: 'delegate', defectsFound: 0 } },
        { name: 'Spec Check', status: 'done', execution: { round: 0, blockers: -1, defectsFound: '2' } },
        { name: 'Ready', status: 'done' },
      ],
    }),
  })

  await start($, ROOT)
  const counts = runs()[0]!.stages.map(s => [s.round, s.blockers, s.defectsFound])

  expect(counts).toEqual([
    [2, null, null],
    [2, 1, null],
    [null, null, 0],
    [null, null, null],
    [null, null, null],
  ])

  const ui = await $.ui.mount({
    plugin: 'delivery-run-view',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'delivery-run-view',
    props: {
      title: 'Delivery flows',
      isFocused: true,
      bodyColumns: 120,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 40 },
      view: {},
    },
  })
  expect(await ui.find({ type: 'Text', text: 'round 2 · 1 blocker' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '0 defects' })).toBeDefined()
  await ui.unmount()
})

test('names a phase by its bound worker, labels the revise round, and reads the old stage names', async ($, on) => {
  const runs = storedRuns(on)
  machine(on, ROOT, {
    [at('run-o.json')]: JSON.stringify({
      id: 'run-o',
      skillId: 'flow-code',
      updatedAt: '2026-10-07T10:00:00.000Z',
      sessionIds: [SESSION],
      runContext: {
        phases: {
          'flow-code': {
            'phase-verify': { mode: 'delegate', agent: 'qa:qa' },
            'phase-implement': { mode: 'delegate', agent: 'csharp-coding:coding' },
          },
        },
      },
      stages: [
        { name: 'Validation', status: 'done' },
        { name: 'Personal Validation', status: 'in_progress' },
        { name: 'Build & Test', status: 'done' },
        { name: 'Implementation', status: 'done' },
      ],
      insights: [
        agentRan(0, 'qa:qa-monitor', 12000),
        agentRan(0, 'qa:qa', 3000),
        agentRan(1, 'csharp-coding:coding', 420000),
        agentRan(2, 'qa:qa-monitor', 2000),
        agentRan(2, 'general-purpose', 480000),
        agentRan(3, 'general-purpose', 60000),
      ],
    }),
  })

  await start($, ROOT)
  const [run] = runs()
  const [validation, gate, buildTest, implementation] = run!.stages

  expect([validation!.agent, validation!.mismatch]).toEqual(['qa:qa', []])
  expect([gate!.mode, gate!.agent, gate!.workers.map(w => w.isRevise)]).toEqual(['gate', null, [true]])
  expect([buildTest!.agent, buildTest!.isModeRecorded, buildTest!.configured]).toEqual(['general-purpose', false, null])
  expect([implementation!.agent, implementation!.mismatch]).toEqual(['general-purpose', ['agent']])
})

test('reads an effort runner as the agent it carries, and a qualified phase by the qualifier it ran under', async ($, on) => {
  const runs = storedRuns(on)
  machine(on, ROOT, {
    [at('run-r.json')]: JSON.stringify({
      id: 'run-r',
      skillId: 'flow-spec',
      updatedAt: '2026-10-07T10:00:00.000Z',
      sessionIds: [SESSION],
      runContext: {
        phases: {
          'flow-spec': {
            'phase-scope': { mode: 'delegate', agent: 'general-purpose', runner: 'delivery:runner-xhigh', model: 'opus', effort: 'xhigh' },
            'phase-drafting:arc42': { mode: 'delegate', agent: 'architecture:architect' },
            'phase-drafting:design': { mode: 'delegate', agent: 'ux-design:ux-designer' },
          },
        },
      },
      stages: [
        { name: 'Scope', status: 'done' },
        { name: 'Drafting', status: 'done', execution: { qualifier: 'design' } },
      ],
      insights: [agentRan(0, 'delivery:runner-xhigh', 9000), agentRan(1, 'ux-design:ux-designer', 9000)],
    }),
  })

  await start($, ROOT)
  const [run] = runs()
  const [scope, drafting] = run!.stages

  expect([scope!.agent, scope!.model, scope!.effort, scope!.mismatch]).toEqual(['general-purpose', 'opus 5.5', 'xhigh', []])
  expect([drafting!.agent, drafting!.configured?.agent, drafting!.mismatch]).toEqual(['ux-design:ux-designer', 'ux-design:ux-designer', []])
})

const OTHER = `${PROFILE}/delivery-surface-dashboard/Budget-1a2b3c4d/runs/run-x.json`

/** Another checkout's run at `stage`, in progress, everything before it done. */
const otherRun = (stage: number, updatedAt: string) =>
  JSON.stringify({
    id: 'run-x',
    skillId: 'flow-code',
    title: 'Monthly totals',
    repo: 'JSdotNet/Budget',
    status: 'in_progress',
    updatedAt,
    sessionIds: ['another-session'],
    stages: ['Ready', 'Personal Validation', 'Create Pull Request'].map((name, i) => ({
      name,
      status: i < stage ? 'done' : i === stage ? 'in_progress' : 'pending',
    })),
  })

test("alerts once when another checkout's run reaches Personal Validation, and clears when it moves on", async ($, on) => {
  const files: Record<string, string> = { [OTHER]: otherRun(1, '2026-10-07T11:00:00.000Z') }
  const mtimes: Record<string, number> = { [OTHER]: NOW - 1000 }
  const seen = machine(on, ROOT, files, mtimes)
  const flows = typedFlows($)
  const poll = (stage: number, at: number) => {
    files[OTHER] = otherRun(stage, `2026-10-07T11:0${at}:00.000Z`)
    mtimes[OTHER] = NOW - 1000 + at
  }

  await start($, ROOT)
  expect(seen.toasts).toEqual([])
  expect(seen.status.at(-1)).toBe('◆ PV: Budget Monthly totals')

  poll(0, 1)
  await flows()
  poll(1, 2)
  await flows()
  await flows()

  expect(seen.toasts).toEqual(['◆ PV Budget · Monthly totals'])
  expect(seen.sounds).toEqual([{ asset: 'sounds/gate.wav' }])
  expect(seen.status.at(-1)).toBe('◆ PV: Budget Monthly totals')

  poll(2, 3)
  await flows()
  expect(seen.status.at(-1)).toBeUndefined()
  expect(seen.toasts.length).toBe(1)
})

test("ignores another checkout's run that has not moved in a day", async ($, on) => {
  const seen = machine(on, ROOT, { [OTHER]: otherRun(1, '2026-10-05T11:00:00.000Z') })

  await start($, ROOT)

  expect(seen.read).toEqual([])
  expect(seen.status.at(-1)).toBeUndefined()
})

test("draws the review card for this session's run at Personal Validation and submits the reply", async ($, on) => {
  const seen = machine(on, ROOT, {
    [at('run-v.json')]: JSON.stringify({
      id: 'run-v',
      skillId: 'flow-code',
      title: 'Undo for tasks',
      updatedAt: '2026-10-07T10:00:00.000Z',
      sessionIds: [SESSION],
      stages: [
        { name: 'Ready', status: 'done', output: 'Budget spent. Open items: (1) Space does not preventDefault; (2) card chapter code-ahead.' },
        {
          name: 'Personal Validation',
          status: 'in_progress',
          links: [
            { label: 'Desktop harness', url: 'http://localhost:50475/board' },
            { label: 'Aspire dashboard', url: 'http://127.0.0.1:50480/' },
          ],
        },
      ],
    }),
  })
  await start($, ROOT)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'delivery-run-view',
      surface,
      component: 'Pane',
      requestId: 'delivery-run-view',
      props: {
        title: 'Delivery flows',
        isFocused: true,
        bodyColumns: 80,
        placement: 'dock',
        scroll: { offset: 0, bodyRows: 40 },
        view: {},
      },
    })
    expect((await ui.find({ type: 'Link' }))?.props.href).toBe('http://localhost:50475/board')
    expect(await ui.find({ type: 'Text', text: 'http://127.0.0.1:50480/' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Space does not preventDefault$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /card chapter code-ahead$/ })).toBeDefined()
    await ui.press({ key: 'pv-approve' })
    await ui.unmount()
  }

  expect(seen.prompts).toEqual(['Personal Validation: approve.', 'Personal Validation: approve.'])
})
