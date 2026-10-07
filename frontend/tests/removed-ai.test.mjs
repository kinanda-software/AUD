import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("AI assistant page and navigation are removed without removing audit modules", () => {
  assert.equal(fs.existsSync(path.join(root, "src", "app", "ai-assistant", "page.tsx")), false);
  const sidebar = fs.readFileSync(path.join(root, "src", "components", "layout", "Sidebar.tsx"), "utf8");
  assert.doesNotMatch(sidebar, /AI Assistant|ai-assistant|\bBot\b/);
  for (const name of ["Engagements", "Reports", "Financials", "Audit Intelligence"]) {
    assert.ok(sidebar.includes(name));
  }
});
