import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filename = path.join(root, "src", "app", "users", "page.tsx");
const text = fs.readFileSync(filename, "utf8");
const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function loadHandler(apiResponse, confirmed = true, currentUserId = 1) {
  let handler;
  let formatter;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "handleDelete") {
      handler = node.initializer.getText(source);
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === "getErrorMessage") {
      formatter = node.getText(source);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(handler && formatter);
  const state = { error: "", success: "", reloads: 0 };
  const context = vm.createContext({
    Error, SyntaxError, JSON, currentUserId, apiResponse,
    window: { confirm: () => confirmed },
    authHeaders: () => ({ Authorization: "Token fixture" }),
    isRecord: (value) => typeof value === "object" && value !== null && !Array.isArray(value),
    setError: (message) => { state.error = message; },
    setSuccess: (message) => { state.success = message; },
    loadUsers: async () => { state.reloads++; },
  });
  const compiled = ts.transpileModule(`${formatter}\nglobalThis.handleDelete = ${handler};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInContext(compiled, context);
  return { state, run: context.handleDelete };
}

test("user deletion uses shared authentication and handles an empty successful response", async () => {
  const { state, run } = loadHandler(async (endpoint, options) => {
    assert.equal(endpoint, "/auth/users/7/");
    assert.equal(options.method, "DELETE");
    assert.equal(options.headers.Authorization, "Token fixture");
    return new Response(null, { status: 204 });
  });
  await run({ id: 7, username: "fixture" });
  assert.match(state.success, /deleted successfully/);
  assert.equal(state.error, "");
  assert.equal(state.reloads, 1);
});

test("protected audit history produces a visible explanation, not a false deletion", async () => {
  const message = "This user is linked to audit review records. Deactivate the account instead.";
  const { state, run } = loadHandler(async () => {
    throw new Error(JSON.stringify({ error: message }));
  });
  await run({ id: 7, username: "fixture" });
  assert.equal(state.error, message);
  assert.equal(state.success, "");
  assert.equal(state.reloads, 0);
});

test("permission errors and non-JSON failures remain visible", async () => {
  for (const [raw, expected] of [
    [JSON.stringify({ detail: "Administrator access is required." }), /Administrator/],
    ["Network unavailable", /Network unavailable/],
    ["<html>private server traceback</html>", /Please retry or contact/],
  ]) {
    const { state, run } = loadHandler(async () => { throw new Error(raw); });
    await run({ id: 7, username: "fixture" });
    assert.match(state.error, expected);
    assert.equal(state.success, "");
  }
});

test("self-deletion and cancelled confirmation send no deletion request", async () => {
  for (const [confirmed, id] of [[false, 7], [true, 1]]) {
    const { state, run } = loadHandler(async () => {
      assert.fail("Unexpected deletion request");
    }, confirmed);
    await run({ id, username: "fixture" });
    assert.equal(state.success, "");
    assert.equal(state.reloads, 0);
  }
});
