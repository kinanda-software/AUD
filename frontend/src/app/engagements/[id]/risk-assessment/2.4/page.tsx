"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AppLayout from "../../../../../components/layout/AppLayout";

import {
  ArrowLeft,
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  CircleAlert,
  ChevronDown,
  ClipboardCheck,
  FileText,
  User,
  Settings2,
  Target,
} from "lucide-react";

type ControlType =
  | "Preventive"
  | "Detective";

type ControlNature =
  | "Manual"
  | "IT Dependent Manual"
  | "Automated";

type Frequency =
  | "Continuous"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Annually"
  | "As Needed";

type DesignEffectiveness =
  | "Effective"
  | "Partially Effective"
  | "Ineffective"
  | "Not Assessed";

type ReliancePlan =
  | "Yes"
  | "No"
  | "To Be Determined";

type Assertion =
  | "Existence"
  | "Completeness"
  | "Accuracy"
  | "Cut-off"
  | "Classification"
  | "Valuation"
  | "Rights & Obligations"
  | "Presentation & Disclosure";

type Control = {
  id: number;
  controlId: string;
  process: string;
  controlObjective: string;
  controlDescription: string;
  controlType: ControlType;
  controlNature: ControlNature;
  frequency: Frequency;
  controlOwner: string;
  evidence: string;
  keyControl: boolean;
  assertion: Assertion[];
  reliancePlanned: ReliancePlan;
  designEffectiveness: DesignEffectiveness;
  deficiencies: string;
  conclusion: string;
};

const assertionOptions: Assertion[] = [
  "Existence",
  "Completeness",
  "Accuracy",
  "Cut-off",
  "Classification",
  "Valuation",
  "Rights & Obligations",
  "Presentation & Disclosure",
];

const controlTypeOptions: ControlType[] = [
  "Preventive",
  "Detective",
];

const controlNatureOptions: ControlNature[] = [
  "Manual",
  "IT Dependent Manual",
  "Automated",
];

const frequencyOptions: Frequency[] = [
  "Continuous",
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Annually",
  "As Needed",
];

const designEffectivenessOptions: DesignEffectiveness[] = [
  "Effective",
  "Partially Effective",
  "Ineffective",
  "Not Assessed",
];

const relianceOptions: ReliancePlan[] = [
  "Yes",
  "No",
  "To Be Determined",
];

export default function ControlsPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [controls, setControls] = useState<Control[]>([
    {
      id: 1,
      controlId: "",
      process: "",
      controlObjective: "",
      controlDescription: "",
      controlType: "Preventive",
      controlNature: "Manual",
      frequency: "Monthly",
      controlOwner: "",
      evidence: "",
      keyControl: false,
      assertion: [],
      reliancePlanned: "To Be Determined",
      designEffectiveness: "Not Assessed",
      deficiencies: "",
      conclusion: "",
    },
  ]);

  /*
   * Update a single control field
   */
  const updateControl = (
    id: number,
    field: keyof Control,
    value:
      | string
      | boolean
      | Assertion[]
      | ControlType
      | ControlNature
      | Frequency
      | DesignEffectiveness
      | ReliancePlan
  ) => {
    setControls((currentControls) =>
      currentControls.map((control) =>
        control.id === id
          ? {
              ...control,
              [field]: value,
            }
          : control
      )
    );

    setSaved(false);
  };

  /*
   * Toggle financial statement assertion
   */
  const toggleAssertion = (
    id: number,
    assertion: Assertion
  ) => {
    setControls((currentControls) =>
      currentControls.map((control) => {
        if (control.id !== id) {
          return control;
        }

        const alreadySelected =
          control.assertion.includes(assertion);

        return {
          ...control,
          assertion: alreadySelected
            ? control.assertion.filter(
                (item) => item !== assertion
              )
            : [...control.assertion, assertion],
        };
      })
    );

    setSaved(false);
  };

  /*
   * Add another control
   */
  const addControl = () => {
    const newControl: Control = {
      id: Date.now(),

      controlId: `CTL-${String(
        controls.length + 1
      ).padStart(3, "0")}`,

      process: "",

      controlObjective: "",

      controlDescription: "",

      controlType: "Preventive",

      controlNature: "Manual",

      frequency: "Monthly",

      controlOwner: "",

      evidence: "",

      keyControl: false,

      assertion: [],

      reliancePlanned: "To Be Determined",

      designEffectiveness: "Not Assessed",

      deficiencies: "",

      conclusion: "",
    };

    setControls((currentControls) => [
      ...currentControls,
      newControl,
    ]);

    setSaved(false);
  };

  /*
   * Remove a control
   */
  const removeControl = (id: number) => {
    if (controls.length === 1) {
      alert("At least one control is required.");
      return;
    }

    setControls((currentControls) =>
      currentControls.filter(
        (control) => control.id !== id
      )
    );

    setSaved(false);
  };

  /*
   * Validate controls
   */
  const validateControls = (): boolean => {
    const incompleteControl = controls.some(
      (control) =>
        !control.controlId.trim() ||
        !control.process.trim() ||
        !control.controlObjective.trim() ||
        !control.controlDescription.trim() ||
        !control.controlOwner.trim() ||
        control.assertion.length === 0 ||
        !control.conclusion.trim()
    );

    if (incompleteControl) {
      alert(
        "Please complete Control ID, Process, Control Objective, Control Description, Control Owner, at least one Assertion, and Auditor Conclusion for every control."
      );

      return false;
    }

    return true;
  };

  /*
   * Save workpaper
   */
  const handleSave = (): boolean => {
    if (!validateControls()) {
      return false;
    }

    setSaving(true);

    const workpaperData = {
      engagementId,

      phase: "Phase 2",

      section: "2.4",

      title: "Controls",

      controls,

      savedAt: new Date().toISOString(),
    };

    console.log(
      "Controls Workpaper:",
      workpaperData
    );

    /*
     * Current frontend save state.
     *
     * The Django Control API can be connected here
     * separately so the records persist in PostgreSQL.
     */
    setSaved(true);
    setSaving(false);

    return true;
  };

  /*
   * Continue to Phase 2.5
   *
   * IMPORTANT:
   * Save first.
   * Only navigate if validation succeeds.
   */
  const handleContinue = () => {
    const saveSuccessful = handleSave();

    if (!saveSuccessful) {
      return;
    }

    router.push(
      `/engagements/${engagementId}/risk-assessment/2.5`
    );
  };

  /*
   * Go back to Phase 2 main page
   */
  const handleBack = () => {
    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  };

  return (
    <AppLayout>
      <div className="min-h-screen">

        {/* =========================================
            PAGE HEADER
        ========================================== */}

        <div className="mb-8">

          <button
            type="button"
            onClick={handleBack}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={17} />

            Back to Risk Assessment
          </button>

          <div className="flex items-start justify-between gap-6">

            <div>

              <div className="mb-2 flex items-center gap-2">

                <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  PHASE 2
                </span>

                <span className="text-sm text-slate-400">
                  Risk Assessment & Strategy
                </span>

              </div>

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <ShieldCheck size={24} />
                </div>

                <div>

                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Controls
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Identify and evaluate manual, IT-dependent
                    manual and automated controls.
                  </p>

                </div>

              </div>

              <p className="mt-3 text-sm text-slate-400">
                AUD-001 — Financial Statement Audit
              </p>

            </div>

            {/* Workpaper status */}

            <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex">

              {saved ? (

                <CheckCircle2
                  size={19}
                  className="text-emerald-500"
                />

              ) : (

                <CircleAlert
                  size={19}
                  className="text-amber-500"
                />

              )}

              <div>

                <p className="text-xs text-slate-400">
                  Workpaper Status
                </p>

                <p className="text-sm font-semibold text-slate-700">
                  {saved ? "Saved" : "Draft"}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* =========================================
            GUIDANCE
        ========================================== */}

        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

          <div className="flex items-start gap-4">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <ClipboardCheck size={20} />
            </div>

            <div>

              <h2 className="font-semibold text-emerald-900">
                Controls Identification Guidance
              </h2>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                Identify controls that address risks of material
                misstatement. Document the control objective,
                control activity, owner, frequency, evidence,
                nature of the control and relevant financial
                statement assertions. Determine whether reliance
                on the control is planned and evaluate its design.
              </p>

            </div>

          </div>

        </div>

        {/* =========================================
            CONTROLS
        ========================================== */}

        <div className="space-y-6">

          {controls.map((control, index) => (

            <div
              key={control.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            >

              {/* CONTROL HEADER */}

              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700">
                    {index + 1}
                  </div>

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Control {index + 1}
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">
                      Control Identification
                    </h2>

                  </div>

                </div>

                {controls.length > 1 && (

                  <button
                    type="button"
                    onClick={() =>
                      removeControl(control.id)
                    }
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700"
                  >

                    <Trash2 size={16} />

                    Remove

                  </button>

                )}

              </div>

              <div className="space-y-8 p-6">

                {/* BASIC INFORMATION */}

                <div>

                  <div className="mb-4 flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <FileText size={18} />
                    </div>

                    <div>

                      <h3 className="text-sm font-semibold text-slate-700">
                        Basic Control Information
                      </h3>

                      <p className="text-xs text-slate-500">
                        Identify the control and the process it
                        belongs to.
                      </p>

                    </div>

                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    {/* Control ID */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">

                        Control ID

                        <span className="ml-1 text-red-500">
                          *
                        </span>

                      </label>

                      <input
                        type="text"
                        value={control.controlId}
                        onChange={(e) =>
                          updateControl(
                            control.id,
                            "controlId",
                            e.target.value
                          )
                        }
                        placeholder="e.g. REV-CTL-001"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />

                    </div>

                    {/* Process */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">

                        Process / Cycle

                        <span className="ml-1 text-red-500">
                          *
                        </span>

                      </label>

                      <input
                        type="text"
                        value={control.process}
                        onChange={(e) =>
                          updateControl(
                            control.id,
                            "process",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Revenue, Payroll, Purchasing"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />

                    </div>

                  </div>

                </div>

                {/* CONTROL OBJECTIVE */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">

                    Control Objective

                    <span className="ml-1 text-red-500">
                      *
                    </span>

                  </label>

                  <textarea
                    value={control.controlObjective}
                    onChange={(e) =>
                      updateControl(
                        control.id,
                        "controlObjective",
                        e.target.value
                      )
                    }
                    rows={3}
                    placeholder="Describe what the control is intended to achieve."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* CONTROL DESCRIPTION */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">

                    Control Description

                    <span className="ml-1 text-red-500">
                      *
                    </span>

                  </label>

                  <textarea
                    value={control.controlDescription}
                    onChange={(e) =>
                      updateControl(
                        control.id,
                        "controlDescription",
                        e.target.value
                      )
                    }
                    rows={5}
                    placeholder="Describe how the control operates, including who performs it, what is reviewed, what evidence is produced and how exceptions are handled."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* CONTROL CHARACTERISTICS */}

                <div>

                  <div className="mb-4 flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Settings2 size={18} />
                    </div>

                    <div>

                      <h3 className="text-sm font-semibold text-slate-700">
                        Control Characteristics
                      </h3>

                      <p className="text-xs text-slate-500">
                        Classify how and when the control operates.
                      </p>

                    </div>

                  </div>

                  <div className="grid gap-5 md:grid-cols-3">

                    {/* Control Type */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Control Type
                      </label>

                      <div className="relative">

                        <select
                          value={control.controlType}
                          onChange={(e) =>
                            updateControl(
                              control.id,
                              "controlType",
                              e.target.value as ControlType
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >

                          {controlTypeOptions.map(
                            (option) => (

                              <option
                                key={option}
                                value={option}
                              >
                                {option}
                              </option>

                            )
                          )}

                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                      </div>

                    </div>

                    {/* Control Nature */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Control Nature
                      </label>

                      <div className="relative">

                        <select
                          value={control.controlNature}
                          onChange={(e) =>
                            updateControl(
                              control.id,
                              "controlNature",
                              e.target.value as ControlNature
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >

                          {controlNatureOptions.map(
                            (option) => (

                              <option
                                key={option}
                                value={option}
                              >
                                {option}
                              </option>

                            )
                          )}

                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                      </div>

                    </div>

                    {/* Frequency */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Frequency
                      </label>

                      <div className="relative">

                        <select
                          value={control.frequency}
                          onChange={(e) =>
                            updateControl(
                              control.id,
                              "frequency",
                              e.target.value as Frequency
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >

                          {frequencyOptions.map(
                            (option) => (

                              <option
                                key={option}
                                value={option}
                              >
                                {option}
                              </option>

                            )
                          )}

                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                      </div>

                    </div>

                  </div>

                </div>

                {/* CONTROL OWNER / EVIDENCE */}

                <div className="grid gap-5 md:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">

                      Control Owner

                      <span className="ml-1 text-red-500">
                        *
                      </span>

                    </label>

                    <div className="relative">

                      <User
                        size={17}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="text"
                        value={control.controlOwner}
                        onChange={(e) =>
                          updateControl(
                            control.id,
                            "controlOwner",
                            e.target.value
                          )
                        }
                        placeholder="Person or role responsible for the control"
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />

                    </div>

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Control Evidence
                    </label>

                    <div className="relative">

                      <FileText
                        size={17}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="text"
                        value={control.evidence}
                        onChange={(e) =>
                          updateControl(
                            control.id,
                            "evidence",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Approval report, system log, reconciliation"
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />

                    </div>

                  </div>

                </div>

                {/* KEY CONTROL */}

                <div
                  className={`rounded-xl border p-5 transition ${
                    control.keyControl
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >

                  <button
                    type="button"
                    onClick={() =>
                      updateControl(
                        control.id,
                        "keyControl",
                        !control.keyControl
                      )
                    }
                    className="flex w-full items-start gap-4 text-left"
                  >

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        control.keyControl
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-400"
                      }`}
                    >

                      <Target size={20} />

                    </div>

                    <div className="flex-1">

                      <div className="flex items-center justify-between gap-3">

                        <h3
                          className={`text-sm font-bold ${
                            control.keyControl
                              ? "text-blue-800"
                              : "text-slate-800"
                          }`}
                        >
                          Key Control
                        </h3>

                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                            control.keyControl
                              ? "border-blue-500 bg-blue-500"
                              : "border-slate-300 bg-white"
                          }`}
                        >

                          {control.keyControl && (

                            <CheckCircle2
                              size={17}
                              className="text-white"
                            />

                          )}

                        </div>

                      </div>

                      <p
                        className={`mt-1 text-xs leading-5 ${
                          control.keyControl
                            ? "text-blue-700"
                            : "text-slate-500"
                        }`}
                      >
                        Mark this control if it is a key control
                        relied upon to address a significant risk
                        or important risk of material misstatement.
                      </p>

                    </div>

                  </button>

                </div>

                {/* ASSERTIONS */}

                <div>

                  <div className="mb-4">

                    <label className="block text-sm font-semibold text-slate-700">

                      Relevant Financial Statement Assertions

                      <span className="ml-1 text-red-500">
                        *
                      </span>

                    </label>

                    <p className="mt-1 text-xs text-slate-500">
                      Select all assertions addressed by this
                      control.
                    </p>

                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                    {assertionOptions.map(
                      (assertion) => {

                        const selected =
                          control.assertion.includes(
                            assertion
                          );

                        return (

                          <button
                            key={assertion}
                            type="button"
                            onClick={() =>
                              toggleAssertion(
                                control.id,
                                assertion
                              )
                            }
                            className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                              selected
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50"
                            }`}
                          >

                            <div className="flex items-center justify-between gap-2">

                              <span>
                                {assertion}
                              </span>

                              {selected && (

                                <CheckCircle2
                                  size={17}
                                  className="text-blue-600"
                                />

                              )}

                            </div>

                          </button>

                        );
                      }
                    )}

                  </div>

                </div>

                {/* RELIANCE & DESIGN */}

                <div>

                  <div className="mb-4 flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <ShieldCheck size={18} />
                    </div>

                    <div>

                      <h3 className="text-sm font-semibold text-slate-700">
                        Reliance & Design Assessment
                      </h3>

                      <p className="text-xs text-slate-500">
                        Determine whether reliance is planned and
                        evaluate the design of the control.
                      </p>

                    </div>

                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    {/* Reliance */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Reliance Planned
                      </label>

                      <div className="relative">

                        <select
                          value={control.reliancePlanned}
                          onChange={(e) =>
                            updateControl(
                              control.id,
                              "reliancePlanned",
                              e.target.value as ReliancePlan
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >

                          {relianceOptions.map(
                            (option) => (

                              <option
                                key={option}
                                value={option}
                              >
                                {option}
                              </option>

                            )
                          )}

                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                      </div>

                    </div>

                    {/* Design effectiveness */}

                    <div>

                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Design Effectiveness
                      </label>

                      <div className="relative">

                        <select
                          value={control.designEffectiveness}
                          onChange={(e) =>
                            updateControl(
                              control.id,
                              "designEffectiveness",
                              e.target.value as DesignEffectiveness
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >

                          {designEffectivenessOptions.map(
                            (option) => (

                              <option
                                key={option}
                                value={option}
                              >
                                {option}
                              </option>

                            )
                          )}

                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                      </div>

                    </div>

                  </div>

                </div>

                {/* DEFICIENCIES */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Control Deficiencies / Issues
                  </label>

                  <textarea
                    value={control.deficiencies}
                    onChange={(e) =>
                      updateControl(
                        control.id,
                        "deficiencies",
                        e.target.value
                      )
                    }
                    rows={4}
                    placeholder="Document any identified deficiencies, gaps, design issues or circumstances that may affect the control."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* CONCLUSION */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">

                    Auditor Conclusion

                    <span className="ml-1 text-red-500">
                      *
                    </span>

                  </label>

                  <textarea
                    value={control.conclusion}
                    onChange={(e) =>
                      updateControl(
                        control.id,
                        "conclusion",
                        e.target.value
                      )
                    }
                    rows={4}
                    placeholder="Document the auditor's conclusion on whether the control is appropriately designed to address the identified risk."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

              </div>

            </div>

          ))}

        </div>

        {/* =========================================
            ADD CONTROL
        ========================================== */}

        <button
          type="button"
          onClick={addControl}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
        >

          <Plus size={18} />

          Add Another Control

        </button>

        {/* =========================================
            WORKPAPER SUMMARY
        ========================================== */}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <ClipboardCheck size={20} />
            </div>

            <div>

              <h2 className="text-lg font-bold text-slate-900">
                Controls Summary
              </h2>

              <p className="text-sm text-slate-500">
                Summary of controls identified in this workpaper.
              </p>

            </div>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Total */}

            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs font-medium text-slate-500">
                Total Controls
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {controls.length}
              </p>

            </div>

            {/* Key Controls */}

            <div className="rounded-xl bg-blue-50 p-4">

              <p className="text-xs font-medium text-blue-600">
                Key Controls
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-700">
                {
                  controls.filter(
                    (control) => control.keyControl
                  ).length
                }
              </p>

            </div>

            {/* Reliance */}

            <div className="rounded-xl bg-purple-50 p-4">

              <p className="text-xs font-medium text-purple-600">
                Reliance Planned
              </p>

              <p className="mt-1 text-2xl font-bold text-purple-700">
                {
                  controls.filter(
                    (control) =>
                      control.reliancePlanned === "Yes"
                  ).length
                }
              </p>

            </div>

            {/* Effective */}

            <div className="rounded-xl bg-emerald-50 p-4">

              <p className="text-xs font-medium text-emerald-600">
                Effective Design
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {
                  controls.filter(
                    (control) =>
                      control.designEffectiveness ===
                      "Effective"
                  ).length
                }
              </p>

            </div>

          </div>

        </div>

        {/* =========================================
            ACTION BAR
        ========================================== */}

        <div className="sticky bottom-0 z-20 mt-8 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-lg backdrop-blur">

          <div className="flex items-center justify-between gap-4">

            {/* BACK */}

            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >

              <ArrowLeft size={17} />

              Back

            </button>

            {/* RIGHT SIDE */}

            <div className="flex items-center gap-3">

              {/* Saved message */}

              {saved && (

                <div className="hidden items-center gap-2 text-sm font-medium text-emerald-600 sm:flex">

                  <CheckCircle2 size={17} />

                  Workpaper saved

                </div>

              )}

              {/* SAVE */}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >

                <Save size={17} />

                {saving
                  ? "Saving..."
                  : "Save Workpaper"}

              </button>

              {/* CONTINUE */}

              <button
                type="button"
                onClick={handleContinue}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >

                Continue

                <span className="text-lg leading-none">
                  →
                </span>

              </button>

            </div>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}