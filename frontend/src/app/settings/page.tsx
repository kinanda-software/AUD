"use client";

import Link from "next/link";
import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  Database,
  FileCheck2,
  Globe,
  Lock,
  Mail,
  Palette,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Workflow,
} from "lucide-react";

type ToggleProps = {
  enabled: boolean;
  onChange: () => void;
};

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={enabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        enabled ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

type SettingCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  badge?: string;
};

function SettingCard({
  icon,
  title,
  description,
  href,
  badge,
}: SettingCardProps) {
  const content = (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900">{title}</h3>

          {badge && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              {badge}
            </span>
          )}
        </div>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <ChevronRight
        size={18}
        className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      {content}
    </div>
  );
}

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [reviewNotifications, setReviewNotifications] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const [firmName, setFirmName] = useState("AUD Professional Services");
  const [country, setCountry] = useState("Tanzania");
  const [currency, setCurrency] = useState("TZS");
  const [timezone, setTimezone] = useState("Africa/Dar_es_Salaam");

  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <SettingsIcon size={23} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Settings
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Configure your firm's audit platform, users, workflow,
                security, and system preferences.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {saved ? <Check size={18} /> : <Save size={18} />}

            {saved ? "Changes Saved" : "Save Changes"}
          </button>
        </div>

        {/* Save notification */}
        {saved && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Check size={18} />

            <span>
              Your settings have been saved successfully.
            </span>
          </div>
        )}

        {/* System overview */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Building2 size={20} />
              </div>

              <span className="text-xs font-medium text-emerald-600">
                Active
              </span>
            </div>

            <p className="mt-4 text-lg font-bold text-slate-900">
              Firm Profile
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Organization configuration
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Users size={20} />
              </div>

              <span className="text-xs font-medium text-blue-600">
                Managed
              </span>
            </div>

            <p className="mt-4 text-lg font-bold text-slate-900">
              Team Access
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Users and permissions
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck size={20} />
              </div>

              <span className="text-xs font-medium text-amber-600">
                Review
              </span>
            </div>

            <p className="mt-4 text-lg font-bold text-slate-900">
              Security
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Authentication and access
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Database size={20} />
              </div>

              <span className="text-xs font-medium text-emerald-600">
                Operational
              </span>
            </div>

            <p className="mt-4 text-lg font-bold text-slate-900">
              System
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Platform configuration
            </p>
          </div>
        </div>

        {/* Firm profile */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Building2 size={20} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Firm Profile
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Basic information used throughout the audit platform.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="firmName"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Firm Name
              </label>

              <input
                id="firmName"
                type="text"
                value={firmName}
                onChange={(event) => setFirmName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="country"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Country
              </label>

              <select
                id="country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option>Tanzania</option>
                <option>Kenya</option>
                <option>Uganda</option>
                <option>Rwanda</option>
                <option>Zambia</option>
                <option>Malawi</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="currency"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Default Currency
              </label>

              <select
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="TZS">TZS — Tanzanian Shilling</option>
                <option value="USD">USD — US Dollar</option>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="UGX">UGX — Ugandan Shilling</option>
                <option value="RWF">RWF — Rwandan Franc</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="timezone"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Time Zone
              </label>

              <select
                id="timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Africa/Dar_es_Salaam">
                  Africa/Dar_es_Salaam
                </option>
                <option value="Africa/Nairobi">
                  Africa/Nairobi
                </option>
                <option value="Africa/Kampala">
                  Africa/Kampala
                </option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </section>

        {/* Configuration areas */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Platform Configuration
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Configure the major components of your audit management
              platform.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SettingCard
              icon={<Users size={21} />}
              title="Users & Team"
              description="Manage auditors, managers, partners, reviewers, and user access."
              badge="Administration"
            />

            <SettingCard
              icon={<Workflow size={21} />}
              title="Audit Methodology"
              description="Configure audit phases, procedures, workpapers, and methodology requirements."
              badge="Core"
            />

            <SettingCard
              icon={<SlidersHorizontal size={21} />}
              title="Engagement Settings"
              description="Configure engagement statuses, assignments, workflow rules, and deadlines."
            />

            <SettingCard
              icon={<FileCheck2 size={21} />}
              title="Risk & Materiality"
              description="Configure default risk classifications, materiality settings, and assessment parameters."
              badge="Audit"
            />

            <SettingCard
              icon={<FileCheck2 size={21} />}
              title="Reporting Settings"
              description="Configure reporting workflows, opinion types, approvals, and report templates."
            />

            <SettingCard
              icon={<Database size={21} />}
              title="Data & Storage"
              description="Manage document storage, retention, backups, and audit documentation settings."
            />
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Bell size={20} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Notifications
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Control how the platform notifies you about important
                  events.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-6 p-5">
              <div className="flex items-start gap-4">
                <Mail
                  size={20}
                  className="mt-0.5 text-slate-400"
                />

                <div>
                  <p className="font-semibold text-slate-800">
                    Email Notifications
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Receive important audit platform notifications by
                    email.
                  </p>
                </div>
              </div>

              <Toggle
                enabled={emailNotifications}
                onChange={() =>
                  setEmailNotifications(!emailNotifications)
                }
              />
            </div>

            <div className="flex items-center justify-between gap-6 p-5">
              <div>
                <p className="font-semibold text-slate-800">
                  Engagement Deadline Alerts
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Receive alerts when engagement deadlines are approaching.
                </p>
              </div>

              <Toggle
                enabled={deadlineAlerts}
                onChange={() =>
                  setDeadlineAlerts(!deadlineAlerts)
                }
              />
            </div>

            <div className="flex items-center justify-between gap-6 p-5">
              <div>
                <p className="font-semibold text-slate-800">
                  Review Notifications
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Get notified when workpapers require review or approval.
                </p>
              </div>

              <Toggle
                enabled={reviewNotifications}
                onChange={() =>
                  setReviewNotifications(!reviewNotifications)
                }
              />
            </div>

            <div className="flex items-center justify-between gap-6 p-5">
              <div>
                <p className="font-semibold text-slate-800">
                  System Notifications
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Receive important system and platform notifications.
                </p>
              </div>

              <Toggle
                enabled={systemNotifications}
                onChange={() =>
                  setSystemNotifications(!systemNotifications)
                }
              />
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Lock size={20} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Security & Access
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Configure authentication and security preferences.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-6 p-5">
              <div className="flex items-start gap-4">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 text-slate-400"
                />

                <div>
                  <p className="font-semibold text-slate-800">
                    Two-Factor Authentication
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Require an additional verification step when signing
                    in.
                  </p>
                </div>
              </div>

              <Toggle
                enabled={twoFactor}
                onChange={() => setTwoFactor(!twoFactor)}
              />
            </div>

            <div className="flex items-center justify-between gap-6 p-5">
              <div>
                <p className="font-semibold text-slate-800">
                  Session Security
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Automatic session controls help protect sensitive audit
                  information.
                </p>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Enabled
              </span>
            </div>

            <div className="flex items-center justify-between gap-6 p-5">
              <div>
                <p className="font-semibold text-slate-800">
                  Role-Based Access
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Access to audit information is controlled by user roles
                  and permissions.
                </p>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Enabled
              </span>
            </div>
          </div>
        </section>

        {/* System preferences */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Palette size={20} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  System Preferences
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Configure general behavior and interface preferences.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-6 p-5">
              <div>
                <p className="font-semibold text-slate-800">
                  Automatic Saving
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Automatically save changes made to audit workpapers.
                </p>
              </div>

              <Toggle
                enabled={autoSave}
                onChange={() => setAutoSave(!autoSave)}
              />
            </div>

            <div className="flex items-center justify-between gap-6 p-5">
              <div className="flex items-start gap-4">
                <Globe
                  size={20}
                  className="mt-0.5 text-slate-400"
                />

                <div>
                  <p className="font-semibold text-slate-800">
                    Regional Settings
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {country} · {currency} · {timezone}
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Active
              </span>
            </div>
          </div>
        </section>

        {/* Platform information */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <SettingsIcon size={20} />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Platform Configuration
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Settings control the firm's platform-level configuration.
                Detailed audit procedures, risk assessments, engagement
                workpapers, conclusion procedures, and reporting activities
                remain within their respective audit workflows.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>
            AUD Platform · Audit Management System
          </p>

          <p>
            Settings and configuration
          </p>
        </div>
      </div>
    </AppLayout>
  );
}