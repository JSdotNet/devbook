// accepted-rung.test.mjs — the rung above `approved`: a person saw the built
// work against this chapter and accepted it.
//
// The two rungs are a stack, not a choice, so most of what is checked here is
// how the two records sit together: an acceptance over no approval, an
// acceptance dated before one, and two fingerprints that disagree.
//
// Run: node plugins/devbook/tools/devbook-meta/accepted-rung.test.mjs

import { validateDocument, chapterHash } from "./metadata.mjs";

let failed = 0;
const check = (ok, name, detail) => {
    if (ok) console.log(`PASS  ${name}`);
    else { failed++; console.log(`FAIL  ${name}${detail ? `\n${detail}` : ""}`); }
};

const fence = (body) => "```meta\n" + body + "```\n";
const note = (body) => "```annotation\n" + body + "```\n";

const chapter = (meta, body = "Prose.\n") =>
    "# Ordering\n\n" + fence("type: domain\n") +
    "\n## Order\n\n" + fence("type: aggregate\n" + meta) + "\n" + body;

const find = (issues, severity, needle) =>
    issues.find((i) => i.severity === severity && i.message.includes(needle));
const dump = (issues) => JSON.stringify(issues, null, 2);

const PATH = ".devbook/domain/ordering/domain.md";
const CHAPTER_LINE = 7;

const approval = "approved-by: Job\napproved-at: 2026-09-20\n";
const acceptance = "accepted-by: Sam\naccepted-at: 2026-09-22\n";
const accepted = `status: accepted\n${approval}${acceptance}`;

const HASH = chapterHash(chapter(accepted), CHAPTER_LINE);

{
    const issues = validateDocument(PATH, chapter(accepted));
    check(issues.length === 0, "an acceptance over a signed approval is silent", dump(issues));
}

{
    const issues = validateDocument(PATH, chapter(`status: accepted\n${acceptance}`));
    check(Boolean(find(issues, "error", "an acceptance stands on an approval")), "accepted without an approval record errors", dump(issues));
}

{
    const issues = validateDocument(PATH, chapter(`status: accepted\n${approval}`));
    check(Boolean(find(issues, "warning", "without `accepted-by`")), "accepted without an acceptor warns, as approved without an approver does", dump(issues));
}

{
    const issues = validateDocument(PATH, chapter(`status: active\n${acceptance}`));
    check(Boolean(find(issues, "warning", "without `status: accepted`")), "an orphaned acceptance record warns", dump(issues));
}

{
    // The one place the approval orphan rule widens: `approved-*` is at home
    // under `accepted` too, because the acceptance keeps the record it stands on.
    const issues = validateDocument(PATH, chapter(accepted));
    check(!issues.some((i) => i.message.includes("carries `approved-by`")), "approved-by is not orphaned under the accepted rung", dump(issues));
}

{
    const issues = validateDocument(PATH, chapter(`status: accepted\n${approval}accepted-by: Sam\naccepted-at: 2026-09-19\n`));
    check(Boolean(find(issues, "error", "before `approved-at`")), "an acceptance dated before the approval errors", dump(issues));
}

{
    const issues = validateDocument(PATH, chapter(`${accepted}accepted-at: 2026/09/22\n`.replace("accepted-at: 2026-09-22\n", "")));
    check(Boolean(find(issues, "error", "single calendar day")), "a malformed acceptance date errors", dump(issues));
}

{
    const issues = validateDocument(PATH, chapter(`${accepted}accepted-hash: ${HASH}\napproved-hash: ${HASH}\n`));
    check(issues.length === 0, "matching fingerprints on both rungs are silent", dump(issues));
}

{
    const issues = validateDocument(PATH, chapter(`${accepted}accepted-hash: sha256:deadbeef\napproved-hash: ${HASH}\n`));
    check(Boolean(find(issues, "error", "so the two are one value")), "two fingerprints that disagree error — the chapter moved between the decisions", dump(issues));
}

{
    const issues = validateDocument(PATH, chapter(`${accepted}accepted-hash: sha256:deadbeef\n`));
    check(Boolean(find(issues, "error", "content that has changed since `accepted-at`")), "a lapsed acceptance errors", dump(issues));
}

{
    const issues = validateDocument(PATH, chapter(`${accepted}accepted-hash: nonsense\n`));
    check(Boolean(find(issues, "error", "eight lowercase hex")), "a malformed acceptance fingerprint errors", dump(issues));
}

{
    const doc = chapter(accepted, "Prose.\n\n" + note("kind: question\nby: Job\nstatus: open\n"));
    const issues = validateDocument(PATH, doc);
    check(Boolean(find(issues, "error", "open `kind: question`")), "an open question refuses the accepted rung, as it refuses approved", dump(issues));
}

{
    const issues = validateDocument(PATH, chapter(`${accepted}review: cleared\nreviewer: Ada\nreview-at: 2026-09-19\n`));
    check(Boolean(find(issues, "error", "while carrying review state")), "review state does not survive the accepted rung", dump(issues));
}

{
    // A content change drops both records, so both fingerprints go stale
    // together — there is no state where the build is accepted against text
    // that was never approved.
    const edited = chapter(`${accepted}accepted-hash: ${HASH}\napproved-hash: ${HASH}\n`, "Prose, revised.\n");
    const issues = validateDocument(PATH, edited);
    check(
        Boolean(find(issues, "error", "since `approved-at`")) && Boolean(find(issues, "error", "since `accepted-at`")),
        "editing the content lapses the approval and the acceptance together",
        dump(issues),
    );
}

{
    // Every folder's ladder gained the rung, not just domain's.
    const arc42 = "# Releases\n\n" + fence("status: accepted\n" + approval + acceptance) + "\nProse.\n";
    const issues = validateDocument(".devbook/arc42/adr/releases.md", arc42);
    check(!issues.some((i) => i.message.includes("status")), "the rung is on arc42's ladder too", dump(issues));
}

{
    const tech = "# Node\n\n" + fence("status: accepted\ntype: runtime\n" + approval + acceptance) + "\nProse.\n";
    const issues = validateDocument(".devbook/tech/shared.md", tech);
    check(!issues.some((i) => i.message.includes("status")), "the rung is on tech's ladder too", dump(issues));
}

console.log(`\n${failed ? `${failed} failed` : "all passed"}`);
process.exit(failed ? 1 : 0);
