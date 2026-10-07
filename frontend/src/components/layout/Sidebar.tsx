"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BriefcaseBusiness,
  FileText,
  Settings,
  ShieldCheck,
  Calculator,
  BookOpen,
  FileEdit,
  ChevronDown,
  Layers3,
  UserCog,
  X,
} from "lucide-react";

import type { AuthUser } from "./AppLayout";

type SidebarProps = {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
};

type MenuChild = {
  name: string;
  href: string;
  icon: typeof BookOpen;
  targetPath?: string;
  group: string;
};

type MenuItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  children?: MenuChild[];
  adminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Audits",
    href: "/audits",
    icon: ClipboardList,
  },
  {
    name: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    name: "Engagements",
    href: "/engagements",
    icon: BriefcaseBusiness,
  },
  {
    name: "Financials",
    href: "/financials/trial-balance",
    icon: Calculator,
    children: [
      { group: "Financial data", name: "Chart of Accounts", href: "/financials/chart-of-accounts", icon: BookOpen },
      { group: "Financial data", name: "Trial Balance", href: "/financials/trial-balance", icon: Calculator },
      { group: "Financial data", name: "General Ledger", href: "/financials/general-ledger", icon: Calculator },
      { group: "Financial data", name: "Bank Reconciliation", href: "/financials/bank-reconciliation", icon: FileText },
      { group: "Adjust and report", name: "Adjustments", href: "/financials/adjustments", icon: FileEdit },
      { group: "Adjust and report", name: "Adjusted Trial Balance", href: "/financials/trial-balance", icon: FileText, targetPath: "/financials/adjusted-trial-balance" },
      { group: "Adjust and report", name: "Lead Schedules", href: "/financials/trial-balance", icon: Layers3, targetPath: "/financials/lead-schedules" },
      { group: "Adjust and report", name: "Financial Statements", href: "/financials/trial-balance", icon: FileText, targetPath: "/financials/financial-statements" },
      { group: "Adjust and report", name: "Mapped & Comparative Statements", href: "/financials/mapped-statements", icon: FileText },
      { group: "Account support", name: "Invoices, Bills & Tax", href: "/financials/invoices-bills", icon: FileText },
      { group: "Account support", name: "Fixed Assets", href: "/financials/fixed-assets", icon: Layers3 },
      { group: "Account support", name: "Inventory", href: "/financials/inventory", icon: Layers3 },
      { group: "Account support", name: "Budgets vs Actuals", href: "/financials/budgets", icon: FileText },
      { group: "Audit analysis and evidence", name: "Financial Audit Trace", href: "/financials/audit-trace", icon: BookOpen },
      { group: "Audit analysis and evidence", name: "Comparisons & Smart Audit", href: "/financials/smart-audit", icon: ShieldCheck },
      { group: "Audit analysis and evidence", name: "Audit Intelligence", href: "/financials/audit-intelligence", icon: BookOpen },
      { group: "Audit analysis and evidence", name: "PBC Document Requests", href: "/financials/pbc-requests", icon: FileText },
      { group: "Controls and history", name: "Accounting Controls", href: "/financials/accounting-controls", icon: ShieldCheck },
      { group: "Controls and history", name: "Journal Entries", href: "/financials/journal-entries", icon: BookOpen },
      { group: "Controls and history", name: "Financial Workflow Activity", href: "/financials/activity-log", icon: ShieldCheck },
    ],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
  },
  {
    name: "Users & Roles",
    href: "/users",
    icon: UserCog,
    adminOnly: true,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar({
  user,
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const financialsIsActive =
    pathname.startsWith("/financials");

  const [financialsOpen, setFinancialsOpen] =
    useState(financialsIsActive);

  const requiresTrialBalance = (
    childName: string
  ) => {
    return (
      childName === "Adjusted Trial Balance" ||
      childName === "Lead Schedules" ||
      childName === "Financial Statements"
    );
  };

  /*
   * Users & Roles is currently restricted
   * to Administrator users.
   */
  const visibleMenuItems = menuItems.filter(
    (item) => {
      if (item.adminOnly) {
        return user.role === "admin";
      }

      return true;
    }
  );

  return (
    <aside id="workspace-navigation" role={isOpen ? "dialog" : undefined} aria-modal={isOpen || undefined} aria-label="Workspace navigation" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} className={`fixed left-0 top-0 z-50 h-dvh w-64 flex-col bg-slate-950 text-white shadow-xl ${isOpen ? "flex" : "hidden"} lg:flex`}>
      {/* Logo */}
      <div className="relative flex h-20 shrink-0 items-center border-b border-slate-800 px-4">
        <Link href="/dashboard" onClick={onClose} aria-label="IFS AUD dashboard" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          <div className="shrink-0 rounded-lg bg-white">
            <Image src="/ifs-logo.png" alt="Innovation Flexible Solutions (IFS)" width={512} height={512} sizes="64px" loading="eager" className="h-16 w-16 object-contain" />
          </div>

          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight">
              AUD
            </p>

            <p className="text-xs text-slate-400">
              Audit Management
            </p>
          </div>
        </Link>
        <button type="button" aria-label="Close navigation" onClick={onClose} className="absolute right-2 top-2 rounded-lg p-1 text-slate-300 hover:bg-slate-800 lg:hidden"><X size={19} aria-hidden="true" /></button>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="sidebar-navigation min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Main Menu
        </p>

        <div className="space-y-1.5">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;

            const hasChildren =
              Boolean(item.children);

            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <div key={item.name}>
                {/* Normal menu item */}
                {!hasChildren ? (
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon
                      size={19}
                      className={`transition-colors ${
                        isActive
                          ? "text-blue-400"
                          : "text-slate-400 group-hover:text-blue-400"
                      }`}
                    />

                    <span>{item.name}</span>
                  </Link>
                ) : (
                  <>
                    {/* Financials parent */}
                    <button
                      type="button"
                      onClick={() =>
                        setFinancialsOpen(
                          (previous) => !previous
                        )
                      }
                      className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        financialsIsActive
                          ? "bg-slate-800 text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          size={19}
                          className={`transition-colors ${
                            financialsIsActive
                              ? "text-blue-400"
                              : "text-slate-400 group-hover:text-blue-400"
                          }`}
                        />

                        <span>{item.name}</span>
                      </span>

                      <ChevronDown
                        size={17}
                        className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                          financialsOpen
                            ? "rotate-180"
                            : "rotate-0"
                        }`}
                      />
                    </button>

                    {/* Financials submenu */}
                    {financialsOpen &&
                      item.children && (
                        <div className="ml-7 mt-1 space-y-1 border-l border-slate-800 pl-3">
                          {item.children.map(
                            (child, index) => {
                              const ChildIcon =
                                child.icon;

                              const directChildIsActive =
                                pathname ===
                                  child.href ||
                                pathname.startsWith(
                                  `${child.href}/`
                                );

                              const moduleIsActive =
                                child.targetPath
                                  ? pathname.startsWith(
                                      child.targetPath
                                    )
                                  : false;

                              const childIsActive =
                                child.name ===
                                "Trial Balance"
                                  ? directChildIsActive &&
                                    !pathname.startsWith(
                                      "/financials/adjusted-trial-balance"
                                    ) &&
                                    !pathname.startsWith(
                                      "/financials/lead-schedules"
                                    ) &&
                                    !pathname.startsWith(
                                      "/financials/financial-statements"
                                    )
                                  : child.name ===
                                      "Adjusted Trial Balance"
                                    ? moduleIsActive
                                    : child.name ===
                                        "Lead Schedules"
                                      ? moduleIsActive
                                      : child.name ===
                                          "Financial Statements"
                                        ? moduleIsActive
                                        : directChildIsActive;

                              const childHref =
                                requiresTrialBalance(
                                  child.name
                                )
                                  ? "/financials/trial-balance"
                                  : child.href;

                              return (
                                <div key={child.name}>
                                  {(index === 0
                                    || item.children?.[index - 1]?.group !== child.group) && (
                                      <p className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 first:mt-1">
                                        {child.group}
                                      </p>
                                    )}
                                  <Link
                                    href={childHref}
                                    onClick={onClose}
                                    className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                                      childIsActive
                                        ? "bg-slate-800 text-white"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                    }`}
                                  >
                                    <ChildIcon
                                      size={15}
                                      className={`shrink-0 transition-colors ${
                                        childIsActive
                                          ? "text-blue-400"
                                          : "text-slate-500 group-hover:text-blue-400"
                                      }`}
                                    />

                                    <span>
                                      {child.name}
                                    </span>
                                  </Link>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}