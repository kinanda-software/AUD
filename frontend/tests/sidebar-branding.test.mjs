import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("sidebar displays the existing IFS logo above navigation with a dashboard link", () => {
  const sidebar = fs.readFileSync(path.join(root, "src", "components", "layout", "Sidebar.tsx"), "utf8");
  assert.ok(fs.existsSync(path.join(root, "public", "ifs-logo.png")));
  assert.match(sidebar, /import Image from "next\/image"/);
  assert.match(sidebar, /src="\/ifs-logo\.png"/);
  assert.match(sidebar, /sizes="64px"/);
  assert.match(sidebar, /h-16 w-16 object-contain/);
  assert.match(sidebar, /relative flex h-20 shrink-0/);
  assert.match(sidebar, /alt="Innovation Flexible Solutions \(IFS\)"/);
  assert.match(sidebar, /href="\/dashboard" onClick=\{onClose\} aria-label="IFS AUD dashboard"/);
  assert.ok(sidebar.indexOf('src="/ifs-logo.png"') < sidebar.indexOf('aria-label="Main navigation"'));
  assert.match(sidebar, /aria-label="Close navigation"/);
  assert.match(sidebar, /min-h-0 flex-1 overflow-y-auto/);
});
