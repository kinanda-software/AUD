const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadModule(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) => dependencies[name] ?? require(name), module, module.exports,
  );
  return module.exports;
}

const contract = loadModule("src\\lib\\workpaperContract.ts");
const record = (data, status = "In Progress") => ({
  id: 42, engagement: 12, section: "inventory", data, completion_status: status,
  completed_at: status === "Completed" ? "2026-10-01T00:00:00Z" : null,
});

function harness(apiRequest) {
  const state = [];
  const effects = [];
  let cursor = 0;
  let pendingEffects = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (next) => {
        state[index] = typeof next === "function" ? next(state[index]) : next;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = { current: initial };
      return state[index];
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      if (!effects[index] || dependencies.some((value, i) => effects[index][i] !== value)) {
        effects[index] = dependencies;
        pendingEffects.push(callback);
      }
    },
  };
  const { useWorkpaper } = loadModule("src\\lib\\useWorkpaper.ts", {
    react, "@/lib/api": { apiRequest }, "@/lib/workpaperContract": contract,
  });
  function render() {
    cursor = 0;
    const workpaper = useWorkpaper("12", "inventory");
    const [risks, setRisks] = workpaper.field("risks", []);
    pendingEffects.splice(0).forEach((effect) => effect());
    return { ...workpaper, risks, setRisks };
  }
  return render;
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("rejects malformed, wrong-engagement, and false-save API responses", () => {
  for (const invalid of [null, [], {}, { ...record({ risks: [] }), engagement: 99 },
    { ...record({ risks: [] }), section: "other" },
    { ...record({ risks: [] }), completion_status: "Issued" },
    { ...record({ risks: [] }), data: [] },
    { ...record({ risks: [] }), completed_at: "invalid" },
    { ...record({ risks: [] }, "Completed"), completed_at: 123 },
    { ...record({ risks: [] }), id: null },
    { ...record({ risks: [] }, "Completed"), completed_at: null }]) {
    assert.throws(() => contract.validateWorkpaperResponse(invalid, "12", "inventory", true));
  }
});

test("edits made during a save are retained and require another save", async () => {
  let resolveSave;
  const render = harness(async (_url, options) => {
    if (!options) return record({ risks: [] });
    const body = JSON.parse(options.body);
    return new Promise((resolve) => { resolveSave = () => resolve(record(body.data)); });
  });
  render();
  await settle();
  let workpaper = render();
  workpaper.setRisks([{ id: 1, level: "Low" }]);
  workpaper = render();
  const saving = workpaper.save();
  workpaper.setRisks([{ id: 1, level: "High" }]);
  resolveSave();
  assert.equal(await saving, false);
  workpaper = render();
  assert.deepEqual(workpaper.risks, [{ id: 1, level: "High" }]);
  assert.equal(workpaper.saved, false);
  assert.match(workpaper.error, /newer edits/);
});
test("loads database values, confirms completion, invalidates completion on edits, and saves exact data", async () => {
  const requests = [];
  const render = harness(async (url, options) => {
    requests.push({ url, options });
    if (!options) return record({ risks: [{ id: 7, level: "High" }] }, "Completed");
    const body = JSON.parse(options.body);
    return record(body.data, body.complete ? "Completed" : "In Progress");
  });
  assert.equal(render().loading, true);
  await settle();
  let workpaper = render();
  assert.deepEqual(workpaper.risks, [{ id: 7, level: "High" }]);
  assert.equal(workpaper.status, "Completed");
  workpaper.setRisks([{ id: 7, level: "Low" }]);
  workpaper = render();
  assert.equal(workpaper.status, "In Progress");
  assert.equal(workpaper.saved, false);
  assert.equal(await workpaper.save(), true);
  workpaper = render();
  assert.equal(workpaper.saved, true);
  assert.equal(workpaper.status, "In Progress");
  assert.equal(await workpaper.save(true), true);
  assert.equal(render().status, "Completed");
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    data: { risks: [{ id: 7, level: "Low" }] }, complete: false,
  });
  assert.equal(requests[1].url, "/engagements/12/workpapers/inventory/");
});

test("failed save leaves unsaved status and allows correction and retry", async () => {
  let fail = true;
  const render = harness(async (_url, options) => {
    if (!options) return record({ risks: [] });
    if (fail) throw new Error("Completion requires assessed risk levels.");
    const body = JSON.parse(options.body);
    return record(body.data, body.complete ? "Completed" : "In Progress");
  });
  render();
  await settle();
  assert.equal(await render().save(true), false);
  let workpaper = render();
  assert.equal(workpaper.saved, false);
  assert.match(workpaper.error, /requires assessed/);
  fail = false;
  workpaper.setRisks([{ id: 1, level: "High" }]);
  assert.equal(await render().save(true), true);
});

test("load failures and malformed stored field types never allow overwriting", async () => {
  for (const response of [new Error("Unauthorized"), record({ risks: "invalid" })]) {
    let writes = 0;
    const render = harness(async (_url, options) => {
      if (options) writes++;
      if (response instanceof Error) throw response;
      return response;
    });
    render();
    await settle();
    const workpaper = render();
    assert.equal(workpaper.blocked, true);
    assert.equal(await workpaper.save(), false);
    assert.equal(writes, 0);
  }
});

test("all seven pages use real persistence and contain no false save timers or log-only saves", () => {
  const pages = [
    ...["evaluate-misstatements", "financial-statement-procedures", "summary-review", "client-communications", "opinion-report"]
      .map((name) => `conclusion-reporting\\${name}\\page.tsx`),
    "execution\\3.6\\page.tsx", "risk-assessment\\transaction-cycles\\inventory\\page.tsx",
  ];
  for (const page of pages) {
    const source = fs.readFileSync(path.join(__dirname, "..", "src\\app\\engagements\\[id]", page), "utf8");
    assert.match(source, /useWorkpaper/);
    assert.match(source, /workpaper\.save/);
    assert.match(source, /WorkpaperNotice/);
    assert.doesNotMatch(source, /setTimeout|setSaved\(true\)|console\.log/);
  }
});
