// Renderer for delivery-surface-dashboard. Single static HTML shell; all data comes from
// same-origin JSON endpoints (`/api/runs`, `/api/runs/:id`) served by
// extension.mjs, with live refresh over an SSE stream (`/events`).

const STATUS_LABEL = {
    pending: "Pending",
    in_progress: "In progress",
    done: "Done",
    blocked: "Blocked",
    skipped: "Skipped",
    cancelled: "Cancelled",
    // Derived run state (see idle.mjs), never a stored status: an `in_progress` run whose
    // session ended or that nothing has advanced for hours — typically one left waiting at
    // the approval gate.
    idle: "Idle",
    // Also idle by those signals, but deliberately so: the session ended at a context
    // threshold and the run is waiting for another session to continue it.
    handoff: "Handed off",
};

export function renderShell() {
    // String.raw, not a plain template literal: the page below is one long JS string
    // holding the dashboard's own script, and that script's regex escapes and string
    // escapes have to reach the browser intact. A plain template literal consumes them
    // one level early - a regex character class loses its escapes and stops parsing -
    // which kills the whole page script. Interpolation still works exactly as before.
    return String.raw`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Run dashboard</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--background-color-default, #ffffff);
    color: var(--text-color-default, #1f2328);
    font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    font-size: var(--text-body-medium, 14px);
    line-height: var(--leading-body-medium, 20px);
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  #runs {
    width: 280px;
    flex: none;
    border-right: 1px solid var(--border-color-default, #d0d7de);
    overflow-y: auto;
    padding: 8px;
  }
  #detail {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }
  h1 {
    font-size: var(--text-title-medium, 18px);
    font-weight: var(--font-weight-semibold, 600);
    margin: 4px 8px 12px;
  }
  .run-item {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 4px;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }
  .run-item:hover { background: var(--background-color-muted, rgba(127,127,127,0.08)); }
  .run-item.selected {
    border-color: var(--color-focus-outline, #0969da);
    background: var(--background-color-muted, rgba(127,127,127,0.08));
  }
  .run-item .title { font-weight: var(--font-weight-semibold, 600); display: block; margin-bottom: 2px; }
  .run-item .meta { font-size: 12px; color: var(--text-color-muted, #59636e); }
  .stage-nav { margin: 0 0 8px 6px; padding-left: 8px; border-left: 1px solid var(--border-color-default, #d0d7de); }
  .stage-nav-item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    border-radius: 4px;
    padding: 4px 6px;
    cursor: pointer;
    color: inherit;
    font: inherit;
    font-size: 12px;
  }
  .stage-nav-item:hover { background: var(--background-color-muted, rgba(127,127,127,0.08)); }
  .stage-nav-item.active { background: var(--background-color-muted, rgba(127,127,127,0.12)); font-weight: var(--font-weight-semibold, 600); }
  .stage-nav-content { flex: 1; min-width: 0; }
  .stage-nav-item .stage-nav-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .stage-nav-meta { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; line-height: 16px; color: var(--text-color-muted, #59636e); font-weight: var(--font-weight-normal, 400); }
  .stage-nav-dot { width: 8px; height: 8px; border-radius: 999px; flex: none; background: var(--text-color-muted, #59636e); }
  .stage-nav-dot.in_progress { background: var(--true-color-blue, #0969da); }
  .stage-nav-dot.done { background: #1f883d; }
  .stage-nav-dot.blocked, .stage-nav-dot.cancelled { background: var(--true-color-red, #cf222e); }
  .stage-nav-dot.skipped { background: rgba(127,127,127,0.4); }
  .badge {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: var(--font-weight-semibold, 600);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .badge.pending { background: rgba(127,127,127,0.18); color: var(--text-color-muted, #59636e); }
  .badge.in_progress { background: rgba(9,105,218,0.15); color: var(--true-color-blue, #0969da); }
  .badge.done { background: rgba(31,136,61,0.15); color: #1f883d; }
  .badge.blocked, .badge.cancelled { background: rgba(207,34,46,0.15); color: var(--true-color-red, #cf222e); }
  .badge.skipped { background: rgba(127,127,127,0.1); color: var(--text-color-muted, #59636e); }
  .badge.idle { background: rgba(154,103,0,0.15); color: var(--true-color-yellow, #9a6700); }
  .badge.handoff { background: rgba(84,111,255,0.15); color: var(--true-color-blue, #546fff); }
  .stage {
    border-left: 3px solid var(--border-color-default, #d0d7de);
    padding: 6px 0 6px 14px;
    margin-bottom: 4px;
    position: relative;
  }
  .stage.in_progress { border-left-color: var(--true-color-blue, #0969da); }
  .stage.done { border-left-color: #1f883d; }
  .stage.blocked { border-left-color: var(--true-color-red, #cf222e); }
  .stage-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .stage-name { font-weight: var(--font-weight-semibold, 600); }
  .stage-elapsed { display: block; font-size: 12px; color: var(--text-color-muted, #59636e); margin: -2px 0 4px; }
  .stage-used { font-size: 12px; color: var(--text-color-muted, #59636e); margin-bottom: 4px; display: flex; flex-wrap: wrap; gap: 4px 6px; align-items: center; }
  .tag {
    display: inline-block;
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 11px;
    background: var(--background-color-muted, rgba(127,127,127,0.1));
    color: var(--text-color-default, #1f2328);
  }
  .tag.agent { background: rgba(130,80,223,0.15); color: #8250df; }
  .tag.mcp { background: rgba(9,105,218,0.12); color: var(--true-color-blue, #0969da); }
  .tag.model { background: rgba(31,136,61,0.12); color: #1f883d; }
  .tag.done-count { background: rgba(9,105,218,0.12); color: var(--true-color-blue, #0969da); }
  .stage-output {
    font-size: var(--text-body-medium, 14px);
    line-height: 1.55;
    background: var(--background-color-muted, rgba(127,127,127,0.06));
    border: 1px solid var(--border-color-default, rgba(127,127,127,0.18));
    border-radius: 8px;
    padding: 10px 12px;
    margin-top: 6px;
  }
  .stage-output-wrap { margin-top: 4px; }
  .stage-output.clamped {
    max-height: 116px;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
  }
  .stage-output :first-child { margin-top: 0; }
  .stage-output :last-child { margin-bottom: 0; }
  .stage-output h3,
  .stage-output h4,
  .stage-output h5,
  .stage-output h6 {
    margin: 12px 0 6px;
    font-weight: var(--font-weight-semibold, 600);
    line-height: 1.25;
  }
  .stage-output h3 { font-size: 15px; padding-bottom: 4px; border-bottom: 1px solid var(--border-color-default, rgba(127,127,127,0.18)); }
  .stage-output h4 { font-size: 14px; }
  .stage-output h5,
  .stage-output h6 { font-size: 13px; color: var(--text-color-muted, #59636e); }
  .stage-output p { margin: 0 0 8px; }
  .stage-output ul,
  .stage-output ol { margin: 4px 0 10px; padding-left: 24px; }
  .stage-output li { margin: 3px 0; }
  .stage-output code { font-family: var(--font-mono, "SFMono-Regular", Consolas, monospace); font-size: 12px; background: rgba(127,127,127,0.12); border-radius: 4px; padding: 1px 4px; }
  .stage-output pre { margin: 8px 0 10px; padding: 8px 10px; overflow-x: auto; background: rgba(127,127,127,0.1); border-radius: 6px; }
  .stage-output pre code { display: block; padding: 0; background: transparent; white-space: pre; }
  .stage-output blockquote { margin: 8px 0 10px; padding-left: 10px; border-left: 3px solid var(--border-color-default, #d0d7de); color: var(--text-color-muted, #59636e); }
  .stage-output a { color: var(--true-color-blue, #0969da); text-decoration: none; }
  .stage-output a:hover { text-decoration: underline; }
  .stage-output-actions { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
  .show-more {
    background: transparent;
    border: none;
    color: var(--true-color-blue, #0969da);
    font: inherit;
    font-size: 12px;
    font-weight: var(--font-weight-semibold, 600);
    cursor: pointer;
    padding: 2px 0;
  }
  .rich-viewer-open {
    background: transparent;
    border: none;
    color: var(--true-color-blue, #0969da);
    font: inherit;
    font-size: 12px;
    font-weight: var(--font-weight-semibold, 600);
    cursor: pointer;
    padding: 2px 0;
  }
  .show-more:hover,
  .rich-viewer-open:hover { text-decoration: underline; }
  .rich-viewer[hidden] { display: none; }
  .rich-viewer {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: stretch;
    justify-content: flex-end;
    background: rgba(31,35,40,0.45);
  }
  .rich-viewer-panel {
    width: min(820px, 92vw);
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--background-color-default, #ffffff);
    color: var(--text-color-default, #1f2328);
    box-shadow: -16px 0 36px rgba(31,35,40,0.24);
  }
  .rich-viewer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-color-default, #d0d7de);
  }
  .rich-viewer-title { margin: 0; font-size: var(--text-body-large, 16px); }
  .rich-viewer-close {
    border: 1px solid var(--border-color-default, #d0d7de);
    border-radius: 6px;
    background: var(--background-color-default, #ffffff);
    color: var(--text-color-default, #1f2328);
    cursor: pointer;
    padding: 4px 9px;
  }
  .rich-viewer-body { overflow: auto; padding: 18px; }
  .rich-viewer-body .stage-output { max-height: none; margin-top: 0; }
  .stage-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .stage-link {
    display: inline-flex;
    flex-direction: column;
    gap: 1px;
    max-width: 260px;
    border: 1px solid var(--border-color-default, #d0d7de);
    border-radius: 6px;
    padding: 6px 10px;
    color: var(--true-color-blue, #0969da);
    background: var(--background-color-muted, rgba(127,127,127,0.05));
    text-decoration: none;
  }
  .stage-link:hover { text-decoration: none; border-color: var(--true-color-blue, #0969da); }
  .stage-link-label { font-weight: var(--font-weight-semibold, 600); }
  .stage-link-description { font-size: 12px; color: var(--text-color-muted, #59636e); }
  .qa-block { margin-top: 8px; }
  .qa-block h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-color-muted, #59636e); margin: 8px 0 4px; }
  .qa-scenario {
    border-radius: 6px;
    padding: 6px 10px;
    margin-bottom: 5px;
    background: var(--background-color-muted, rgba(127,127,127,0.05));
  }
  .qa-scenario-head { display: flex; align-items: center; gap: 8px; }
  .qa-scenario-name { font-weight: var(--font-weight-semibold, 600); }
  .qa-status { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: var(--font-weight-semibold, 600); text-transform: uppercase; }
  .qa-status.pass { background: rgba(31,136,61,0.15); color: #1f883d; }
  .qa-status.fail { background: rgba(207,34,46,0.15); color: var(--true-color-red, #cf222e); }
  .qa-status.flaky { background: rgba(191,135,0,0.18); color: #9a6700; }
  .qa-notes { font-size: 12px; color: var(--text-color-muted, #59636e); margin-top: 2px; }
  .qa-evidence { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .qa-evidence-image-button { background: transparent; border: none; border-radius: 4px; cursor: zoom-in; display: block; padding: 0; }
  .qa-evidence-image-button:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 2px; }
  .qa-evidence-image-button:hover img { border-color: var(--true-color-blue, #0969da); }
  .qa-evidence img { max-width: 150px; max-height: 96px; border-radius: 4px; border: 1px solid var(--border-color-default, #d0d7de); display: block; object-fit: cover; }
  .qa-evidence a { font-size: 11px; color: var(--true-color-blue, #0969da); text-decoration: none; }
  .qa-evidence a:hover { text-decoration: underline; }
  .qa-evidence-file { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; max-width: 150px; }
  .qa-evidence-file span, .qa-evidence-file a { font-size: 11px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
  .qa-evidence-file span { color: var(--text-color-muted, #59636e); }
  .evidence-lightbox[hidden] { display: none; }
  .evidence-lightbox { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .evidence-lightbox-backdrop { position: absolute; inset: 0; border: 0; background: rgba(0,0,0,0.72); cursor: zoom-out; }
  .evidence-lightbox-content { position: relative; display: flex; flex-direction: column; gap: 8px; max-width: min(96vw, 1200px); max-height: 96vh; color: #ffffff; }
  .evidence-lightbox img { max-width: 100%; max-height: calc(96vh - 48px); border-radius: 6px; object-fit: contain; background: #000000; box-shadow: 0 12px 48px rgba(0,0,0,0.4); }
  .evidence-lightbox-caption { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .evidence-lightbox-close { position: absolute; top: -14px; right: -14px; border: 1px solid rgba(255,255,255,0.3); border-radius: 999px; width: 32px; height: 32px; background: rgba(0,0,0,0.8); color: #ffffff; cursor: pointer; font-size: 20px; line-height: 28px; }
  .evidence-missing {
    display: flex; align-items: center; justify-content: center; text-align: center;
    width: 150px; height: 96px; padding: 6px;
    border: 1px dashed var(--border-color-default, #d0d7de); border-radius: 4px;
    font-size: 11px; color: var(--text-color-muted, #59636e);
    background: var(--background-color-muted, rgba(127,127,127,0.05));
  }
  .qa-monitoring { border-radius: 6px; padding: 6px 10px; background: var(--background-color-muted, rgba(127,127,127,0.05)); }
  .qa-finding { font-size: 12px; margin-bottom: 3px; }
  .qa-finding .qa-level { font-weight: var(--font-weight-semibold, 600); text-transform: uppercase; font-size: 10px; margin-right: 6px; }
  .qa-finding .qa-level.error, .qa-finding .qa-level.critical { color: var(--true-color-red, #cf222e); }
  .qa-finding .qa-level.warning { color: #9a6700; }
  .qa-finding .qa-level.info { color: var(--text-color-muted, #59636e); }
  .empty { color: var(--text-color-muted, #59636e); padding: 24px; text-align: center; }
  .summary { margin-top: 16px; padding: 12px 14px; border-radius: 6px; background: rgba(31,136,61,0.08); border-left: 3px solid #1f883d; }
  .summary h2 { font-size: var(--text-body-large, 15px); margin: 0 0 6px; }
  .summary-cost { margin-top: 8px; margin-bottom: 0; }
  .prompt-history {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-radius: 6px;
    background: var(--background-color-muted, rgba(127,127,127,0.06));
  }
  .prompt-history h2 { font-size: var(--text-body-large, 15px); margin: 0 0 8px; }
  .prompt-entry { border-top: 1px solid var(--border-color-default, rgba(127,127,127,0.18)); padding-top: 8px; margin-top: 8px; }
  .prompt-entry:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
  .prompt-entry-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
  .prompt-entry-title { font-weight: var(--font-weight-semibold, 600); }
  .prompt-entry-time { color: var(--text-color-muted, #59636e); font-size: 12px; white-space: nowrap; }
  .prompt-entry pre { white-space: pre-wrap; margin: 0; font: inherit; color: inherit; }
  .header-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .header-actions { display: flex; align-items: center; gap: 8px; }
  .report-link { color: var(--true-color-blue, #0969da); font-size: 12px; font-weight: var(--font-weight-semibold, 600); text-decoration: none; }
  .report-link:hover { text-decoration: underline; }
  .subtitle { color: var(--text-color-muted, #59636e); font-size: 12px; margin: 0 0 16px; }
  .insight { margin-top: 20px; }
  .insight h2 { font-size: var(--text-body-large, 15px); margin: 0 0 8px; }
  .insight-stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 10px; }
  .insight-stat { font-size: 12px; color: var(--text-color-muted, #59636e); }
  .insight-stat strong { display: block; font-size: 16px; color: var(--text-color-default, #1f2328); font-weight: var(--font-weight-semibold, 600); }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
  .bar-label { width: 110px; flex: none; color: var(--text-color-muted, #59636e); }
  .bar-track { flex: 1; background: var(--background-color-muted, rgba(127,127,127,0.08)); border-radius: 4px; overflow: hidden; height: 10px; }
  .bar-fill { height: 100%; background: var(--true-color-blue, #0969da); border-radius: 4px; }
  .bar-value { width: 70px; flex: none; text-align: right; color: var(--text-color-muted, #59636e); }
  .ctx-gauge { margin: 4px 0 10px; }
  .ctx-row { display: grid; grid-template-columns: 120px minmax(160px, 1fr) max-content; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
  .ctx-label { color: var(--text-color-muted, #59636e); white-space: nowrap; }
  .ctx-value { color: var(--text-color-muted, #59636e); text-align: right; white-space: nowrap; }
  .ctx-track { background: var(--background-color-muted, rgba(127,127,127,0.08)); border-radius: 4px; overflow: hidden; height: 12px; }
  .ctx-fill { height: 100%; background: var(--true-color-blue, #0969da); border-radius: 4px; }
  .ctx-fill.warn { background: #9a6700; }
  .ctx-fill.danger { background: var(--true-color-red, #cf222e); }
  .ctx-meta { font-size: 12px; color: var(--text-color-muted, #59636e); margin-top: 4px; }
  .tag.tokens { background: rgba(191,135,0,0.16); color: #9a6700; }
</style>
</head>
<body>
  <div id="runs"><h1>Runs</h1><div id="run-list"></div></div>
  <div id="detail"><div class="empty">Select a run to see progress and output.</div></div>
  <div id="rich-viewer" class="rich-viewer" hidden>
    <section class="rich-viewer-panel" role="dialog" aria-modal="true" aria-labelledby="rich-viewer-title">
      <header class="rich-viewer-head">
        <h2 id="rich-viewer-title" class="rich-viewer-title">Rich output</h2>
        <button class="rich-viewer-close" type="button" data-rich-viewer-close>Close</button>
      </header>
      <div class="rich-viewer-body"><div id="rich-viewer-content" class="stage-output"></div></div>
    </section>
  </div>
  <script>
    const STATUS_LABEL = ${JSON.stringify(STATUS_LABEL)};
    let runs = [];
    let selectedId = null;
    let selectedRun = null;
    let activeStage = null;

    function esc(s) {
      return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function badge(status) {
      const s = status || "pending";
      return '<span class="badge ' + esc(s) + '">' + esc(STATUS_LABEL[s] || s) + '</span>';
    }

    // Runs carry a derived idle flag from the API; stages never do, so they keep using
    // badge() directly on their stored status.
    function runBadge(run) {
      // handoffPending is checked before idle: a handed-off run satisfies both, and
      // labelling deliberate suspension "Idle" reads as abandoned work.
      return badge(run && run.handoffPending ? "handoff" : run && run.idle ? "idle" : run && run.status);
    }

    // A run has a declared trailing Summary stage when its last stage is named
    // "Summary" (flow-code and friends declare one). finish_run also sets
    // run.summary; without this check the nav/detail would render Summary twice
    // — once for the declared stage and once synthesised from run.summary.
    function declaredSummaryIndex(run) {
      const stages = run.stages || [];
      for (let i = stages.length - 1; i >= 0; i--) {
        if (/^summary$/i.test((stages[i].name || "").trim())) return i;
      }
      return -1;
    }

    function isWorkItemUpdateStage(stage) {
      return /^work item update$/i.test(String((stage && stage.name) || "").trim());
    }

    function hasWorkItem(run) {
      const item = run && run.workItem;
      return Boolean(item && (item.url || item.number || item.issueNumber));
    }

    function visibleStages(run) {
      return (run.stages || []).map((stage, index) => ({ stage, index }))
        .filter(({ stage }) => !isWorkItemUpdateStage(stage) || hasWorkItem(run));
    }

    function renderStageNav(run) {
      const summaryIdx = declaredSummaryIndex(run);
      const items = visibleStages(run).map(({ stage: s, index: i }) => (
        '<button class="stage-nav-item ' + (activeStage === i ? "active" : "") + '" data-stage="' + i + '">' +
          '<span class="stage-nav-dot ' + esc(s.status) + '"></span>' +
          '<span class="stage-nav-content">' +
            '<span class="stage-nav-name">' + esc(s.name) + '</span>' +
            renderStageNavMeta(run, i, s) +
          '</span>' +
          badge(s.status) +
        '</button>'
      ));
      // Only synthesise a Summary nav entry when the run has a summary AND no
      // stage already represents it, so it never appears twice.
      if (run.summary && summaryIdx < 0) {
        items.push(
          '<button class="stage-nav-item ' + (activeStage === "summary" ? "active" : "") + '" data-stage="summary">' +
            '<span class="stage-nav-dot done"></span>' +
            '<span class="stage-nav-name">Summary</span>' +
          '</button>'
        );
      }
      return '<div class="stage-nav">' + items.join("") + '</div>';
    }
    function renderStageNavMeta(run, index, stage) {
      const insight = run.insightSummary && run.insightSummary.perStage && run.insightSummary.perStage[index];
      const agents = mergeAgentLabels(((stage && stage.agents) || []).concat((insight && insight.agents) || []));
      const models = ((insight && insight.models) || []).filter(Boolean).sort();
      const elapsed = stageElapsedMs(stage);
      const parts = [];
      if (agents.length) parts.push('Agent: ' + agents.join(', '));
      if (models.length) parts.push('Model: ' + models.join(', '));
      if (elapsed !== null) parts.push('Elapsed: ' + fmtDuration(elapsed));
      if (!parts.length) return "";
      const label = parts.join(' | ');
      return '<span class="stage-nav-meta" title="' + esc(label) + '">' + esc(label) + '</span>';
    }
    function scrollToStage(key) {
      activeStage = key === "summary" ? "summary" : Number(key);
      const id = key === "summary" ? "summary-block" : ("stage-" + key);
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      renderRunList();
    }

    function renderRunList() {
      const el = document.getElementById("run-list");
      if (!runs.length) {
        el.innerHTML = '<div class="empty">No runs recorded yet.</div>';
        return;
      }
      el.innerHTML = runs.map((r) => (
        '<button class="run-item ' + (r.id === selectedId ? "selected" : "") + '" data-id="' + esc(r.id) + '">' +
          '<span class="title">' + esc(r.title) + '</span>' +
          '<span class="meta">' + esc(r.skillId) + ' &middot; ' + runBadge(r) + '</span>' +
        '</button>' +
        (r.id === selectedId && selectedRun ? renderStageNav(selectedRun) : "")
      )).join("");
      el.querySelectorAll(".run-item").forEach((btn) => {
        btn.addEventListener("click", () => selectRun(btn.dataset.id));
      });
      el.querySelectorAll(".stage-nav-item").forEach((btn) => {
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          scrollToStage(btn.dataset.stage);
        });
      });
    }

    function fmtDuration(ms) {
      if (ms === null || ms === undefined) return "n/a";
      const totalSec = Math.round(ms / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return m > 0 ? (m + "m " + s + "s") : (s + "s");
    }

    function stageElapsedMs(stage) {
      if (!stage) return null;
      if (Number.isFinite(Number(stage.durationMs))) return Number(stage.durationMs);
      if (!stage.startedAt) return null;
      const started = new Date(stage.startedAt).getTime();
      if (!Number.isFinite(started)) return null;
      if (stage.status === "in_progress") return Math.max(0, Date.now() - started);
      const endedAt = stage.completedAt || stage.updatedAt;
      if (!endedAt) return null;
      const ended = new Date(endedAt).getTime();
      return Number.isFinite(ended) ? Math.max(0, ended - started) : null;
    }

    function renderStageElapsed(stage) {
      const elapsed = stageElapsedMs(stage);
      if (elapsed === null) return "";
      const label = stage.status === "in_progress" ? "elapsed so far" : "elapsed";
      return '<div class="stage-elapsed">' + esc(label + ': ' + fmtDuration(elapsed)) + '</div>';
    }

    function renderInsight(run) {
      const insight = run.insightSummary;
      if (!insight || !insight.totalCalls) return "";
      const categories = Object.entries(insight.byCategory || {}).sort((a, b) => b[1] - a[1]);
      const maxMs = Math.max(insight.thinkingMs || 0, ...categories.map((c) => c[1]), 1);
      const bars = categories.map(([category, ms]) => (
        '<div class="bar-row"><span class="bar-label">' + esc(category) + '</span>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + Math.round((ms / maxMs) * 100) + '%"></div></div>' +
          '<span class="bar-value">' + fmtDuration(ms) + '</span></div>'
      )).join("");
      const thinkingBar = insight.thinkingMs !== null ? (
        '<div class="bar-row"><span class="bar-label">Thinking (est.)</span>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + Math.round((insight.thinkingMs / maxMs) * 100) + '%;background:var(--text-color-muted,#59636e);"></div></div>' +
          '<span class="bar-value">' + fmtDuration(insight.thinkingMs) + '</span></div>'
      ) : "";
      const usedTags = renderUsedTags({
        agents: insight.agentsUsed,
        mcpServers: insight.mcpServersUsed,
        models: insight.modelsUsed,
      });
      return (
        '<div class="insight"><h2>Insight</h2>' +
        '<div class="insight-stats">' +
          '<div class="insight-stat"><strong>' + insight.totalCalls + '</strong>tool calls</div>' +
          '<div class="insight-stat"><strong>' + fmtDuration(insight.elapsedMs) + '</strong>elapsed</div>' +
          '<div class="insight-stat"><strong>' + fmtDuration(insight.totalToolMs) + '</strong>tool time</div>' +
        '</div>' +
        usedTags +
        thinkingBar + bars +
        '</div>'
      );
    }

    function fmtTokens(n) {
      if (n === null || n === undefined || !isFinite(n)) return "n/a";
      if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
      if (n >= 1000) return (n / 1000).toFixed(1) + "k";
      return String(Math.round(n));
    }

    // Run-level context gauge + per-stage token totals. Runs recorded before
    // context tracking existed have no contextSummary, so the whole block is
    // omitted rather than rendered empty.
    function renderContext(run) {
      const ctx = run.contextSummary;
      if (!ctx) return "";
      const parts = [];
      if (ctx.gauge) {
        const g = ctx.gauge;
        const pct = g.percent === null || g.percent === undefined ? null : g.percent;
        const cls = pct === null ? "" : (pct >= 90 ? "danger" : (pct >= 75 ? "warn" : ""));
        const label = g.tokenLimit
          ? fmtTokens(g.currentTokens) + ' / ' + fmtTokens(g.tokenLimit) + (pct !== null ? ' (' + pct + '%)' : "")
          : fmtTokens(g.currentTokens) + ' tokens';
        const breakdown = [];
        if (g.systemTokens !== null && g.systemTokens !== undefined) breakdown.push('system ' + fmtTokens(g.systemTokens));
        if (g.conversationTokens !== null && g.conversationTokens !== undefined) breakdown.push('conversation ' + fmtTokens(g.conversationTokens));
        if (g.toolDefinitionsTokens !== null && g.toolDefinitionsTokens !== undefined) breakdown.push('tool definitions ' + fmtTokens(g.toolDefinitionsTokens));
        if (g.messagesLength !== null && g.messagesLength !== undefined) breakdown.push(g.messagesLength + ' messages');
        parts.push(
          '<div class="ctx-gauge">' +
            '<div class="ctx-row"><span class="ctx-label">Context gauge</span>' +
              '<div class="ctx-track"><div class="ctx-fill ' + cls + '" style="width:' + (pct === null ? 0 : pct) + '%"></div></div>' +
              '<span class="ctx-value">' + esc(label) + '</span></div>' +
            (breakdown.length ? '<div class="ctx-meta">' + esc(breakdown.join(" · ")) + '</div>' : "") +
            (g.peakTokens ? '<div class="ctx-meta">Peak ' + esc(fmtTokens(g.peakTokens)) + (g.peakPercent !== null && g.peakPercent !== undefined ? ' (' + g.peakPercent + '%)' : "") + '</div>' : "") +
          '</div>'
        );
      }
      const stats = [];
      if (ctx.totals) {
        stats.push('<div class="insight-stat"><strong>' + esc(fmtTokens(ctx.totals.tokens)) + '</strong>tokens used</div>');
        stats.push('<div class="insight-stat"><strong>' + esc(fmtTokens(ctx.totals.uncachedTokens)) + '</strong>uncached</div>');
        stats.push('<div class="insight-stat"><strong>' + ctx.totals.modelCalls + '</strong>model calls</div>');
        if (ctx.totals.reasoningTokens) {
          stats.push('<div class="insight-stat"><strong>' + esc(fmtTokens(ctx.totals.reasoningTokens)) + '</strong>reasoning</div>');
        }
        if (ctx.totals.cacheReadTokens) {
          stats.push('<div class="insight-stat"><strong>' + esc(fmtTokens(ctx.totals.cacheReadTokens)) + '</strong>cache read</div>');
        }
        if (ctx.subAgentTotals) {
          stats.push('<div class="insight-stat"><strong>' + esc(fmtTokens(ctx.subAgentTotals.tokens)) + '</strong>via sub-agents</div>');
        }
      }
      if (ctx.compactionCount) {
        const reasons = Object.entries(ctx.compactionReasons || {}).map(([r, n]) => r + ' x' + n).join(", ");
        stats.push('<div class="insight-stat"><strong>' + ctx.compactionCount + '</strong>compactions' + (reasons ? ' (' + esc(reasons) + ')' : "") + '</div>');
      }
      if (ctx.truncationCount) {
        stats.push('<div class="insight-stat"><strong>' + ctx.truncationCount + '</strong>truncations' + (ctx.truncatedTokens ? ' (-' + esc(fmtTokens(ctx.truncatedTokens)) + ')' : "") + '</div>');
      }
      if (stats.length) parts.push('<div class="insight-stats">' + stats.join("") + '</div>');
      if (!parts.length) return "";
      return '<div class="insight"><h2>Context</h2>' + parts.join("") + '</div>';
    }

    // Returns just the token-delta pill span (no wrapper) so it can sit in the
    // same badge row as the agent/MCP/model pills for a consistent stage meta
    // line. Empty string when the stage recorded no token usage.
    function stageTokenPill(run, index) {
      const ctx = run.contextSummary;
      const stage = ctx && ctx.perStage && ctx.perStage[index];
      if (!stage || !stage.tokens) return "";
      const sub = stage.subAgent && stage.subAgent.tokens
        ? ', ' + fmtTokens(stage.subAgent.tokens) + ' sub-agent'
        : "";
      const title = 'Per-stage token delta: input + output tokens of model calls that ' +
        'completed while this stage was in progress. Input counts the whole prompt, ' +
        'most of which is normally served from the prompt cache.';
      return '<span class="tag tokens" title="' + esc(title) + '">Token delta: ' +
        esc(fmtTokens(stage.tokens) + ' (' + fmtTokens(stage.uncachedTokens) + ' uncached' + sub + ')') + '</span>';
    }

    function renderSummaryCost(run) {
      const ctx = run.contextSummary;
      const totals = ctx && ctx.totals;
      if (!totals) return "";
      const stats = [
        '<div class="insight-stat"><strong>' + esc(fmtTokens(totals.tokens)) + '</strong>total token cost</div>',
        '<div class="insight-stat"><strong>' + esc(fmtTokens(totals.uncachedTokens)) + '</strong>uncached</div>',
        '<div class="insight-stat"><strong>' + totals.modelCalls + '</strong>model calls</div>',
      ];
      if (totals.reasoningTokens) {
        stats.push('<div class="insight-stat"><strong>' + esc(fmtTokens(totals.reasoningTokens)) + '</strong>reasoning</div>');
      }
      if (totals.cacheReadTokens) {
        stats.push('<div class="insight-stat"><strong>' + esc(fmtTokens(totals.cacheReadTokens)) + '</strong>cache read</div>');
      }
      return '<div class="summary-cost insight-stats">' + stats.join("") + '</div>';
    }

    function renderSummaryBlock(run, withHeading) {
      if (!run.summary) return "";
      return '<div class="summary" id="summary-block">' + (withHeading ? '<h2>Summary</h2>' : "") + '<div class="stage-output">' + renderMarkdownBlocks(run.summary) + '</div>' + renderSummaryCost(run) + '</div>';
    }


    function promptHistoryEntries(run) {
      const prompts = Array.isArray(run && run.promptHistory) ? run.promptHistory.slice() : [];
      if ((!prompts.length) && run && run.originalPrompt) {
        prompts.push({ kind: "initial", label: "Initial prompt", prompt: run.originalPrompt, createdAt: run.startedAt });
      }
      return prompts.filter((p) => p && p.prompt);
    }

    function renderPromptHistory(run) {
      const prompts = promptHistoryEntries(run);
      if (!prompts.length) return "";
      const items = prompts.map((p, index) => {
        const fallback = p.kind === "initial" ? "Initial prompt" : "Follow-up prompt " + (index + 1);
        const label = p.label || fallback;
        const time = p.createdAt ? new Date(p.createdAt).toLocaleString() : "";
        return '<article class="prompt-entry">' +
          '<div class="prompt-entry-head"><span class="prompt-entry-title">' + esc(label) + '</span>' +
          (time ? '<span class="prompt-entry-time">' + esc(time) + '</span>' : "") + '</div>' +
          '<pre>' + esc(p.prompt) + '</pre>' +
        '</article>';
      }).join("");
      return '<section class="prompt-history"><h2>Prompt history</h2>' + items + '</section>';
    }

    // Overall Insight-panel usage tags (full, unshortened labels). Kept
    // separate from per-stage rendering, which merges declared + observed
    // agents and shortens plugin-qualified names.
    function renderUsedTags(perStageEntry) {
      if (!perStageEntry) return "";
      const groups = [
        ["agent", "Agent", perStageEntry.agents],
        ["mcp", "MCP", perStageEntry.mcpServers],
        ["model", "Model", perStageEntry.models],
      ];
      const parts = [];
      groups.forEach(([cls, label, values]) => {
        (values || []).forEach((v) => {
          parts.push('<span class="tag ' + cls + '">' + esc(label) + ': ' + esc(v) + '</span>');
        });
      });
      if (!parts.length) return "";
      return '<div class="stage-used">' + parts.join("") + '</div>';
    }

    function shortAgentLabel(name) {
      const s = String(name || "");
      const i = s.indexOf(":");
      return i >= 0 ? s.slice(i + 1) : s;
    }

    // Merges declared agents (e.g. "some-plugin:coding") with observed ones
    // (e.g. "coding") into one deduped, display-ready set. The redundant plugin
    // prefix is dropped so it reads "coding", unless two genuinely different
    // agents collapse to the same short name (two distinct prefixes), in which
    // case the full qualified names are kept so they stay unambiguous.
    function mergeAgentLabels(names) {
      const groups = new Map();
      (names || []).filter(Boolean).forEach((n) => {
        const short = shortAgentLabel(n);
        if (!groups.has(short)) groups.set(short, new Set());
        groups.get(short).add(n);
      });
      const labels = [];
      groups.forEach((fulls, short) => {
        const prefixes = new Set();
        fulls.forEach((f) => { const i = f.indexOf(":"); if (i >= 0) prefixes.add(f.slice(0, i)); });
        if (prefixes.size >= 2) {
          Array.from(fulls).sort().forEach((f) => labels.push(f));
        } else {
          labels.push(short);
        }
      });
      return labels.sort();
    }

    // Single code path for every stage's meta badge row: purple Agent pills
    // (declared + observed, merged), MCP/Model pills, and the token-delta pill.
    function stageDoneCount(run, index, stage) {
      const direct = Number(stage && stage.doneCount);
      if (Number.isFinite(direct) && direct > 0) return direct;
      const byName = run && run.phaseDoneCounts && Number(run.phaseDoneCounts[(stage && stage.name) || ""]);
      return Number.isFinite(byName) && byName > 0 ? byName : 0;
    }

    function doneCountPill(count) {
      if (!count) return "";
      return '<span class="tag done-count" title="Number of times this phase completed with status done">Done ' + count + 'x</span>';
    }
    function renderStageMeta(run, index, stage) {
      const insight = run.insightSummary && run.insightSummary.perStage && run.insightSummary.perStage[index];
      const declared = (stage && stage.agents) || [];
      const observed = (insight && insight.agents) || [];
      const agents = mergeAgentLabels(declared.concat(observed));
      const pills = [];
      ((insight && insight.models) || []).forEach((m) => pills.push('<span class="tag model">Model: ' + esc(m) + '</span>'));
      agents.forEach((a) => pills.push('<span class="tag agent">Agent: ' + esc(a) + '</span>'));
      const donePill = doneCountPill(stageDoneCount(run, index, stage));
      if (donePill) pills.push(donePill);
      ((insight && insight.mcpServers) || []).forEach((m) => pills.push('<span class="tag mcp">MCP: ' + esc(m) + '</span>'));
      const tokenPill = stageTokenPill(run, index);
      if (tokenPill) pills.push(tokenPill);
      if (!pills.length) return "";
      return '<div class="stage-used">' + pills.join("") + '</div>';
    }

    function renderInlineMarkdown(value) {
      const raw = String(value ?? "");
      const codeSpans = [];
      const withPlaceholders = raw.replace(/\`([^\`]+)\`/g, (_m, code) => {
        const key = "@@DELIVERY_SURFACE_DASHBOARD_CODE_SPAN_" + codeSpans.length + "@@";
        codeSpans.push('<code>' + esc(code) + '</code>');
        return key;
      });
      let html = esc(withPlaceholders);
      html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|#[^\s)]+|\/[^\s)]+)\)/g, (_m, label, href) => {
        return '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
      });
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      html = html.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
      html = html.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
      codeSpans.forEach((span, i) => {
        html = html.replace(new RegExp("@@DELIVERY_SURFACE_DASHBOARD_CODE_SPAN_" + i + "@@", "g"), span);
      });
      return html;
    }

    function renderMarkdownBlocks(value) {
      const lines = String(value ?? "").replace(/\r\n?/g, "\n").split("\n");
      const parts = [];
      let paragraph = [];
      let listType = null;
      let inCode = false;
      let codeLines = [];

      function closeParagraph() {
        if (!paragraph.length) return;
        parts.push('<p>' + renderInlineMarkdown(paragraph.join(" ").trim()) + '</p>');
        paragraph = [];
      }

      function closeList() {
        if (!listType) return;
        parts.push('</' + listType + '>');
        listType = null;
      }

      function openList(type) {
        if (listType === type) return;
        closeList();
        parts.push('<' + type + '>');
        listType = type;
      }

      function closeCode() {
        parts.push('<pre><code>' + esc(codeLines.join("\n")) + '</code></pre>');
        codeLines = [];
        inCode = false;
      }

      lines.forEach((line) => {
        if (/^\s*/.test(line) && line.trim().startsWith(String.fromCharCode(96, 96, 96))) {
          closeParagraph();
          closeList();
          if (inCode) {
            closeCode();
          } else {
            inCode = true;
            codeLines = [];
          }
          return;
        }

        if (inCode) {
          codeLines.push(line);
          return;
        }

        if (!line.trim()) {
          closeParagraph();
          closeList();
          return;
        }

        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
          closeParagraph();
          closeList();
          const level = Math.min(6, heading[1].length + 2);
          parts.push('<h' + level + '>' + renderInlineMarkdown(heading[2].trim()) + '</h' + level + '>');
          return;
        }

        const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
        if (unordered) {
          closeParagraph();
          openList("ul");
          parts.push('<li>' + renderInlineMarkdown(unordered[1].trim()) + '</li>');
          return;
        }

        const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
        if (ordered) {
          closeParagraph();
          openList("ol");
          parts.push('<li>' + renderInlineMarkdown(ordered[1].trim()) + '</li>');
          return;
        }

        const quote = line.match(/^>\s?(.+)$/);
        if (quote) {
          closeParagraph();
          closeList();
          parts.push('<blockquote>' + renderInlineMarkdown(quote[1].trim()) + '</blockquote>');
          return;
        }

        closeList();
        paragraph.push(line.trim());
      });

      if (inCode) closeCode();
      closeParagraph();
      closeList();
      return parts.join("");
    }

    // Long stage output is clamped by default with a Show more/less toggle so a
    // wall of detail doesn't dominate the panel; short output renders in full
    // with no toggle.
    function renderStageOutput(output, title) {
      if (!output) return "";
      const text = String(output);
      const long = text.split("\n").length > 8 || text.length > 600;
      const html = renderMarkdownBlocks(text);
      const actions = '<div class="stage-output-actions">' +
        (long ? '<button class="show-more" type="button">Show more</button>' : "") +
        '<button class="rich-viewer-open" type="button" data-viewer-title="' + esc(title || "Stage output") + '">Open rich view</button>' +
      '</div>';
      if (!long) {
        return '<div class="stage-output-wrap"><div class="stage-output">' + html + '</div>' + actions + '</div>';
      }
      return '<div class="stage-output-wrap">' +
        '<div class="stage-output clamped">' + html + '</div>' +
        actions +
      '</div>';
    }

    function openRichViewer(title, html) {
      const modal = document.getElementById("rich-viewer");
      const heading = document.getElementById("rich-viewer-title");
      const content = document.getElementById("rich-viewer-content");
      if (!modal || !heading || !content) return;
      heading.textContent = title || "Rich output";
      content.innerHTML = html || "";
      modal.hidden = false;
    }

    function closeRichViewer() {
      const modal = document.getElementById("rich-viewer");
      const content = document.getElementById("rich-viewer-content");
      if (!modal || !content) return;
      modal.hidden = true;
      content.innerHTML = "";
    }

    function renderStageLinks(links) {
      if (!Array.isArray(links) || !links.length) return "";
      const items = links.map((link) => (
        '<a class="stage-link" href="' + esc(link.url) + '" target="_blank" rel="noopener">' +
          '<span class="stage-link-label">' + esc(link.label || link.url) + '</span>' +
          (link.description ? '<span class="stage-link-description">' + esc(link.description) + '</span>' : "") +
        '</a>'
      )).join("");
      return '<div class="stage-links">' + items + '</div>';
    }

    function evidenceUrl(runId, filePath) {
      return "/api/runs/" + encodeURIComponent(runId) + "/evidence?path=" + encodeURIComponent(filePath);
    }

    function isImageEvidence(type, filePath) {
      if (/screenshot|image/i.test(type || "")) return true;
      return /\.(png|jpe?g|gif|webp)$/i.test(filePath || "");
    }

    function renderEvidence(runId, evidence) {
      if (!Array.isArray(evidence) || !evidence.length) return "";
      const items = evidence.map((e) => {
        const url = evidenceUrl(runId, e.path);
        const label = esc(e.description || e.path.split(/[\\\\/]/).pop());
        if (isImageEvidence(e.type, e.path)) {
          // A single caption under the thumbnail. If the file can't be served
          // (missing/deleted/forbidden), onerror swaps the broken image for a
          // clear placeholder instead of the browser's broken-image glyph.
          return '<div class="qa-evidence-file" title="' + label + '">' +
            '<button class="qa-evidence-image-button" type="button" data-full-src="' + esc(url) + '" data-label="' + label + '" aria-label="Open evidence image: ' + label + '">' +
              '<img src="' + esc(url) + '" alt="' + label + '" loading="lazy" onerror="evidenceError(this)" />' +
            '</button>' +
            '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + label + '</a>' +
          '</div>';
        }
        return '<a class="qa-evidence-file" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(e.type || "file") + ': ' + label + '</a>';
      }).join("");
      return '<div class="qa-evidence">' + items + '</div>';
    }

    function renderScenarios(runId, scenarios) {
      if (!Array.isArray(scenarios) || !scenarios.length) return "";
      const items = scenarios.map((s) => (
        '<div class="qa-scenario">' +
          '<div class="qa-scenario-head"><span class="qa-status ' + esc(s.status) + '">' + esc(s.status) + '</span>' +
            '<span class="qa-scenario-name">' + esc(s.name) + '</span></div>' +
          (s.notes ? '<div class="qa-notes">' + esc(s.notes) + '</div>' : "") +
          renderEvidence(runId, s.evidence) +
        '</div>'
      )).join("");
      return '<div class="qa-block"><h3>QA Scenarios</h3>' + items + '</div>';
    }

    function renderMonitoring(monitoring) {
      if (!monitoring || (!monitoring.summary && !(monitoring.findings || []).length)) return "";
      const findings = (monitoring.findings || []).map((f) => (
        '<div class="qa-finding"><span class="qa-level ' + esc(f.level) + '">' + esc(f.level) + '</span>' +
          (f.resource ? '<strong>' + esc(f.resource) + '</strong>: ' : "") + esc(f.message) +
          (f.timestamp ? ' <span style="color:var(--text-color-muted,#59636e)">(' + esc(f.timestamp) + ')</span>' : "") +
        '</div>'
      )).join("");
      return '<div class="qa-block"><h3>Runtime Monitoring</h3><div class="qa-monitoring">' +
        (monitoring.summary ? '<div class="qa-notes">' + esc(monitoring.summary) + '</div>' : "") +
        findings +
      '</div></div>';
    }

    function renderDetail(run) {
      const el = document.getElementById("detail");
      selectedRun = run;
      if (!run) {
        el.innerHTML = '<div class="empty">Select a run to see progress and output.</div>';
        renderRunList();
        return;
      }
      const summaryIdx = declaredSummaryIndex(run);
      const stages = visibleStages(run).map(({ stage: s, index: i }) => {
        // When a run declares a trailing Summary stage, fold the finish_run
        // summary into that stage instead of appending a separate block, so
        // the summary never appears twice.
        const inlineSummary = i === summaryIdx && run.summary && run.summary.trim() !== (s.output || "").trim()
          ? renderSummaryBlock(run, false)
          : "";
        return '<div class="stage ' + esc(s.status) + '" id="stage-' + i + '">' +
          '<div class="stage-head"><span class="stage-name">' + esc(s.name) + '</span>' + badge(s.status) + '</div>' +
          renderStageElapsed(s) +
          renderStageMeta(run, i, s) +
          renderStageOutput(s.output, s.name) +
          renderStageLinks(s.links) +
          inlineSummary +
          renderScenarios(run.id, s.scenarios) +
          renderMonitoring(s.monitoring) +
        '</div>';
      }).join("");
      // Only render a standalone summary block when no declared stage covers it.
      const trailingSummary = run.summary && summaryIdx < 0
        ? renderSummaryBlock(run, true)
        : "";
      el.innerHTML =
        '<div class="header-row"><h1 style="margin:0;">' + esc(run.title) + '</h1>' +
          '<div class="header-actions"><a class="report-link" href="/api/runs/' + encodeURIComponent(run.id) + '/report.html?inline=1" target="_blank" rel="noopener">Open HTML report</a>' + runBadge(run) + '</div>' +
        '</div>' +
        '<p class="subtitle">' + esc(run.skillId) + ' &middot; started ' + esc(new Date(run.startedAt).toLocaleString()) +
          (run.updatedAt ? ' &middot; updated ' + esc(new Date(run.updatedAt).toLocaleString()) : "") +
          (run.changeKind ? ' &middot; change: ' + esc(run.changeKind) : "") +
          (run.approval && run.approval.state
            ? ' &middot; approval: ' + esc(run.approval.state)
            : "") + '</p>' +
        renderPromptHistory(run) +
        stages +
        trailingSummary +
        renderInsight(run) +
        renderContext(run);
      wireDetailHandlers();
      renderRunList();
    }

    function wireDetailHandlers() {
      document.querySelectorAll("#detail .show-more").forEach((btn) => {
        btn.addEventListener("click", () => {
          const wrap = btn.closest(".stage-output-wrap");
          const out = wrap && wrap.querySelector(".stage-output");
          if (!out) return;
          const clamped = out.classList.toggle("clamped");
          btn.textContent = clamped ? "Show more" : "Show less";
        });
      });
      document.querySelectorAll("#detail .qa-evidence-image-button").forEach((btn) => {
        btn.addEventListener("click", () => openEvidenceLightbox(btn.dataset.fullSrc, btn.dataset.label));
      });
      document.querySelectorAll("#detail .rich-viewer-open").forEach((btn) => {
        btn.addEventListener("click", () => {
          const wrap = btn.closest(".stage-output-wrap");
          const out = wrap && wrap.querySelector(".stage-output");
          if (!out) return;
          openRichViewer(btn.dataset.viewerTitle || "Rich output", out.innerHTML);
        });
      });
      const modal = document.getElementById("rich-viewer");
      if (modal && !modal.dataset.wired) {
        modal.dataset.wired = "true";
        modal.querySelectorAll("[data-rich-viewer-close]").forEach((btn) => {
          btn.addEventListener("click", closeRichViewer);
        });
        modal.addEventListener("click", (ev) => {
          if (ev.target === modal) closeRichViewer();
        });
        document.addEventListener("keydown", (ev) => {
          if (ev.key === "Escape" && !modal.hidden) closeRichViewer();
        });
      }
    }

    let evidenceLightbox = null;

    function ensureEvidenceLightbox() {
      if (evidenceLightbox) return evidenceLightbox;
      const el = document.createElement("div");
      el.className = "evidence-lightbox";
      el.hidden = true;
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.innerHTML =
        '<button class="evidence-lightbox-backdrop" type="button" aria-label="Close evidence image"></button>' +
        '<div class="evidence-lightbox-content">' +
          '<button class="evidence-lightbox-close" type="button" aria-label="Close evidence image">&times;</button>' +
          '<img alt="" />' +
          '<div class="evidence-lightbox-caption"></div>' +
        '</div>';
      el.querySelector(".evidence-lightbox-backdrop").addEventListener("click", closeEvidenceLightbox);
      el.querySelector(".evidence-lightbox-close").addEventListener("click", closeEvidenceLightbox);
      document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && !el.hidden) closeEvidenceLightbox();
      });
      document.body.appendChild(el);
      evidenceLightbox = el;
      return el;
    }

    function openEvidenceLightbox(src, label) {
      if (!src) return;
      const el = ensureEvidenceLightbox();
      const img = el.querySelector("img");
      const caption = el.querySelector(".evidence-lightbox-caption");
      img.src = src;
      img.alt = label || "Evidence image";
      caption.textContent = label || "Evidence image";
      el.hidden = false;
      el.querySelector(".evidence-lightbox-close").focus();
    }

    function closeEvidenceLightbox() {
      if (!evidenceLightbox) return;
      evidenceLightbox.hidden = true;
      evidenceLightbox.querySelector("img").removeAttribute("src");
    }

    function evidenceError(img) {
      const ph = document.createElement("span");
      ph.className = "evidence-missing";
      ph.textContent = "Evidence unavailable";
      img.replaceWith(ph);
    }

    async function selectRun(id) {
      if (id !== selectedId) activeStage = null;
      selectedId = id;
      renderRunList();
      const res = await fetch("/api/runs/" + encodeURIComponent(id));
      if (res.ok) renderDetail(await res.json());
    }

    async function refresh() {
      const res = await fetch("/api/runs");
      runs = await res.json();
      if (!selectedId && runs.length) selectedId = runs[0].id;
      renderRunList();
      if (selectedId) {
        const found = runs.find((r) => r.id === selectedId);
        if (found) {
          const res2 = await fetch("/api/runs/" + encodeURIComponent(selectedId));
          if (res2.ok) renderDetail(await res2.json());
        } else {
          renderDetail(null);
        }
      }
    }

    refresh();
    const events = new EventSource("/events");
    events.addEventListener("update", refresh);
  </script>
</body>
</html>`;
}
