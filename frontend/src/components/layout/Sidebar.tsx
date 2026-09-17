"use client";

import Link from "next/link";
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
return ( <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-slate-950 text-white shadow-xl">


  {/* Logo */}
  <div className="flex h-20 items-center border-b border-slate-800 px-6">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
        <ShieldCheck size={23} />
      </div>

      <div>
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
  <nav className="flex-1 overflow-y-auto px-4 py-6">
    <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
      Main Menu
    </p>

    <div className="space-y-1.5">
      {menuItems.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.name}>
            <Link
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800 hover:text-white"
            >
              <Icon
                size={19}
                className="text-slate-400 transition-colors group-hover:text-blue-400"
              />

              <span>{item.name}</span>
            </Link>

            {/* Financials submenu */}
            {item.children && (
              <div className="ml-7 mt-1 space-y-1 border-l border-slate-800 pl-3">
                {item.children.map((child) => {
                  const ChildIcon = child.icon;

                  return (
                    <Link
                      key={child.name}
                      href={child.href}
                      className="group flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-all duration-200 hover:bg-slate-800 hover:text-white"
                    >
                      <ChildIcon
                        size={15}
                        className="text-slate-500 transition-colors group-hover:text-blue-400"
                      />

                      <span>{child.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </nav>
</aside>


);
}
