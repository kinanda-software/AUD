import type { MappedStatementReport, StatementVersion } from "@/lib/mappedStatements";

export function statementCSV(report: MappedStatementReport, version: StatementVersion | null) {
  const rows: string[][] = [
    ["Report scope", version ? `Saved version #${version.id}: ${version.name}` : "Live preview", "", "", ""],
    ["Currency", report.current_tb.currency, "", "", ""],
    ["Current period", report.current_tb.period_start, report.current_tb.period_end, "", ""],
    ["Comparative period", report.comparison_tb?.period_start || "Not selected", report.comparison_tb?.period_end || "", "", ""],
    ["Approval", version?.approval ? `Approved by ${version.approval.actor_name}` : "Not approved", "", "", ""],
    ["Fingerprint", version?.fingerprint || "Transient preview", "", "", ""],
    ["Statement line", "Group", "Note", "Current", "Comparison"],
  ];
  for (const line of report.lines) rows.push([`${line.code} ${line.label}`, line.group, line.note_reference, line.current, line.comparison ?? ""]);
  for (const period of ["current", "comparison"] as const) {
    const checks = report.checks[period];
    if (!checks) continue;
    for (const [key, value] of Object.entries(checks.groups)) rows.push([`${period} total ${key}`, key, "", value, ""]);
    rows.push([`${period} profit`, "", "", checks.profit, ""]);
    rows.push([`${period} position difference`, "", "", checks.position_difference, ""]);
    rows.push([`${period} adjusted TB difference`, "", "", checks.tb_difference, ""]);
  }
  for (const account of report.unmapped) rows.push([`UNMAPPED ${account.code} ${account.name}`, account.group, "",
    account.current.display, account.comparison?.display ?? ""]);
  const csvCell = (value: string) => `"${(/^\s*[=+\-@]|^[\t\r]/.test(value) && !/^-?\d+(\.\d+)?$/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
