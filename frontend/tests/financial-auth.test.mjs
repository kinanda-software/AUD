import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("execution assessment pages parse after callback dependency updates", () => {
  for (const page of ["3.1", "3.2", "3.3", "3.4", "3.5"]) {
    const filename = path.join(root, "src", "app", "engagements", "[id]", "execution", page, "page.tsx");
    const source = ts.createSourceFile(
      filename, fs.readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true,
      ts.ScriptKind.TSX,
    );
    assert.equal(
      source.parseDiagnostics.length, 0,
      `${page}: ${source.parseDiagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n")}`,
    );
  }
});

function loadApi(token, fetch) {
  const source = fs.readFileSync(path.join(root, "src", "lib", "api.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  const context = vm.createContext({
    exports,
    require(name) {
      assert.equal(name, "@/lib/apiConfig");
      return { API_ORIGIN: "http://127.0.0.1:8000" };
    },
    window: {},
    localStorage: {
      getItem: () => token,
      removeItem: () => {},
    },
    document: { cookie: "csrftoken=test-csrf" },
    Headers,
    FormData,
    fetch,
  });
  vm.runInContext(compiled, context);
  return exports;
}

test("financial pages use the shared authenticated helper for every request", () => {
  for (const page of ["adjustments", "chart-of-accounts"]) {
    const filename = path.join(root, "src", "app", "financials", page, "page.tsx");
    const source = ts.createSourceFile(
      filename, fs.readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true,
      ts.ScriptKind.TSX,
    );
    let sharedImport = false;
    let requestCount = 0;
    function visit(node) {
      if (ts.isImportDeclaration(node)
        && node.moduleSpecifier.text === "@/lib/api") {
        sharedImport = node.importClause.namedBindings.elements.some(
          (element) => element.name.text === "apiRequest",
        );
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        assert.notEqual(node.expression.text, "fetch", `${page} bypasses authentication`);
        if (node.expression.text === "apiRequest") {
          requestCount++;
          const endpoint = node.arguments[0];
          if (ts.isStringLiteral(endpoint)
            || ts.isNoSubstitutionTemplateLiteral(endpoint)) {
            assert.ok(!endpoint.text.startsWith("/api/"), "API prefix must not be duplicated");
          } else if (ts.isTemplateExpression(endpoint)) {
            assert.ok(!endpoint.head.text.startsWith("/api/"), "API prefix must not be duplicated");
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(sharedImport, `${page} must import the shared helper`);
    assert.equal(requestCount, page === "adjustments" ? 7 : 4);
  }
});

test("financial reads and writes send the login token and retain session support", async () => {
  const requests = [];
  const api = loadApi("test-token", async (url, options) => {
    requests.push({ url, options });
    return Response.json({ id: 1 });
  });
  for (const [endpoint, method] of [
    ["/engagements/", "GET"],
    ["/financials/chart-of-accounts/?engagement=1", "GET"],
    ["/financials/trial-balances/?engagement=1", "GET"],
    ["/financials/adjustments/", "GET"],
    ["/financials/chart-of-accounts/", "POST"],
    ["/financials/chart-of-accounts/1/", "PATCH"],
    ["/financials/chart-of-accounts/1/", "DELETE"],
    ["/financials/adjustments/", "POST"],
    ["/financials/adjustments/1/", "PATCH"],
    ["/financials/adjustments/1/post/", "POST"],
    ["/financials/adjustments/1/reject/", "POST"],
  ]) {
    await api.apiRequest(endpoint, { method });
    const request = requests.at(-1);
    assert.equal(request.url, `http://127.0.0.1:8000/api${endpoint}`);
    assert.equal(request.options.headers.get("Authorization"), "Token test-token");
    assert.equal(request.options.credentials, "include");
    if (method !== "GET") {
      assert.equal(request.options.headers.get("X-CSRFToken"), "test-csrf");
    }
  }
});

test("missing authentication remains an explicit error, not an empty successful list", async () => {
  const api = loadApi(null, async (_url, options) => {
    assert.equal(options.headers.has("Authorization"), false);
    return Response.json(
      { detail: "Authentication credentials were not provided." },
      { status: 401 },
    );
  });

  await assert.rejects(
    api.apiRequest("/financials/chart-of-accounts/"),
    /Authentication credentials were not provided/,
  );
});

test("audit team user selection uses token authentication and preserves backend response shapes", async () => {
  const source = fs.readFileSync(path.join(
    root, "src", "app", "engagements", "[id]", "audit-planning", "audit-team", "page.tsx",
  ), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.match(source, /setUsers\(await getAuditTeamUsers\(\)\)/);
  assert.match(source, /setUsersError\(/);
  assert.match(source, /role="alert"/);

  const users = [{ id: 7, username: "test-auditor", is_active: true }];
  for (const payload of [users, { count: 1, users }, { count: 0, users: [] }]) {
    const api = loadApi("saved-login-token", async (url, options) => {
      assert.equal(url, "http://127.0.0.1:8000/api/auth/audit-team-users/");
      assert.equal(options.method, "GET");
      assert.equal(options.headers.get("Authorization"), "Token saved-login-token");
      assert.equal(options.credentials, "include");
      return Response.json(payload);
    });
    const result = await api.getAuditTeamUsers();
    assert.deepEqual(JSON.parse(JSON.stringify(result)), Array.isArray(payload) ? payload : payload.users);
  }
});

test("audit team user failures and malformed responses are not empty successful lists", async () => {
  for (const status of [401, 403, 500]) {
    const api = loadApi("saved-login-token", async () => Response.json(
      { detail: `User directory failed (${status}).` }, { status },
    ));
    await assert.rejects(api.getAuditTeamUsers(), new RegExp(`User directory failed \\(${status}\\)`));
  }
  for (const payload of [{}, { users: null }, { users: [{ id: "7", username: "test" }] }, { users: [{ id: 7 }] }]) {
    const api = loadApi("saved-login-token", async () => Response.json(payload));
    await assert.rejects(api.getAuditTeamUsers(), /Invalid audit team users response/);
  }
});

test("Phase 2.2 loading and both save paths use shared token and CSRF authentication", async () => {
  const filename = path.join(root, "src", "app", "engagements", "[id]", "risk-assessment", "2.2", "page.tsx");
  const text = fs.readFileSync(filename, "utf8");
  assert.doesNotMatch(text, /\bfetch\s*\(|getCookie|API_BASE_URL/);
  assert.match(text, /apiResponse\(endpoint,/);
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const methods = [];
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "authenticatedFetch") {
      const options = node.arguments[1];
      const method = options.properties.find((property) => property.name?.getText(source) === "method");
      methods.push(method.initializer.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.deepEqual(methods, ["GET", "PATCH", "POST"]);
  for (const [endpoint, method] of [
    ["/process-flow-walkthroughs/?engagement=12", "GET"],
    ["/process-flow-walkthroughs/7/", "PATCH"],
    ["/process-flow-walkthroughs/", "POST"],
  ]) {
    const api = loadApi("saved-login-token", async (url, options) => {
      assert.equal(url, `http://127.0.0.1:8000/api${endpoint}`);
      assert.equal(options.headers.get("Authorization"), "Token saved-login-token");
      assert.equal(options.credentials, "include");
      assert.equal(options.cache, "no-store");
      if (method !== "GET") {
        assert.equal(options.headers.get("X-CSRFToken"), "test-csrf");
        assert.deepEqual(JSON.parse(options.body), { engagement: 12, process_name: "Test" });
      }
      return Response.json({ id: 7 });
    });
    const response = await api.apiResponse(endpoint, {
      method, cache: "no-store",
      ...(method !== "GET" ? { body: JSON.stringify({ engagement: 12, process_name: "Test" }) } : {}),
    });
    assert.equal((await response.json()).id, 7);
  }
});

test("Phase 2.3 risk point reads and writes retain token authentication and DELETE supports 204", async () => {
  const filename = path.join(root, "src", "app", "engagements", "[id]", "risk-assessment", "2.3", "page.tsx");
  const text = fs.readFileSync(filename, "utf8");
  assert.doesNotMatch(text, /\bfetch\s*\(|getCookie|API_BASE_URL/);
  assert.match(text, /apiResponse\(endpoint,/);
  assert.match(text, /createEmptyRisk\(Date\.now\(\)\)/);
  assert.match(text, /response\.status === 204/);
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const methods = [];
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "authenticatedFetch") {
      const method = node.arguments[1].properties.find((property) => property.name?.getText(source) === "method");
      methods.push(method.initializer.text);
      assert.ok(node.arguments[0].getText(source).startsWith("`/risk-points/"));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.deepEqual(methods, ["GET", "DELETE", "PATCH", "POST"]);
  for (const method of methods) {
    const endpoint = method === "GET" ? "/risk-points/?engagement=12" : method === "POST" ? "/risk-points/" : "/risk-points/7/";
    const api = loadApi("saved-login-token", async (url, options) => {
      assert.equal(url, `http://127.0.0.1:8000/api${endpoint}`);
      assert.equal(options.method, method);
      assert.equal(options.headers.get("Authorization"), "Token saved-login-token");
      assert.equal(options.credentials, "include");
      if (method !== "GET") assert.equal(options.headers.get("X-CSRFToken"), "test-csrf");
      if (method === "POST" || method === "PATCH") {
        assert.deepEqual(JSON.parse(options.body), { engagement: 12, account: "Receivables" });
      }
      return method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ id: 7 });
    });
    const response = await api.apiResponse(endpoint, {
      method,
      ...(method === "POST" || method === "PATCH" ? { body: JSON.stringify({ engagement: 12, account: "Receivables" }) } : {}),
    });
    assert.equal(response.status, method === "DELETE" ? 204 : 200);
  }
  const rejected = loadApi(null, async () => Response.json(
    { detail: "Authentication credentials were not provided." }, { status: 401 },
  ));
  await assert.rejects(rejected.apiResponse("/risk-points/"), /Authentication credentials were not provided/);
});

test("Execution 3.1 control test loading and saves use token authentication", async () => {
  const filename = path.join(root, "src", "app", "engagements", "[id]", "execution", "3.1", "page.tsx");
  const source = fs.readFileSync(filename, "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|getCookie|API_BASE_URL/);
  assert.match(source, /apiResponse\(endpoint,/);
  assert.match(source, /`\/control-test-executions\/\?engagement=/);
  assert.match(source, /`\/control-test-executions\/\$\{testId\}\//);
  assert.match(source, /method: isUpdating\s*\? "PATCH"\s*: "POST"/);
  assert.match(source, /Number\.isInteger\(responseData\.id\)/);
  for (const [endpoint, method] of [
    ["/control-test-executions/?engagement=12", "GET"],
    ["/control-test-executions/", "POST"],
    ["/control-test-executions/7/", "PATCH"],
  ]) {
    const payload = { engagement: 12, control_name: "Authorization", sample_size: 5 };
    const api = loadApi("saved-login-token", async (url, options) => {
      assert.equal(url, `http://127.0.0.1:8000/api${endpoint}`);
      assert.equal(options.method, method);
      assert.equal(options.headers.get("Authorization"), "Token saved-login-token");
      assert.equal(options.credentials, "include");
      if (method !== "GET") {
        assert.equal(options.headers.get("X-CSRFToken"), "test-csrf");
        assert.deepEqual(JSON.parse(options.body), payload);
      }
      return Response.json({ ...payload, id: 7 });
    });
    const response = await api.apiResponse(endpoint, {
      method, cache: "no-store",
      ...(method !== "GET" ? { body: JSON.stringify(payload) } : {}),
    });
    assert.equal((await response.json()).id, 7);
  }
});

test("Execution 3.2 assessment loading and saves use shared authentication", async () => {
  const filename = path.join(root, "src", "app", "engagements", "[id]", "execution", "3.2", "page.tsx");
  const source = fs.readFileSync(filename, "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|getCookie|API_BASE_URL/);
  assert.match(source, /apiResponse\(endpoint,/);
  assert.match(source, /`\/interim-year-end-assessments\/\?engagement=/);
  assert.match(source, /`\/interim-year-end-assessments\/\$\{assessmentId\}\//);
  assert.match(source, /method: isUpdating\s*\? "PATCH"\s*: "POST"/);
  assert.match(source, /Number\.isInteger\(responseData\.id\)/);
  for (const [endpoint, method] of [
    ["/interim-year-end-assessments/?engagement=12", "GET"],
    ["/interim-year-end-assessments/", "POST"],
    ["/interim-year-end-assessments/7/", "PATCH"],
  ]) {
    const payload = { engagement: 12, control_name: "Authorization", conclusion: "Test conclusion" };
    const api = loadApi("saved-login-token", async (url, options) => {
      assert.equal(url, `http://127.0.0.1:8000/api${endpoint}`);
      assert.equal(options.method, method);
      assert.equal(options.headers.get("Authorization"), "Token saved-login-token");
      assert.equal(options.credentials, "include");
      if (method !== "GET") {
        assert.equal(options.headers.get("X-CSRFToken"), "test-csrf");
        assert.deepEqual(JSON.parse(options.body), payload);
      }
      return Response.json({ ...payload, id: 7 });
    });
    const response = await api.apiResponse(endpoint, {
      method, cache: "no-store",
      ...(method !== "GET" ? { body: JSON.stringify(payload) } : {}),
    });
    assert.equal((await response.json()).id, 7);
  }
});

test("execution workpapers cannot bounce token-authenticated users through cookie-only login redirects", async () => {
  for (const [page, resource, requestCount] of [
    ["3.3", "fraud-journal-entry-assessments", 2],
    ["3.4", "substantive-procedure-assessments", 3],
    ["3.5", "general-audit-procedures", 3],
  ]) {
    const filename = path.join(root, "src", "app", "engagements", "[id]", "execution", page, "page.tsx");
    const text = fs.readFileSync(filename, "utf8");
    assert.doesNotMatch(text, /\bfetch\s*\(|handleAuthenticationFailure|\/login\?next=/);
    const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let count = 0;
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === "apiResponse") count++;
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.equal(count, requestCount);
    for (const method of ["GET", "POST", "PATCH"]) {
      const endpoint = method === "GET" ? `/${resource}/?engagement=12` : method === "POST" ? `/${resource}/` : `/${resource}/7/`;
      const api = loadApi("saved-login-token", async (url, options) => {
        assert.equal(url, `http://127.0.0.1:8000/api${endpoint}`);
        assert.equal(options.headers.get("Authorization"), "Token saved-login-token");
        assert.equal(options.credentials, "include");
        if (method !== "GET") assert.equal(options.headers.get("X-CSRFToken"), "test-csrf");
        return Response.json({ id: 7 });
      });
      assert.equal((await api.apiResponse(endpoint, { method })).status, 200);
    }
    const rejected = loadApi("expired", async () => Response.json(
      { detail: "Invalid token." }, { status: 401 },
    ));
    await assert.rejects(rejected.apiResponse(`/${resource}/`), /Invalid token/);
  }
});

test("new engagement creation uses shared authentication instead of cookie-only fetch", async () => {
    const filename = path.join(root, "src", "app", "engagements", "new", "page.tsx");
    const source = ts.createSourceFile(
      filename, fs.readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX,
    );
    let sharedRequest = false;
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        assert.notEqual(node.expression.text, "fetch", "New engagement must not bypass token authentication");
        if (node.expression.text === "apiRequest") {
          assert.equal(node.arguments[0].text, "/engagements/");
          sharedRequest = true;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(sharedRequest);
    const payload = {
      engagement_code: "TEST-NEW-1", client: 12, title: "Test audit",
      engagement_type: "financial_statement", status: "planning",
      current_phase: "phase_1", start_date: "2026-10-07",
      financial_year_end: "2026-06-30", progress_percentage: 0,
    };
    const api = loadApi("saved-login-token", async (url, options) => {
      assert.equal(url, "http://127.0.0.1:8000/api/engagements/");
      assert.equal(options.method, "POST");
      assert.equal(options.headers.get("Authorization"), "Token saved-login-token");
      assert.equal(options.headers.get("X-CSRFToken"), "test-csrf");
      assert.equal(options.credentials, "include");
      assert.deepEqual(JSON.parse(options.body), payload);
      return Response.json({ ...payload, id: 123 }, { status: 201 });
    });
    const created = await api.apiRequest("/engagements/", {
      method: "POST", body: JSON.stringify(payload),
    });
    assert.equal(created.id, 123);
});
