"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  Bell,
  CheckCheck,
  Loader2,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";

import { getEngagements, type Engagement } from "@/lib/api";
import {
  acknowledgeAlert,
  createMonitoringRule,
  deleteMonitoringRule,
  dismissAlert,
  getMonitoringAlerts,
  getMonitoringRules,
  getMonitoringSummary,
  toggleMonitoringRule,
  type MonitoringAlert,
  type MonitoringRule,
  type MonitoringSummary,
} from "@/lib/monitoring";

const REFRESH_MS = 30_000;

const severityStyles: Record<string, string> = {
  info: "bg-slate-100 text-slate-700 border-slate-200",
  low: "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const statusStyles: Record<string, string> = {
  open: "bg-red-50 text-red-700 border-red-200",
  acknowledged: "bg-amber-50 text-amber-700 border-amber-200",
  dismissed: "bg-slate-100 text-slate-600 border-slate-200",
};

const RULE_PARAM_LABELS: Record<string, { key: string; label: string }> = {
  large_amount: { key: "threshold", label: "Amount threshold" },
  round_number: { key: "min_amount", label: "Minimum amount" },
  backdated: { key: "max_age_days", label: "Maximum age (days)" },
  off_hours: { key: "", label: "" },
};

export default function MonitoringPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [rules, setRules] = useState<MonitoringRule[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [engagementFilter, setEngagementFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    name: "",
    rule_type: "large_amount",
    parameter: "",
    severity: "medium",
    engagement: "",
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function load(background: boolean) {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const engagement = engagementFilter
          ? Number(engagementFilter)
          : undefined;
        const [engagementData, ruleData, alertData, summaryData] =
          await Promise.all([
            getEngagements(),
            getMonitoringRules(),
            getMonitoringAlerts({
              engagement,
              status: (statusFilter || undefined) as
                | MonitoringAlert["status"]
                | undefined,
            }),
            getMonitoringSummary(engagement),
          ]);
        if (!mountedRef.current) return;
        setEngagements(engagementData);
        setRules(ruleData);
        setAlerts(alertData);
        setSummary(summaryData);
        setError("");
        setLastRefresh(new Date().toLocaleTimeString("en-GB"));
      } catch (err) {
        if (mountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load monitoring data."
          );
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load(false);
    const timer = window.setInterval(() => void load(true), REFRESH_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [engagementFilter, statusFilter, reloadKey]);

  async function handleCreateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const paramSpec = RULE_PARAM_LABELS[ruleForm.rule_type];
      const parameters: Record<string, number> = {};
      if (paramSpec.key && ruleForm.parameter) {
        parameters[paramSpec.key] = Number(ruleForm.parameter);
      }
      await createMonitoringRule({
        name: ruleForm.name,
        rule_type: ruleForm.rule_type as MonitoringRule["rule_type"],
        parameters,
        severity: ruleForm.severity as MonitoringRule["severity"],
        engagement: ruleForm.engagement
          ? Number(ruleForm.engagement)
          : null,
      });
      setSuccess("Monitoring rule created.");
      setShowRuleForm(false);
      setRuleForm({
        name: "",
        rule_type: "large_amount",
        parameter: "",
        severity: "medium",
        engagement: "",
      });
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create rule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRule(id: number) {
    setError("");
    try {
      await toggleMonitoringRule(id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed.");
    }
  }

  async function handleDeleteRule(id: number, name: string) {
    if (!window.confirm(`Delete rule "${name}"? Its alerts are kept.`)) {
      return;
    }
    setError("");
    try {
      await deleteMonitoringRule(id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function handleAlertAction(
    id: number,
    action: "acknowledge" | "dismiss"
  ) {
    setError("");
    try {
      if (action === "acknowledge") {
        await acknowledgeAlert(id);
      } else {
        await dismissAlert(id);
      }
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="w-full px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Activity aria-hidden="true" /> Continuous Monitoring
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Rules are evaluated in real time as financial records are
            created. Matched events raise alerts here and notify the
            engagement lead and managers.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {refreshing && <Loader2 size={14} className="animate-spin" />}
          {lastRefresh && <span>Updated {lastRefresh}</span>}
          <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
            Auto-refresh 30s
          </span>
        </div>
      </div>

      {summary && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Bell size={15} /> Open alerts
            </p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {summary.open}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">High severity open</p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {summary.by_severity.high?.count ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Acknowledged</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {summary.acknowledged}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Active rules</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {rules.filter((rule) => rule.is_active).length}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="my-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="my-6 flex flex-wrap gap-4">
        <label className="text-sm font-medium">
          Engagement
          <select
            className={inputClass}
            value={engagementFilter}
            onChange={(event) => setEngagementFilter(event.target.value)}
          >
            <option value="">All engagements</option>
            {engagements.map((item) => (
              <option key={item.id} value={item.id}>
                {item.engagement_code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Alert status
          <select
            className={inputClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="dismissed">Dismissed</option>
            <option value="">All</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading monitoring data...
        </p>
      ) : (
        <>
          <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 p-4 text-lg font-semibold">
              Alerts
            </h2>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-700">
                <tr>
                  {["Raised", "Alert", "Engagement", "Severity", "Status", "Actions"].map(
                    (title) => (
                      <th key={title} className="px-4 py-3">{title}</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {new Date(alert.created_at).toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {alert.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {alert.details.evidence}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {alert.object_type} #{alert.object_id} · rule:{" "}
                        {alert.rule_name}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {alert.engagement_code}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${severityStyles[alert.severity]}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[alert.status]}`}>
                        {alert.status}
                      </span>
                      {alert.acknowledged_by_username && (
                        <p className="mt-1 text-xs text-slate-400">
                          by {alert.acknowledged_by_username}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {alert.status === "open" && (
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() =>
                              handleAlertAction(alert.id, "acknowledge")
                            }
                            className="inline-flex items-center gap-1 text-amber-700 hover:underline"
                          >
                            <CheckCheck size={12} /> Acknowledge
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAlertAction(alert.id, "dismiss")
                            }
                            className="inline-flex items-center gap-1 text-slate-600 hover:underline"
                          >
                            <X size={12} /> Dismiss
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!alerts.length && (
              <p className="p-6 text-center text-sm text-slate-600">
                No alerts in this view.
              </p>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold">Monitoring rules</h2>
              <button
                type="button"
                onClick={() => setShowRuleForm((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={14} /> New rule
              </button>
            </div>

            {showRuleForm && (
              <form
                onSubmit={handleCreateRule}
                className="border-b border-slate-200 p-4"
              >
                <fieldset disabled={saving} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <label className="text-sm font-medium">
                    Name
                    <input
                      required
                      className={inputClass}
                      value={ruleForm.name}
                      onChange={(event) =>
                        setRuleForm({ ...ruleForm, name: event.target.value })
                      }
                      placeholder="e.g. Large postings over 500k"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Rule type
                    <select
                      className={inputClass}
                      value={ruleForm.rule_type}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          rule_type: event.target.value,
                          parameter: "",
                        })
                      }
                    >
                      <option value="large_amount">Large posting above threshold</option>
                      <option value="round_number">Round-number amount</option>
                      <option value="off_hours">Weekend or off-hours posting</option>
                      <option value="backdated">Backdated transaction</option>
                    </select>
                  </label>
                  {RULE_PARAM_LABELS[ruleForm.rule_type].key && (
                    <label className="text-sm font-medium">
                      {RULE_PARAM_LABELS[ruleForm.rule_type].label}
                      <input
                        required
                        type="number"
                        min="0"
                        className={inputClass}
                        value={ruleForm.parameter}
                        onChange={(event) =>
                          setRuleForm({
                            ...ruleForm,
                            parameter: event.target.value,
                          })
                        }
                      />
                    </label>
                  )}
                  <label className="text-sm font-medium">
                    Severity
                    <select
                      className={inputClass}
                      value={ruleForm.severity}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          severity: event.target.value,
                        })
                      }
                    >
                      <option value="info">Info</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Scope
                    <select
                      className={inputClass}
                      value={ruleForm.engagement}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          engagement: event.target.value,
                        })
                      }
                    >
                      <option value="">Firm-wide (all engagements)</option>
                      {engagements.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.engagement_code} only
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
                <div className="mt-3 flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    Create rule
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRuleForm(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <ul className="divide-y divide-slate-100">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {rule.name}
                      {!rule.is_active && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          paused
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {rule.rule_type_label} ·{" "}
                      {rule.engagement_code || "firm-wide"} ·{" "}
                      {rule.alert_count} alert{rule.alert_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className={`rounded-full border px-2 py-0.5 capitalize ${severityStyles[rule.severity]}`}>
                      {rule.severity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleRule(rule.id)}
                      className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                    >
                      <Power size={12} />
                      {rule.is_active ? "Pause" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id, rule.name)}
                      className="inline-flex items-center gap-1 text-red-700 hover:underline"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </li>
              ))}
              {!rules.length && (
                <li className="px-4 py-6 text-center text-sm text-slate-600">
                  No monitoring rules. Create one or run{" "}
                  <code>seed_monitoring_rules</code> on the backend.
                </li>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
