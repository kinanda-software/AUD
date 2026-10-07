import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filename = path.join(root, "src", "app", "engagements", "[id]", "conclusion-reporting", "summary-review", "page.tsx");
const text = fs.readFileSync(filename, "utf8");

test("4.3 checklist templates contain no invented review results", () => {
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ["initialReviewAreas", "initialJudgments", "initialComments"];
  const declarations = source.statements.filter((node) =>
    ts.isVariableStatement(node) && node.declarationList.declarations.some((declaration) => names.includes(declaration.name.getText(source))),
  );
  const compiled = ts.transpileModule(
    declarations.map((node) => node.getText(source)).join("\n") +
      "\nglobalThis.templates = { initialReviewAreas, initialJudgments, initialComments };",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const context = {};
  vm.runInNewContext(compiled, context);
  const { initialReviewAreas: areas, initialJudgments: judgments, initialComments: comments } = context.templates;
  assert.equal(areas.length, 9);
  assert.equal(judgments.length, 3);
  for (const area of areas) {
    assert.equal(area.status, "Open");
    for (const key of ["reviewer", "reviewDate", "comments"]) assert.equal(area[key], "");
  }
  for (const judgment of judgments) {
    assert.equal(judgment.status, "Not Reviewed");
    assert.equal(judgment.reviewer, "");
    assert.equal(judgment.comments, "");
  }
  assert.equal(comments.length, 0);
  assert.doesNotMatch(text, /DEFAULT_REVIEWER_ID|2026-09-|completedBy: "Audit Manager"/);
  assert.match(text, /completed: false,\s*completedBy: "",\s*completedDate: ""/);
});

test("4.3 persists the full workpaper and includes real assignments without changing their approval state", () => {
  assert.doesNotMatch(text, /\bfetch\s*\(|eslint-disable|console\.log/);
  assert.match(text, /fetchAllRecords<unknown>\("\/review-assignments\/"/);
  assert.match(text, /assignment-\$\{assignment\.id\}/);
  assert.match(text, /assignment\.completed_date/);
  assert.match(text, /assignment\.status === "Completed" \? "Reviewed"/);
  assert.match(text, /workpaper\.save\(true\)/);
  assert.match(text, /!assignmentsLoaded/);
  assert.match(text, /Retry loading assignments/);
});

test("4.4 starts with empty communication lists and uses confirmed persistence", () => {
  const filename = path.join(root, "src", "app", "engagements", "[id]", "conclusion-reporting", "client-communications", "page.tsx");
  const text = fs.readFileSync(filename, "utf8");
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lists = [];
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "workpaper.field"
      && node.typeArguments?.[0] && ["Deficiency[]", "GovernanceMatter[]", "RepresentationItem[]"].includes(node.typeArguments[0].getText(source))) {
      assert.ok(ts.isArrayLiteralExpression(node.arguments[1]));
      assert.equal(node.arguments[1].elements.length, 0);
      lists.push(node.typeArguments[0].getText(source));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(lists.length, 3);
  assert.doesNotMatch(text, /Example control deficiency|Management has disclosed|console\.log/);
  assert.match(text, /communicatedTo: ""/);
  assert.equal((text.match(/crypto\.randomUUID\(\)/g) || []).length, 3);
  assert.match(text, /workpaper\.save/);
  assert.match(text, /WorkpaperNotice/);
  assert.match(text, /workpaper\.blocked/);
});

test("4.5 has no seeded communications, fallback engagement or false completion", () => {
  const filename = path.join(root, "src", "app", "engagements", "[id]", "conclusion-reporting", "opinion-report", "page.tsx");
  const text = fs.readFileSync(filename, "utf8");
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let count = 0;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "workpaper.field"
      && node.typeArguments?.[0] && ["Deficiency[]", "GovernanceMatter[]", "RepresentationItem[]"].includes(node.typeArguments[0].getText(source))) {
      assert.ok(ts.isArrayLiteralExpression(node.arguments[1]));
      assert.equal(node.arguments[1].elements.length, 0);
      count++;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(count, 3);
  assert.doesNotMatch(text, /setSaved\(true\)|setCompletionStatus\("Completed"\)|console\.log|params\.id \?\? "1"/);
  assert.match(text, /workpaper\.save/);
  assert.match(text, /WorkpaperNotice/);
  assert.match(text, /workpaper\.blocked/);
});
