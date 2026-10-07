import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadModules(fetch) {
  const modules = new Map();
  function load(name) {
    if (name === "@/lib/apiConfig") return { API_ORIGIN: "http://127.0.0.1:8000" };
    if (modules.has(name)) return modules.get(name);
    const filename = path.join(root, "src", "lib", `${name.split("/").at(-1)}.ts`);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(compiled, {
      exports, require: load, URL, Date, AbortController, Headers, FormData, fetch,
      window: {},
      localStorage: { getItem: () => "dashboard-test-token", removeItem: () => {} },
      document: { cookie: "csrftoken=test-csrf" },
    });
    modules.set(name, exports);
    return exports;
  }
  return load;
}

const today = new Date(2026, 9, 7, 23, 30);
function engagement(id, overrides = {}) {
  return {
    id, engagement_code: `REAL-${id}`, client_name: `Client ${id}`, title: `Audit ${id}`,
    status: "planning", current_phase: "phase_1", risk_level: "medium",
    planned_end_date: null, progress_percentage: 20,
    updated_at: "2026-10-07T08:00:00Z", ...overrides,
  };
}

test("calendar deadlines distinguish overdue, today and the inclusive 14-day boundary", () => {
  const api = loadModules()("@/lib/dashboard");
  for (const [value, expected] of [
    ["2026-10-06", -1], ["2026-10-07", 0], ["2026-10-08", 1],
    ["2026-10-21", 14], ["2026-10-22", 15], [null, null],
  ]) assert.equal(api.daysUntil(value, today), expected);
  assert.equal(api.daysUntil("2026-03-09", new Date(2026, 2, 8, 23, 59)), 1);
  assert.equal(api.deadlineLabel(-1), "1 day overdue");
  assert.equal(api.deadlineLabel(-30), "30 days overdue");
  assert.equal(api.deadlineLabel(0), "Due today");
  assert.equal(api.deadlineLabel(1), "Due tomorrow");
  assert.equal(api.deadlineLabel(14), "Due in 14 days");
  assert.equal(api.deadlineLabel(null), "No deadline");
  assert.match(api.formatCalendarDate("2026-10-07"), /07 Oct 2026/);
  assert.throws(() => api.daysUntil("2026-02-30", today), /Invalid calendar date/);
  assert.throws(() => api.daysUntil("not-a-date", today), /Invalid calendar date/);
});

test("dashboard metrics, phase counts and risk counts use the same real active population", () => {
  const api = loadModules()("@/lib/dashboard");
  const data = {
    engagements: [
      engagement(1, { risk_level: "high", planned_end_date: "2026-10-06" }),
      engagement(2, { risk_level: "high", planned_end_date: "2026-10-07", progress_percentage: 80 }),
      engagement(3, { current_phase: "phase_2", planned_end_date: "2026-10-21" }),
      engagement(4, { current_phase: "phase_3", planned_end_date: "2026-10-22", risk_level: "low" }),
      engagement(5, { current_phase: "phase_4", status: "reporting" }),
      engagement(6, { status: "completed", risk_level: "high", planned_end_date: "2026-09-01" }),
      engagement(7, { status: "cancelled", risk_level: "high", planned_end_date: "2026-09-02" }),
    ],
    reviews: [
      { id: 1, engagement: 1, status: "Pending" },
      { id: 2, engagement: 2, status: "Returned" },
      { id: 3, engagement: 3, status: "Completed" },
      { id: 4, engagement: 6, status: "Pending" },
      { id: 5, engagement: 7, status: "Pending" },
    ],
  };
  const result = api.summarizeDashboard(data, today);
  assert.equal(result.total, 7);
  assert.equal(result.active.length, 5);
  assert.equal(result.completed, 1);
  assert.equal(result.cancelled, 1);
  assert.equal(result.highRisk, 2);
  assert.equal(result.highRisk, result.risks.find((item) => item.risk === "high").count);
  assert.equal(result.risks.reduce((sum, item) => sum + item.count, 0), result.active.length);
  assert.equal(result.phases.reduce((sum, item) => sum + item.count, 0), result.active.length);
  assert.equal(result.phases[0].averageProgress, 50);
  assert.equal(result.dueSoon, 2);
  assert.equal(result.overdue, 1);
  assert.equal(result.noDeadline, 1);
  assert.deepEqual(Array.from(result.openReviews, (item) => item.id), [1, 2]);
  assert.deepEqual(Array.from(result.deadlines, (item) => item.engagement.id), [1, 2, 3, 4]);
});

test("an empty portfolio stays genuinely empty and unclassified records are explicit", () => {
  const api = loadModules()("@/lib/dashboard");
  const empty = api.summarizeDashboard({ engagements: [], reviews: [] }, today);
  assert.equal(empty.total, 0);
  assert.equal(empty.highRisk, 0);
  assert.equal(empty.phases[0].averageProgress, null);
  const unknown = api.summarizeDashboard({
    engagements: [engagement(1, { risk_level: "unknown", current_phase: "completed" })],
    reviews: [],
  }, today);
  assert.equal(unknown.unassignedPhase, 1);
  assert.equal(unknown.unclassifiedRisk, 1);
});

test("all paginated records are loaded with token authentication rather than counting page one", async () => {
  const requests = [];
  const api = loadModules(async (url, options) => {
    requests.push(url);
    assert.equal(options.headers.get("Authorization"), "Token dashboard-test-token");
    assert.equal(options.credentials, "include");
    assert.equal(options.cache, "no-store");
    if (url.endsWith("/review-assignments/")) return Response.json([]);
    if (url.endsWith("?page=2")) return Response.json({ results: [engagement(2)], next: null });
    return Response.json({ results: [engagement(1)], next: "http://127.0.0.1:8000/api/engagements/?page=2" });
  })("@/lib/dashboard");
  const data = await api.loadDashboard();
  assert.equal(data.engagements.length, 2);
  assert.equal(requests.length, 3);
});

test("invalid pagination, cross-origin links and repeated links fail explicitly", async () => {
  for (const next of ["https://unrelated.example/api/engagements/?page=2", "/api/clients/", "/api/engagements/"]) {
    const api = loadModules(async () => Response.json({ results: [], next }))("@/lib/dashboard");
    await assert.rejects(api.fetchAllRecords("/engagements/"), /pagination/);
  }
  const api = loadModules(async () => Response.json({ count: 2 }))("@/lib/dashboard");
  await assert.rejects(api.fetchAllRecords("/engagements/"), /Invalid list response/);
});

test("API failure never becomes a successful empty dashboard and invalid progress is rejected", async () => {
  const unavailable = loadModules(async () => Response.json({ detail: "Service unavailable" }, { status: 503 }))("@/lib/dashboard");
  await assert.rejects(unavailable.loadDashboard(), /unavailable/);
  const invalid = loadModules(async (url) => Response.json(
    url.endsWith("/engagements/") ? [engagement(1, { progress_percentage: 101 })] : [],
  ))("@/lib/dashboard");
  await assert.rejects(invalid.loadDashboard(), /Invalid recorded progress/);
});

test("notification reads and mutations use the real per-user API and persist changes", async () => {
  const requests = [];
  const notification = { id: 22, title: "Review assigned", message: "Test", is_read: true, notification_type: "review", created_at: "2026-10-07T08:00:00Z" };
  const api = loadModules(async (url, options) => {
    requests.push({ url, method: options.method });
    assert.equal(options.headers.get("Authorization"), "Token dashboard-test-token");
    if (options.method !== "GET") assert.equal(options.headers.get("X-CSRFToken"), "test-csrf");
    if (options.method === "GET") return Response.json([notification]);
    if (url.endsWith("/22/read/")) return Response.json({ notification });
    return Response.json({ message: "Success" });
  })("@/lib/notifications");
  assert.equal((await api.getNotifications()).length, 1);
  assert.equal((await api.markNotificationRead(22)).is_read, true);
  await api.markAllNotificationsRead();
  await api.deleteNotification(22);
  assert.deepEqual(requests, [
    { url: "http://127.0.0.1:8000/api/notifications/", method: "GET" },
    { url: "http://127.0.0.1:8000/api/notifications/22/read/", method: "POST" },
    { url: "http://127.0.0.1:8000/api/notifications/read-all/", method: "POST" },
    { url: "http://127.0.0.1:8000/api/notifications/22/", method: "DELETE" },
  ]);
});

test("notification failures remain errors", async () => {
  const api = loadModules(async () => Response.json({ error: "Request failed" }, { status: 500 }))("@/lib/notifications");
  await assert.rejects(api.getNotifications(), /failed/);
  await assert.rejects(api.markAllNotificationsRead(), /failed/);
});

test("a malformed notification acknowledgement is not accepted as a successful read", async () => {
  for (const body of [{}, { notification: { id: 22, is_read: false } }, { notification: { id: 23, is_read: true } }]) {
    const api = loadModules(async () => Response.json(body))("@/lib/notifications");
    await assert.rejects(api.markNotificationRead(22), /did not confirm/);
  }
});
