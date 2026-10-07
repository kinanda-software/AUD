import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function loadPortfolio(fetch, moduleName = "@/lib/auditPortfolio") {
  const modules = new Map();
  function load(name) {
    if (name === "@/lib/apiConfig") return { API_ORIGIN: "http://127.0.0.1:8000" };
    if (modules.has(name)) return modules.get(name);
    const source = fs.readFileSync(path.join(root, "src", "lib", `${name.split("/").at(-1)}.ts`), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
      exports, require: load, fetch, URL, Date, Headers, FormData,
      localStorage: { getItem: () => "test-token", removeItem: () => {} },
      window: {}, document: { cookie: "csrftoken=test-csrf" },
    });
    modules.set(name, exports);
    return exports;
  }
  return load(moduleName);
}
function engagement(id, overrides = {}) {
  return {
    id, engagement_code: `ENG-${id}`, title: "Financial statement audit",
    client_name: "Test entity", status: "planning", risk_level: "medium",
    current_phase: "phase_1", progress_percentage: 0, start_date: "2026-10-01",
    planned_end_date: null, financial_year_end: "2026-06-30",
    engagement_type: "financial_statement", lead_auditor_username: "test-auditor",
    ...overrides,
  };
}

test("audit portfolio loads real engagement IDs across pagination with authentication", async () => {
  const api = loadPortfolio(async (url, options) => {
    assert.equal(options.headers.get("Authorization"), "Token test-token");
    assert.equal(options.cache, "no-store");
    return Response.json(url.includes("page=2")
      ? { results: [engagement(902)], next: null }
      : { results: [engagement(901)], next: "/api/engagements/?page=2" });
  });
  const result = await api.loadAuditPortfolio();
  assert.deepEqual(Array.from(result, (item) => item.id), [901, 902]);
});

test("filters retain actual status and risk values without inventing significant risk or approval", () => {
  const api = loadPortfolio();
  const records = [
    engagement(1, { status: "risk_assessment", risk_level: "high" }),
    engagement(2, { status: "cancelled" }),
    engagement(3, { status: "completed" }),
  ];
  assert.equal(api.filterPortfolio(records, "test-auditor", "risk_assessment", "high").length, 1);
  assert.equal(api.filterPortfolio(records, "financial statement", "all", "all").length, 3);
  assert.equal(api.filterPortfolio(records, "missing", "all", "all").length, 0);
  assert.equal(records.filter(api.isActiveEngagement).length, 1);
  assert.equal(api.filterPortfolio(records, "", "cancelled", "all")[0].id, 2);
});

test("invalid records and server failures are not replaced with demo data", async () => {
  for (const overrides of [{ id: "ENG-1" }, { progress_percentage: 101 }, { start_date: "2026-02-30" }]) {
    const api = loadPortfolio(async () => Response.json([engagement(1, overrides)]));
    await assert.rejects(api.loadAuditPortfolio(), /invalid/i);
  }
  const failed = loadPortfolio(async () => Response.json({ error: "Unavailable" }, { status: 500 }));
  await assert.rejects(failed.loadAuditPortfolio(), /Unavailable/);
});

function completion(id, engagementId, overrides = {}) {
  return {
    id, engagement: engagementId, status: "In Progress",
    financial_statements_finalized: false, audit_adjustments_reviewed: false,
    subsequent_events_reviewed: false, going_concern_reviewed: false,
    legal_matters_reviewed: false, related_parties_reviewed: false,
    audit_documentation_completed: false, review_points_cleared: false,
    partner_review_completed: false, eqr_completed: false,
    outstanding_matters: "", final_review_notes: "", completion_conclusion: "",
    completed_by_name: null, completion_date: null,
    updated_at: "2026-10-07T08:00:00Z", ...overrides,
  };
}

test("reporting joins by numeric engagement ID; missing review is not draft or approved", () => {
  const api = loadPortfolio(undefined, "@/lib/reportingPortfolio");
  const rows = api.joinReportingRecords(
    [engagement(1), engagement(2), engagement(3, { status: "completed" })],
    [completion(10, 2), completion(11, 3, { status: "Completed" })],
  );
  assert.equal(api.reportingState(rows[0]), "No review record");
  assert.equal(api.reportingState(rows[1]), "In Progress");
  assert.equal(api.reportingState(rows[2]), "Completed");
  assert.equal(api.filterReportingRecords(rows, "ENG-3", "Completed")[0].engagement.id, 3);
  assert.equal(api.filterReportingRecords(rows, "", "No review record").length, 1);
  assert.throws(() => api.joinReportingRecords([engagement(1)], [completion(1, 1), completion(2, 1)]), /Multiple completion/);
});

test("reporting uses saved completion records and rejects checklist or date corruption", async () => {
  const requests = [];
  const api = loadPortfolio(async (url) => {
    requests.push(url);
    return Response.json(url.includes("/engagements/")
      ? [engagement(1)] : [completion(2, 1)]);
  }, "@/lib/reportingPortfolio");
  const result = await api.loadReportingPortfolio();
  assert.equal(result[0].completion.id, 2);
  assert.equal(requests.some((url) => url.endsWith("/completion-reviews/")), true);
  for (const overrides of [{ partner_review_completed: "yes" }, { completion_date: "2026-02-30" }, { status: "Issued" }]) {
    const invalid = loadPortfolio(async (url) => Response.json(url.includes("/engagements/")
      ? [engagement(1)] : [completion(2, 1, overrides)]), "@/lib/reportingPortfolio");
    await assert.rejects(invalid.loadReportingPortfolio(), /invalid/i);
  }
});

test("live directories do not link using engagement codes or offer fictional report downloads", () => {
  const audits = fs.readFileSync(path.join(root, "src", "app", "audits", "page.tsx"), "utf8");
  const reports = fs.readFileSync(path.join(root, "src", "app", "reports", "page.tsx"), "utf8");
  assert.doesNotMatch(audits + reports, /ABC Manufacturing|Tanzania Commercial Bank|rep-001/);
  assert.match(audits, /engagements\/\$\{item\.id\}/);
  assert.match(reports, /engagements\/\$\{row\.engagement\.id\}/);
  assert.doesNotMatch(reports, /opinion-report|Download|reportNumber/);
});
