// Asserts the four sub-rules that say *where* a field may sit, rather than what
// it may say. Each one is invisible to every other check in the pipeline: the
// value parses, the reference resolves, the graph builds — and the block is
// still wrong, because the rule it breaks is about placement.
//
// Run: `node field-scope.test.mjs`
import { validateDocument, slugify } from "./metadata.mjs";

let failed = 0;
const check = (ok, name, detail) => {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n        ${detail}`}`);
};

const fence = (body) => "```meta\n" + body + "```\n";
const note = (body) => "```annotation\n" + body + "```\n";
const find = (issues, severity, needle) =>
    issues.find((i) => i.severity === severity && i.message.includes(needle));
const dump = (issues) => JSON.stringify(issues, null, 2);

// --- .domain field scope ------------------------------------------------

// `depends-on` and `feature-flag` are the delivery order and the flag of a
// capability. A `domain.md` chapter has neither: it describes standing
// structure, and its relationships belong in `model.md` or `related`.
{
    const issues = validateDocument(
        ".domain/ordering/domain.md",
        `# Ordering\n\n${fence("type: domain\n")}\n## Order\n\n` +
            `${fence("type: aggregate\ndepends-on: [.domain/ordering/features.md#refunds]\nfeature-flag: orders\n")}\n` +
            `Prose.\n`
    );

    check(
        Boolean(find(issues, "error", '`depends-on` on a chapter of type "aggregate"')),
        "`depends-on` on an aggregate is an error",
        dump(issues)
    );
    check(
        Boolean(find(issues, "error", '`feature-flag` on a chapter of type "aggregate"')),
        "`feature-flag` on an aggregate is an error",
        dump(issues)
    );
}

// The same two fields on the chapters that own them, which must stay silent —
// a scope check that fires on the legal case is worse than none.
{
    const issues = validateDocument(
        ".domain/ordering/features.md",
        `# Ordering Features\n\n${fence("type: features\n")}\n## Refunds\n\n` +
            `${fence("type: feature\ndepends-on: [.domain/ordering/features.md#orders]\nfeature-flag: refunds\n")}\n` +
            `Prose.\n\n### Partial refund\n\n` +
            `${fence("type: sub-feature\nfeature-flag: [refunds, refunds-partial]\n")}\nProse.\n`
    );

    check(
        !find(issues, "error", "scopes the field to"),
        "both fields on a feature and a sub-feature are silent",
        dump(issues)
    );
}

// A term that is already an aggregate, service, event, or field carries its
// aliases on that chapter rather than earning a duplicate `term` chapter, so
// `aliases` is legal on any chapter — only the file-level block is out.
{
    const issues = validateDocument(
        ".domain/ordering/domain.md",
        `# Ordering\n\n${fence("type: domain\naliases: [Orders]\n")}\n## Order\n\n` +
            `${fence("type: aggregate\naliases: [OrderRoot, order_id]\n")}\nProse.\n`
    );

    check(
        Boolean(find(issues, "error", "`aliases` on the file-level block")),
        "`aliases` on the file-level block is an error",
        dump(issues)
    );
    check(
        !find(issues, "error", "chapter of type"),
        "`aliases` on an aggregate chapter is silent",
        dump(issues)
    );
}

// --- .ai `stage` in a stage file ----------------------------------------

// The file already says the stage. A chapter that writes it too gives the
// reader two places to look and the next rename two places to update.
{
    const issues = validateDocument(
        ".ai/03-build.md",
        `# Build\n\n${fence("status: adopted\ntype: stage\n")}\n## TDD with an agent\n\n` +
            `${fence("status: trial\ntype: practice\nstage: build\n")}\nProse.\n`
    );

    check(
        Boolean(find(issues, "warning", "`stage` in a stage file")),
        "`stage` inside a stage file is reported",
        dump(issues)
    );
}

{
    const issues = validateDocument(
        ".ai/concepts.md",
        `# Concepts\n\n${fence("status: adopted\ntype: concepts\n")}\n## Context engineering\n\n` +
            `${fence("status: trial\ntype: concept\nstage: [specify, build]\n")}\nProse.\n`
    );

    check(
        issues.length === 0,
        "`stage` in concepts.md, where it belongs, is silent",
        dump(issues)
    );
}

// --- an open question means the chapter is not agreed -------------------

// Reported only against an approval, which is the contradiction: a person
// signed for content that still carries an unanswered question. An open
// question on any other rung is the state the fence exists for.
{
    const approved = "type: aggregate\nstatus: approved\napproved-by: jobsc\napproved-at: 2026-09-01\n";
    const question = "kind: question\nauthor: jobsc\ndate: 2026-09-02\nbody: Does this still hold?\n";

    const issues = validateDocument(
        ".domain/ordering/domain.md",
        `# Ordering\n\n${fence("type: domain\n")}\n## Order\n\n${fence(approved)}\n${note(question)}\nProse.\n`
    );
    check(
        Boolean(find(issues, "error", "an open question means the chapter is not agreed")),
        "an approval standing over an open question is an error",
        dump(issues)
    );

    const resolved = validateDocument(
        ".domain/ordering/domain.md",
        `# Ordering\n\n${fence("type: domain\n")}\n## Order\n\n${fence(approved)}\n` +
            `${note("kind: question\nstatus: resolved\n" + question.split("\n").slice(1).join("\n"))}\nProse.\n`
    );
    check(
        resolved.length === 0,
        "a resolved question under the same approval is silent",
        dump(resolved)
    );

    const active = validateDocument(
        ".domain/ordering/domain.md",
        `# Ordering\n\n${fence("type: domain\n")}\n## Order\n\n${fence("type: aggregate\n")}\n${note(question)}\nProse.\n`
    );
    check(
        active.length === 0,
        "an open question on an unapproved chapter is silent — that is what the fence is for",
        dump(active)
    );

    // Position is the anchor: the note under the sub-chapter is the
    // sub-chapter's, so the approved parent above it stays clean.
    const nested = validateDocument(
        ".domain/ordering/domain.md",
        `# Ordering\n\n${fence("type: domain\n")}\n## Order\n\n${fence(approved)}\nProse.\n\n` +
            `### Line\n\n${fence("type: entity\n")}\n${note(question)}\nProse.\n`
    );
    check(
        !find(nested, "error", "not agreed"),
        "a question under a sub-chapter does not indict its approved parent",
        dump(nested)
    );
}

// --- slugs outside ASCII ------------------------------------------------

// `\w` is ASCII-only, so the old class dropped the accented letter and the
// address a `related` field carried stopped resolving to the heading GitHub
// actually renders.
check(
    slugify("Café Ordering") === "café-ordering",
    "a non-ASCII letter survives the slug",
    slugify("Café Ordering")
);
check(
    slugify("Organizational & Process Constraints") === "organizational--process-constraints",
    "punctuation still strips without collapsing the run it leaves behind",
    slugify("Organizational & Process Constraints")
);

console.log(failed ? `\n${failed} case(s) failed.` : "\nAll cases passed.");
process.exit(failed ? 1 : 0);
