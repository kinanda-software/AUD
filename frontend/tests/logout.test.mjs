import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tokenKeys = ["audit-token", "access_token", "accessToken", "token", "authToken", "jwt", "jwt_token"];

function loadLogout(fetch) {
  const storage = new Map(tokenKeys.map((key) => [key, "test-token"]));
  storage.set("audit-remember-username", "test-user");
  const navigations = [];
  const modules = new Map();
  const globals = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key),
    },
    window: { location: { replace: (url) => navigations.push(url) } },
    document: { cookie: "csrftoken=test-csrf" },
    Headers,
    FormData,
    fetch,
  };
  function load(name) {
    if (name === "@/lib/apiConfig") return { API_ORIGIN: "http://127.0.0.1:8000" };
    if (modules.has(name)) return modules.get(name);
    const filename = path.join(root, "src", "lib", `${name.split("/").at(-1)}.ts`);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, { ...globals, exports, require: load });
    modules.set(name, exports);
    return exports;
  }
  return { logout: load("@/lib/logout").logoutToLogin, storage, navigations, load };
}

test("successful logout sends authenticated request, clears tokens and navigates to login", async () => {
  const app = loadLogout(async (url, options) => {
    assert.equal(url, "http://127.0.0.1:8000/api/auth/logout/");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include");
    assert.equal(options.headers.get("Authorization"), "Token test-token");
    assert.equal(options.headers.get("X-CSRFToken"), "test-csrf");
    assert.equal(app.storage.get("audit-token"), "test-token");
    return Response.json({ message: "Logout successful." });
  });
  await app.logout();
  for (const key of tokenKeys) assert.equal(app.storage.has(key), false);
  assert.equal(app.storage.get("audit-remember-username"), "test-user");
  assert.equal(app.load("@/lib/authStorage").getStoredAccessToken(), null);
  assert.deepEqual(app.navigations, ["/login"]);
});

for (const failure of ["server", "network"]) {
  test(`${failure} failure does not clear credentials or navigate as if logout succeeded`, async () => {
    const app = loadLogout(async () => {
      if (failure === "network") throw new Error("Network unavailable");
      return Response.json({ error: "Logout unavailable" }, { status: 500 });
    });
    await assert.rejects(app.logout(), /unavailable/i);
    assert.equal(app.storage.get("audit-token"), "test-token");
    assert.deepEqual(app.navigations, []);
  });
}

test("header uses the logout flow and renders logout failures", () => {
  const source = fs.readFileSync(path.join(root, "src", "components", "layout", "Header.tsx"), "utf8");
  assert.match(source, /await logoutToLogin\(\)/);
  assert.match(source, /setLogoutError\("Unable to log out/);
  assert.match(source, /role="alert"/);
});
