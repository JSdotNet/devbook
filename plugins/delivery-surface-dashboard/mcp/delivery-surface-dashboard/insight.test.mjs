import { test } from "node:test";
import assert from "node:assert/strict";
import { categorizeTool } from "./insight.mjs";

const QA = "QA (Playwright/Aspire)";

test("a shell call running the Playwright CLI counts as QA", () => {
    assert.equal(categorizeTool("Bash", { command: "playwright-cli screenshot --filename=a.png" }), QA);
    assert.equal(categorizeTool("PowerShell", { command: "npx -y @playwright/cli open http://localhost" }), QA);
    assert.equal(categorizeTool("Bash", { command: "cd app && playwright-cli snapshot" }), QA);
});

test("any other shell call stays Shell", () => {
    assert.equal(categorizeTool("Bash", { command: "npx playwright test" }), "Shell");
    assert.equal(categorizeTool("Bash"), "Shell");
});

test("Aspire MCP tools stay QA", () => {
    assert.equal(categorizeTool("mcp__plugin_qa_aspire__list_traces"), QA);
});
