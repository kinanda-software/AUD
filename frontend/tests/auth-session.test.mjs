import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function loadSession(token, fetch) {
  const source = fs.readFileSync(path.join(root, "src", "lib", "authSession.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, fetch,
    require(name) {
      if (name === "@/lib/apiConfig") return { API_ORIGIN: "http://127.0.0.1:8000" };
      assert.equal(name, "@/lib/authStorage");
      return { getStoredAccessToken: () => token };
    },
  });
  return exports.checkAuthSession;
}
const user = { id: 1, username: "test", first_name: "Test", last_name: "User", email: "", role: "auditor" };

test("missing or rejected credentials are expected signed-out results, even with empty or non-JSON errors", async () => {
  for (const status of [401, 403]) {
    for (const body of ["{}", ""]) {
      const check = loadSession("expired", async () => new Response(body, { status }));
      assert.equal(await check(), null);
    }
  }
  const check = loadSession(null, async () => Response.json({ authenticated: false }));
  assert.equal(await check(), null);
});

test("valid token and cookie sessions are preserved and returned user fields are checked", async () => {
  for (const token of [null, "saved", "Token saved"]) {
    const check = loadSession(token, async (url, options) => {
      assert.equal(url, "http://127.0.0.1:8000/api/auth/me/");
      assert.equal(options.credentials, "include");
      assert.equal(options.cache, "no-store");
      assert.equal(options.headers.Authorization, token ? "Token saved" : undefined);
      return Response.json({ authenticated: true, user });
    });
    assert.deepEqual(await check(), user);
  }
});

test("malformed success, server failure and network failure are errors, not logout results", async () => {
  for (const body of [{}, null, { authenticated: true }, { authenticated: true, user: { id: 1 } }]) {
    const check = loadSession("saved", async () => Response.json(body));
    await assert.rejects(check(), /invalid/i);
  }
  await assert.rejects(loadSession("saved", async () => new Response("", { status: 500 }))(), /HTTP 500/);
  await assert.rejects(loadSession("saved", async () => { throw new Error("Network unavailable"); })(), /Network unavailable/);
});

test("workspace redirects signed-out users and preserves the destination rather than reporting a console error", () => {
  const source = fs.readFileSync(path.join(root, "src", "components", "layout", "AppLayout.tsx"), "utf8");
  assert.doesNotMatch(source, /backend says unauthenticated/);
  assert.match(source, /clearStoredAccessTokens\(\)/);
  assert.match(source, /window\.location\.pathname.*window\.location\.search/);
  assert.match(source, /router\.replace\(`\/login\?next=/);
});

test("planning procedures reuses the verified workspace user instead of a cookie-only identity request", () => {
  const filename = path.join(root, "src", "app", "engagements", "[id]", "audit-planning", "planning-procedures", "page.tsx");
  const source = fs.readFileSync(filename, "utf8");
  assert.match(source, /import \{ useAuthUser \} from "@\/components\/layout\/AuthContext"/);
  assert.match(source, /const currentUser = useAuthUser\(\)/);
  assert.doesNotMatch(source, /\bfetch\s*\(|loadCurrentUser|setCurrentUser|SessionResponse/);
  assert.match(source, /performed_by: String\(\s*currentUser\.id\s*\)/);
  assert.match(source, /performedBy = currentUser!?\.id/);
  const layout = fs.readFileSync(path.join(root, "src", "components", "layout", "AppLayout.tsx"), "utf8");
  assert.match(layout, /<AuthContext\.Provider value=\{user\}>/);
});
