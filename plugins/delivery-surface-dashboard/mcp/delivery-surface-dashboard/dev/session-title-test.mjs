// Unit check for session naming: destination classification, boundary resolution, precedence,
// and the cases that must NOT produce a rename.
//
// Runs against a temporary worktree with a `.devbook/domain/` folder, because boundary resolution for
// code paths reads the declared bounded contexts off disk. The naming cases at the end write a
// `.devbook/config.json` into it too, because the labels are read from there.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { recordDestination, computeSessionTitle, loadSessionNaming, normalizeSessionNaming } from "../session-title.mjs";

const cwd = mkdtempSync(path.join(tmpdir(), "session-title-"));
mkdirSync(path.join(cwd, ".devbook", "domain", "order-management"), { recursive: true });
mkdirSync(path.join(cwd, ".devbook", "domain", "billing"), { recursive: true });

let failures = 0;
function check(label, actual, expected) {
    const ok = actual === expected;
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        expected: ${expected}\n        actual:   ${actual}`}`);
}

// Each case: a run title plus the tool calls to fold in, and the name they should produce.
// `naming` is what loadSessionNaming would have returned; omitted means nothing configured.
async function titleFor(title, calls, naming) {
    const run = { title };
    for (const call of calls) await recordDestination(run, { cwd, ...call });
    return computeSessionTitle(run, naming);
}

const write = (file_path) => ({ toolName: "Write", input: { file_path } });
const edit = (file_path) => ({ toolName: "Edit", input: { file_path } });

console.log("— destination to prefix —");
check("devbook folder wins its own prefix", await titleFor("Add Fulfilment aggregate", [write(".devbook/domain/order-management/domain.md")]), "domain:order-management — Add Fulfilment aggregate");
check("arc42", await titleFor("Runtime view refresh", [write(".devbook/arc42/06-runtime-view.md")]), "arc42 — Runtime view refresh");
check("tech", await titleFor("Pin Aspire 9", [edit(".devbook/tech/backend.md")]), "tech — Pin Aspire 9");
check("design", await titleFor("Dense table tokens", [edit(".devbook/design/color-scheme.md")]), "design — Dense table tokens");
check("ai", await titleFor("Record the review stage", [edit(".devbook/ai/03-review.md")]), "ai — Record the review stage");
check("anything else is code", await titleFor("Rounding fix", [edit("src/Shipping/Rate.cs")]), "code — Rounding fix");
check("a retired folder is just code", await titleFor("Split checkout epic", [edit(".backlog/epic-checkout.md")]), "code — Split checkout epic");

console.log("\n— only .devbook/ is a layout —");
check("a root-level dot-folder is just code", await titleFor("Stray chapter", [write(".arc42/06-runtime-view.md")]), "code — Stray chapter");
check("the parent folder alone is not a devbook write", await titleFor("Config", [edit(".devbook/config.json")]), "code — Config");

console.log("\n— bounded context —");
check("code path matched to a declared context", await titleFor("Partial shipment rounding", [edit("src/OrderManagement/Shipment.cs")]), "code:order-management — Partial shipment rounding");
check("dotted module name normalizes", await titleFor("Invoice totals", [edit("src/Acme.Billing/Invoice.cs")]), "code:billing — Invoice totals");
check("two contexts is no context", await titleFor("Cross-context cleanup", [edit("src/OrderManagement/A.cs"), edit("src/Billing/B.cs")]), "code — Cross-context cleanup");
check("undeclared module is no context", await titleFor("Logging tweak", [edit("src/Infrastructure/Log.cs")]), "code — Logging tweak");

console.log("\n— precedence —");
check("more files wins", await titleFor("Mostly code", [write(".devbook/domain/billing/domain.md"), edit("src/A.cs"), edit("src/B.cs")]), "code — Mostly code");
check("tie goes to the rarer folder", await titleFor("Even split", [write(".devbook/arc42/01-intro.md"), edit("src/A.cs")]), "arc42 — Even split");
check("artifact outranks the folder tally", await titleFor("Plugin comparison", [edit("src/A.cs"), edit("src/B.cs"), { toolName: "Artifact", input: { file_path: "out.html" } }]), "artifact — Plugin comparison");
check("explicit publish action counts", await titleFor("Report", [{ toolName: "Artifact", input: { action: "publish", file_path: "r.html" } }]), "artifact — Report");

console.log("\n— no rename —");
check("nothing written yet", await titleFor("Just talking", []), null);
check("reading is not writing", await titleFor("Just reading", [{ toolName: "Read", input: { file_path: "src/A.cs" } }]), null);
check("generated indexes do not count", await titleFor("Regenerate", [write(".devbook/domain/_meta/index.json")]), null);
check("non-publish Artifact actions do not count", await titleFor("Check comments", [{ toolName: "Artifact", input: { action: "comments" } }]), null);
check("bash writes are not tracked", await titleFor("Scripted", [{ toolName: "Bash", input: { command: "sed -i s/a/b/ src/A.cs" } }]), null);
check("paths outside the worktree are ignored", await titleFor("Scratch", [write(path.join(tmpdir(), "scratch", "notes.md"))]), null);
check("no run title, no name", await titleFor("", [edit("src/A.cs")]), null);

console.log("\n— formatting —");
check("absolute in-worktree path resolves", await titleFor("Absolute", [edit(path.join(cwd, "src", "A.cs"))]), "code — Absolute");
check(
    "long titles truncate",
    await titleFor("Refresh the runtime view and every sequence diagram it references", [write(".devbook/arc42/06-runtime-view.md")]),
    "arc42 — Refresh the runtime view and every sequence diagram…",
);

console.log("\n— configured labels —");
const capitalized = { labels: { artifact: "Artifact", code: "Code", domain: "Domain" } };
check("a kind is shown as its label", await titleFor("Report", [{ toolName: "Artifact", input: { action: "publish", file_path: "r.html" } }], capitalized), "Artifact — Report");
check("the boundary follows the label", await titleFor("Invoice totals", [edit("src/Acme.Billing/Invoice.cs")], capitalized), "Code:billing — Invoice totals");
check("an unlabelled kind keeps its id", await titleFor("Pin Aspire 9", [edit(".devbook/tech/backend.md")], capitalized), "tech — Pin Aspire 9");

const grouped = { labels: { devbook: "devbook", code: null } };
check("the devbook group covers every folder", await titleFor("Runtime view refresh", [write(".devbook/arc42/06-runtime-view.md")], grouped), "devbook — Runtime view refresh");
check("a domain chapter still names its context under the group", await titleFor("Add Fulfilment aggregate", [write(".devbook/domain/order-management/domain.md")], grouped), "devbook:order-management — Add Fulfilment aggregate");
check("folders sharing a label tally as one", await titleFor("Spec sweep", [write(".devbook/arc42/01-intro.md"), write(".devbook/domain/billing/domain.md"), edit("src/A.cs"), edit("src/B.cs")], grouped), "devbook:billing — Spec sweep");
check("a folder's own key wins over the group", await titleFor("Dense table tokens", [edit(".devbook/design/color-scheme.md")], { labels: { devbook: "devbook", design: "ux" } }), "ux — Dense table tokens");
check("a null label is no rename", await titleFor("Rounding fix", [edit("src/Shipping/Rate.cs")], grouped), null);
check("a null kind still competes for dominance", await titleFor("Mostly code", [write(".devbook/domain/billing/domain.md"), edit("src/A.cs"), edit("src/B.cs")], grouped), null);
check("a null artifact label is no rename either", await titleFor("Report", [{ toolName: "Artifact", input: { action: "publish", file_path: "r.html" } }], { labels: { artifact: null } }), null);

console.log("\n— loading the config —");
const configPath = path.join(cwd, ".devbook", "config.json");
mkdirSync(path.dirname(configPath), { recursive: true });
const withNaming = (sessionNaming) => JSON.stringify({ components: { "delivery-surface-dashboard": { sessionNaming } } });
check("no config file means the defaults", JSON.stringify((await loadSessionNaming(path.join(cwd, "nowhere"))).labels), "{}");
writeFileSync(configPath, JSON.stringify({ components: { devbook: { pluginVersion: "1.0.0" } } }));
check("no entry means the defaults", JSON.stringify((await loadSessionNaming(cwd)).labels), "{}");
writeFileSync(configPath, withNaming({ labels: { devbook: " devbook ", code: null, artifact: "Artifact" } }));
check("labels are read and trimmed", JSON.stringify((await loadSessionNaming(cwd)).labels), JSON.stringify({ devbook: "devbook", code: null, artifact: "Artifact" }));
writeFileSync(configPath, "{ not json");
check("unreadable JSON means the defaults", JSON.stringify((await loadSessionNaming(cwd)).labels), "{}");

console.log("\n— rejected shapes are reported, not applied —");
const warnings = [];
const write0 = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk) => (warnings.push(String(chunk)), true);
const normalized = normalizeSessionNaming({ labels: { codee: "Code", tech: "", design: 3, ai: "AI" }, separator: " | " });
process.stderr.write = write0;
check("only the valid keys survive", JSON.stringify(normalized.labels), JSON.stringify({ ai: "AI" }));
check("each problem is named once", warnings.length, 4);
check("an unknown prefix is named", warnings.some((w) => w.includes("labels.codee")), true);
check("an unknown top-level key is named", warnings.some((w) => w.includes('unknown key "separator"')), true);

rmSync(cwd, { recursive: true, force: true });
console.log(`\n${failures ? `${failures} failing` : "all passing"}`);
process.exit(failures ? 1 : 0);
