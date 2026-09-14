// Claude Code refuses to run a prompt-type hook on SessionStart ("prompt-type hooks are not
// supported for SessionStart events (no conversation context is available)") and records the
// refusal as a non-blocking error, so a prompt hook there fails invisibly. The guidance
// therefore ships as this command hook: it reads session-start-context.md next to this file
// and returns the text as additionalContext, which Claude injects into the new session.
//
// The guidance is repository-scoped; plugin enablement usually is not. A plugin enabled at
// user scope is enabled in every repository on the machine, so an unguarded hook injects this
// text into every session on it — context spent, and routing pressure toward skills the
// repository never adopted. The hook therefore stays silent unless the repository opted in:
// either by naming this plugin in its own enabledPlugins, or by carrying the assets the
// guidance is about. Copilot reads hooks.json at the plugin root, where a hook is type: prompt
// and has no equivalent lever, so that copy of the text stays unconditional and hedges its
// opening sentence where this one can simply know.
//
// Every plugin installs alone and may not import from a sibling, so this file is duplicated
// per plugin. Only MARKERS differs between the copies.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Repository paths whose presence means this repository uses what the guidance describes.
// A marker is an existence probe, not a config read.
const MARKERS = ['.devbook/config.json', '.claude/flow-context.md'];

// A worktree's .git is a file, not a directory, so test for presence rather than for a
// directory. CLAUDE_PROJECT_DIR is the host's own answer and is trusted first.
function repoRoot() {
    const start = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    let dir = start;
    for (;;) {
        if (existsSync(join(dir, '.git'))) return dir;
        const up = dirname(dir);
        if (up === dir) return start;
        dir = up;
    }
}

function pluginName() {
    try {
        const manifest = join(dirname(here), '.claude-plugin', 'plugin.json');
        return JSON.parse(readFileSync(manifest, 'utf8')).name;
    } catch {
        return null;
    }
}

// An explicit opt-in in the repository's own settings outranks every marker: a repository that
// names the plugin has adopted it whether or not it has written an asset yet.
function enabledHere(root, name) {
    if (!name) return false;
    for (const file of ['settings.json', 'settings.local.json']) {
        let enabled;
        try {
            enabled = JSON.parse(readFileSync(join(root, '.claude', file), 'utf8')).enabledPlugins;
        } catch {
            continue; // absent or unparseable settings decide nothing
        }
        if (!enabled || typeof enabled !== 'object') continue;
        // Keys are "<plugin>@<marketplace>"; the marketplace a repository installed from is
        // its own business, so only the plugin half is compared.
        for (const [key, on] of Object.entries(enabled)) {
            if (on && key.split('@')[0] === name) return true;
        }
    }
    return false;
}

const root = repoRoot();
if (!enabledHere(root, pluginName()) && !MARKERS.some((marker) => existsSync(join(root, marker)))) {
    process.exit(0); // not this repository's plugin; say nothing
}

let additionalContext;
try {
    additionalContext = readFileSync(join(here, 'session-start-context.md'), 'utf8').trim();
} catch {
    // Never break session start over missing guidance.
    process.exit(0);
}

if (additionalContext) {
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext },
    }));
}
