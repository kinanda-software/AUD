
"use client";

import Link from "next/link";
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
  Bot,
  Calculator,
  BookOpen,
  FileEdit,
  ChevronDown,
} from "lucide-react";

const menuItems = [
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
      {
        name: "Chart of Accounts",
        href: "/financials/chart-of-accounts",
        icon: BookOpen,
      },
      {
        name: "Trial Balance",
        href: "/financials/trial-balance",
        icon: Calculator,
      },
      {
        name: "Adjustments",
        href: "/financials/adjustments",
        icon: FileEdit,
      },
    ],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
  },
  {
    name: "AI Assistant",
    href: "/ai-assistant",
    icon: Bot,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  // Open Financials automatically when one of its pages is active.
  const financialsIsActive =
    pathname.startsWith("/financials");

  const [financialsOpen, setFinancialsOpen] =
    useState(financialsIsActive);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-slate-950 text-white shadow-xl">
      {/* Logo */}
      <div className="flex h-20 shrink-0 items-center border-b border-slate-800 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <ShieldCheck size={23} />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">
              AUD Platform
            </h1>

            <p className="text-xs text-slate-400">
              Audit Management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-hidden px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Main Menu
        </p>

        <div className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const hasChildren =
              "children" in item && item.children;

            const isFinancials =
              item.name === "Financials";

            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <div key={item.name}>
                {/* Normal menu item */}
                {!hasChildren ? (
                  <Link
                    href={item.href}
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
                    {financialsOpen && (
                      <div className="ml-7 mt-1 space-y-1 border-l border-slate-800 pl-3">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;

                          const childIsActive =
                            pathname === child.href ||
                            pathname.startsWith(
                              `${child.href}/`
                            );

                          return (
                            <Link
                              key={child.name}
                              href={child.href}
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

                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
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

