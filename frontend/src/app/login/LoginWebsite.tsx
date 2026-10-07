import type { ReactNode } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  FileCheck2,
  Layers3,
  ShieldCheck,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

const companyServices = [
  {
    title: "Audit & assurance",
    description: "Statutory, internal, risk-based and financial statement audits, alongside compliance and specialized assurance work.",
    href: "https://ifs.co.tz/services/auditing-and-assurance",
  },
  {
    title: "Taxation",
    description: "Tax services form part of the firm's professional offering for businesses operating in Tanzania.",
    href: "https://ifs.co.tz/services/taxation",
  },
  {
    title: "Accounting",
    description: "Accounting services complement IFS's audit, tax and financial advisory practice.",
    href: "https://ifs.co.tz/services/accounting",
  },
  {
    title: "Business advisory",
    description: "Financial advice tailored to owner-managed businesses, larger organizations and subsidiaries of international firms.",
    href: "https://ifs.co.tz/services/business-advisory",
  },
];

const workflows = [
  {
    icon: ClipboardCheck,
    title: "Plan with purpose",
    description:
      "Organize engagements, assess risk and define procedures before fieldwork begins.",
  },
  {
    icon: Layers3,
    title: "Bring the evidence together",
    description:
      "Work with financial data, supporting schedules and audit documentation in one workspace.",
  },
  {
    icon: FileCheck2,
    title: "Move toward a reviewed conclusion",
    description:
      "Evaluate findings, prepare reporting and keep professional review at the center of your work.",
  },
];

export default function LoginWebsite({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <a
        href="#sign-in"
        className="sr-only z-50 rounded-lg bg-white px-4 py-3 text-blue-700 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to sign in
      </a>
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <a href="#top" aria-label="IFS AUD Platform home" className="flex items-center gap-3">
            <Image src="/ifs-logo.png" alt="Innovation Flexible Solutions (IFS)" width={512} height={512} sizes="(min-width: 640px) 80px, 64px" priority className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" />
            <span>
              <span className="block text-xl font-bold tracking-tight">IFS <span className="text-blue-700">AUD</span></span>
              <span className="block max-w-28 text-xs font-medium text-slate-600 sm:max-w-none">Audit Management Platform</span>
            </span>
          </a>
          <nav aria-label="Website navigation" className="flex items-center gap-6 text-sm font-semibold">
            <a href="#about-ifs" className="hidden text-slate-600 hover:text-blue-700 sm:block">About IFS</a>
            <a href="#platform" className="hidden text-slate-600 hover:text-blue-700 sm:block">Platform</a>
            <a href="#workflow" className="hidden text-slate-600 hover:text-blue-700 md:block">Audit workflow</a>
            <a href="#sign-in" className="rounded-lg bg-blue-50 px-4 py-2.5 text-blue-700 transition hover:bg-blue-100">
              Sign in <ArrowRight className="ml-1 inline" size={15} aria-hidden="true" />
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section aria-labelledby="intro-heading" className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[650px] w-[650px] rounded-full bg-blue-100/60 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-20 lg:px-12 lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-800">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-600" />
                IFS / BUILT FOR AUDIT TEAMS
              </p>
              <h1 id="intro-heading" className="mt-6 max-w-xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
                Clarity at every
                <span className="block text-blue-700">stage of your audit.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">
                From planning to reporting, AUD brings your engagements,
                financial analysis and evidence into a focused audit workspace.
                Less fragmentation. A clearer path forward.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <a href="#sign-in" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/15 transition hover:bg-blue-800">
                  Open your workspace <ArrowRight size={17} aria-hidden="true" />
                </a>
                <a href="#workflow" className="text-sm font-semibold text-slate-700 hover:text-blue-700">
                  Explore the workflow <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-600">
                {["Engagement planning", "Financial analysis", "Audit evidence"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check size={15} className="text-blue-700" aria-hidden="true" />{item}
                  </li>
                ))}
              </ul>
              <div className="mt-10 max-w-lg rounded-2xl border border-slate-200 bg-white/80 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <ShieldCheck size={19} className="text-blue-700" aria-hidden="true" />
                  An audit platform. Not a replacement for auditor judgment.
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Keep procedures, evidence and review at the center of each engagement.
                </p>
              </div>
            </div>
            <section id="sign-in" aria-labelledby="sign-in-heading" className="w-full scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
              {children}
            </section>
          </div>
        </section>

        <section id="about-ifs" aria-labelledby="ifs-heading" className="scroll-mt-6 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <p className="text-xs font-bold tracking-widest text-blue-700">THE FIRM BEHIND YOUR WORKSPACE</p>
                <h2 id="ifs-heading" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Innovation Flexible Solutions</h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
                  IFS is a professional services firm headquartered in Dar es Salaam,
                  serving clients across Tanzania. Its work spans auditing and assurance,
                  taxation, accounting and business advisory, with services adapted to
                  each organization&apos;s needs.
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  The firm&apos;s published profile describes IFS as registered with
                  Tanzania&apos;s National Board of Accountants and Auditors (NBAA).
                  Its client base includes owner-managed businesses, large businesses,
                  Tanzania-based firms and subsidiaries of international organizations.
                </p>
                <a href="https://ifs.co.tz/about-ifs" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
                  Read the IFS company profile <ArrowRight size={16} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>
              <aside aria-labelledby="ifs-contact-heading" className="rounded-2xl border border-slate-200 border-t-4 border-t-lime-600 bg-slate-50 p-6">
                <h3 id="ifs-contact-heading" className="text-lg font-bold">Contact IFS</h3>
                <address className="mt-5 space-y-4 text-sm not-italic text-slate-700">
                  <p className="flex items-start gap-3"><MapPin size={19} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" /><span>10 Kilimanjaro Street, Mikocheni<br />Dar es Salaam, Tanzania</span></p>
                  <a href="mailto:info@ifs.co.tz" className="flex items-center gap-3 hover:text-blue-700 hover:underline"><Mail size={19} className="shrink-0 text-blue-700" aria-hidden="true" />info@ifs.co.tz</a>
                  <a href="tel:+255763269989" className="flex items-center gap-3 hover:text-blue-700 hover:underline"><Phone size={19} className="shrink-0 text-blue-700" aria-hidden="true" />+255 763 269 989</a>
                </address>
                <a href="https://ifs.co.tz/" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
                  Visit the official IFS website <ArrowRight size={16} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </aside>
            </div>
            <h3 className="mt-10 text-xl font-bold">IFS professional services</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Firm services are separate from the features available inside the AUD platform.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {companyServices.map(({ title, description, href }) => (
                <article key={title} className="flex flex-col rounded-2xl border border-slate-200 p-5">
                  <h4 className="font-bold text-slate-900">{title}</h4>
                  <p className="mb-5 mt-3 text-sm leading-7 text-slate-600">{description}</p>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
                    Explore service <ArrowRight size={15} aria-hidden="true" />
                    <span className="sr-only">: {title} (opens in a new tab)</span>
                  </a>
                </article>
              ))}
            </div>
            <p className="mt-5 text-xs leading-6 text-slate-600">
              Company information summarized from the <a href="https://ifs.co.tz/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">official IFS website<span className="sr-only"> (opens in a new tab)</span></a>.
              For current service and registration details, contact IFS directly.
            </p>
          </div>
        </section>

        <section id="platform" aria-labelledby="platform-heading" className="scroll-mt-6 border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold tracking-widest text-blue-700">ONE CONNECTED WORKSPACE</p>
                <h2 id="platform-heading" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Built around the way you audit.</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-slate-500">A focused structure for your team, your documentation and your review process.</p>
            </div>
            <div id="workflow" className="mt-8 grid scroll-mt-6 gap-5 md:grid-cols-3">
              {workflows.map(({ icon: Icon, title, description }, index) => (
                <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100/70 text-blue-700">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-bold tracking-widest text-slate-400">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-base font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:px-8 lg:px-12">
        <p className="font-semibold text-slate-700">IFS / AUD Platform <span className="font-normal text-slate-500">/ Audit Management System</span></p>
        <p>For authorized audit professionals. Account access is managed by your administrator.</p>
      </footer>
    </div>
  );
}
