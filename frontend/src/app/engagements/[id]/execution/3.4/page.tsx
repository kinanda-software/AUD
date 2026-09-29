"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
ArrowLeft,
FileSearch,
Database,
CheckCircle2,
AlertTriangle,
Save,
Loader2,
ArrowRight,
CircleAlert,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

const PROCEDURE_TYPES = [
"Analytical Procedures",
"Key Item Testing",
"Sampling",
"Confirmation",
"Full Population Analytics",
"Inventory Attendance",
"Legal Letter",
"Segment Testing",
];

interface SubstantiveProcedureAssessment {
id: number;
engagement: number;
engagement_code?: string;

procedure_name: string;
procedure_type: string;
financial_statement_area: string;
account_balance: string;
assertion: string;
procedure_objective: string;

population_description: string;
population_period: string;
population_size: number | null;
sample_size: number | null;
sampling_method: string;
selection_rationale: string;

procedure_performed: string;
testing_results: string;

evidence_obtained: string;
evidence_reference: string;

exceptions_misstatements: string;
exceptions_count: number;
misstatement_amount: string | number | null;
exception_resolution: string;

auditor_conclusion: string;
further_procedures_required: boolean;
further_procedures_description: string;

created_at?: string;
updated_at?: string;
}

export default function SubstantiveProceduresPage() {
const params = useParams();
const router = useRouter();

const engagementId = params.id as string;

// ============================================================
// CSRF COOKIE
// ============================================================

const getCookie = (name: string): string | null => {
if (typeof document === "undefined") {
return null;
}


const cookies = document.cookie.split(";");

for (const cookie of cookies) {
  const trimmed = cookie.trim();

  if (trimmed.startsWith(`${name}=`)) {
    return decodeURIComponent(
      trimmed.substring(name.length + 1)
    );
  }
}

return null;


};

// ============================================================
// API HEADERS
// ============================================================

const getHeaders = (
includeContentType = false
): HeadersInit => {
const headers: HeadersInit = {
Accept: "application/json",
};


if (includeContentType) {
  headers["Content-Type"] = "application/json";

  const csrfToken = getCookie("csrftoken");

  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }
}

return headers;


};

// ============================================================
// AUTHENTICATION FAILURE
// ============================================================

const handleAuthenticationFailure = () => {
const currentPath =
window.location.pathname +
window.location.search;


router.replace(
  `/login?next=${encodeURIComponent(currentPath)}`
);


};

// ============================================================
// FORM STATE
// ============================================================

const [procedureType, setProcedureType] = useState("");
const [accountArea, setAccountArea] = useState("");
const [objective, setObjective] = useState("");

const [population, setPopulation] = useState("");
const [sample, setSample] = useState("");

const [procedure, setProcedure] = useState("");
const [evidence, setEvidence] = useState("");

const [exceptions, setExceptions] = useState("");
const [misstatements, setMisstatements] = useState("");

const [conclusion, setConclusion] = useState("");

// ============================================================
// SYSTEM STATE
// ============================================================

const [recordId, setRecordId] = useState<number | null>(null);

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);

const [saved, setSaved] = useState(false);

const [error, setError] = useState("");

// ============================================================
// LOAD EXISTING RECORD
// ============================================================

useEffect(() => {
if (!engagementId) {
return;
}


const loadAssessment = async () => {
  setLoading(true);
  setError("");

  try {
    console.log(
      "PHASE 3.4: Loading assessment for engagement:",
      engagementId
    );

    const response = await fetch(
      `${API_BASE_URL}/substantive-procedure-assessments/?engagement=${engagementId}`,
      {
        method: "GET",
        credentials: "include",
        headers: getHeaders(false),
        cache: "no-store",
      }
    );

    console.log(
      "PHASE 3.4: GET status:",
      response.status
    );

    if (response.status === 401) {
      console.warn(
        "PHASE 3.4: User is not authenticated."
      );

      handleAuthenticationFailure();
      return;
    }

    if (response.status === 403) {
      console.warn(
        "PHASE 3.4: GET request returned 403."
      );

      throw new Error(
        "Access denied (403). Your login session may not be valid for this request."
      );
    }

    if (!response.ok) {
      let errorText = "";

      try {
        const errorData = await response.json();

        errorText =
          typeof errorData === "object"
            ? JSON.stringify(errorData, null, 2)
            : String(errorData);
      } catch {
        errorText = await response.text();
      }

      throw new Error(
        `Failed to load substantive procedure assessment (${response.status}). ${errorText}`
      );
    }

    const data = await response.json();

    console.log(
      "PHASE 3.4: GET response:",
      data
    );

    const records: SubstantiveProcedureAssessment[] =
      Array.isArray(data)
        ? data
        : data?.results || [];

    if (records.length > 0) {
      const record = records[0];

      console.log(
        "PHASE 3.4: Existing record found:",
        record
      );

      setRecordId(record.id);

      setProcedureType(
        record.procedure_type || ""
      );

      setAccountArea(
        record.financial_statement_area || ""
      );

      setObjective(
        record.procedure_objective || ""
      );

      setPopulation(
        record.population_size !== null &&
        record.population_size !== undefined
          ? String(record.population_size)
          : ""
      );

      setSample(
        record.sample_size !== null &&
        record.sample_size !== undefined
          ? String(record.sample_size)
          : ""
      );

      setProcedure(
        record.procedure_performed || ""
      );

      setEvidence(
        record.evidence_obtained || ""
      );

      setExceptions(
        record.exceptions_misstatements || ""
      );

      setMisstatements(
        record.misstatement_amount !== null &&
        record.misstatement_amount !== undefined
          ? String(record.misstatement_amount)
          : ""
      );

      setConclusion(
        record.auditor_conclusion || ""
      );

      setSaved(true);
    } else {
      console.log(
        "PHASE 3.4: No existing assessment found."
      );
    }
  } catch (err) {
    console.error(
      "PHASE 3.4: Load error:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Unable to load substantive procedure data."
    );
  } finally {
    setLoading(false);
  }
};

loadAssessment();


}, [engagementId]);

// ============================================================
// SAVE
// ============================================================

const handleSave = async (): Promise<boolean> => {
setError("");
setSaved(false);


// ----------------------------------------------------------
// VALIDATION
// ----------------------------------------------------------

if (!procedureType) {
  setError(
    "Please select a Procedure Type."
  );
  return false;
}

if (!accountArea.trim()) {
  setError(
    "Please enter the Account / Financial Statement Area."
  );
  return false;
}

if (!procedure.trim()) {
  setError(
    "Please describe the substantive procedure performed."
  );
  return false;
}

// ----------------------------------------------------------
// NUMERIC VALUES
// ----------------------------------------------------------

let populationSize: number | null = null;
let sampleSize: number | null = null;
let misstatementAmount: number | null = null;

if (population.trim()) {
  populationSize = Number(population);

  if (
    !Number.isInteger(populationSize) ||
    populationSize < 0
  ) {
    setError(
      "Population must be a valid whole number."
    );
    return false;
  }
}

if (sample.trim()) {
  sampleSize = Number(sample);

  if (
    !Number.isInteger(sampleSize) ||
    sampleSize < 0
  ) {
    setError(
      "Sample / Items Tested must be a valid whole number."
    );
    return false;
  }
}

if (
  populationSize !== null &&
  sampleSize !== null &&
  sampleSize > populationSize
) {
  setError(
    "Sample / Items Tested cannot be greater than the population."
  );
  return false;
}

if (misstatements.trim()) {
  misstatementAmount = Number(
    misstatements
  );

  if (
    Number.isNaN(misstatementAmount) ||
    misstatementAmount < 0
  ) {
    setError(
      "Misstatement amount must be a valid positive number."
    );
    return false;
  }
}

// ----------------------------------------------------------
// PAYLOAD
// ----------------------------------------------------------

const payload = {
  engagement: Number(engagementId),

  procedure_name:
    `${procedureType} - ${accountArea}`,

  procedure_type:
    procedureType,

  financial_statement_area:
    accountArea,

  account_balance: "",

  assertion: "",

  procedure_objective:
    objective,

  population_description: "",

  population_period: "",

  population_size:
    populationSize,

  sample_size:
    sampleSize,

  sampling_method: "",

  selection_rationale: "",

  procedure_performed:
    procedure,

  testing_results: "",

  evidence_obtained:
    evidence,

  evidence_reference: "",

  exceptions_misstatements:
    exceptions,

  exceptions_count:
    exceptions.trim() ? 1 : 0,

  misstatement_amount:
    misstatementAmount,

  exception_resolution: "",

  auditor_conclusion:
    conclusion,

  further_procedures_required:
    false,

  further_procedures_description:
    "",
};

console.log(
  "PHASE 3.4: SAVE payload:",
  payload
);

setSaving(true);

try {
  let response: Response;

  // ========================================================
  // UPDATE
  // ========================================================

  if (recordId) {
    console.log(
      "PHASE 3.4: Updating record:",
      recordId
    );

    response = await fetch(
      `${API_BASE_URL}/substantive-procedure-assessments/${recordId}/`,
      {
        method: "PATCH",
        credentials: "include",
        headers: getHeaders(true),
        body: JSON.stringify(payload),
      }
    );
  }

  // ========================================================
  // CREATE
  // ========================================================

  else {
    console.log(
      "PHASE 3.4: Creating new record."
    );

    response = await fetch(
      `${API_BASE_URL}/substantive-procedure-assessments/`,
      {
        method: "POST",
        credentials: "include",
        headers: getHeaders(true),
        body: JSON.stringify(payload),
      }
    );
  }

  console.log(
    "PHASE 3.4: SAVE status:",
    response.status
  );

  if (response.status === 401) {
    console.warn(
      "PHASE 3.4: Authentication failed during save."
    );

    handleAuthenticationFailure();

    return false;
  }

  if (response.status === 403) {
    let errorData: unknown = null;

    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }

    console.error(
      "PHASE 3.4: Permission/CSRF error:",
      errorData
    );

    throw new Error(
      `Access denied (403): ${
        typeof errorData === "string"
          ? errorData
          : JSON.stringify(
              errorData,
              null,
              2
            )
      }`
    );
  }

  if (!response.ok) {
    let errorData: unknown = null;

    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }

    console.error(
      "PHASE 3.4: API error:",
      errorData
    );

    throw new Error(
      `Server error (${response.status}): ${
        typeof errorData === "string"
          ? errorData
          : JSON.stringify(
              errorData,
              null,
              2
            )
      }`
    );
  }

  const data: SubstantiveProcedureAssessment =
    await response.json();

  console.log(
    "PHASE 3.4: SAVE response:",
    data
  );

  setRecordId(data.id);
  setSaved(true);
  setError("");

  return true;
} catch (err) {
  console.error(
    "PHASE 3.4: Save error:",
    err
  );

  setSaved(false);

  setError(
    err instanceof Error
      ? err.message
      : "Failed to save substantive procedure."
  );

  return false;
} finally {
  setSaving(false);
}


};

// ============================================================
// CONTINUE
// ============================================================

const handleContinue = async () => {
console.log(
"PHASE 3.4: CONTINUE CLICKED"
);


if (saving) {
  console.log(
    "PHASE 3.4: Save already in progress."
  );

  return;
}

const success = await handleSave();

console.log(
  "PHASE 3.4: Save result:",
  success
);

if (!success) {
  console.warn(
    "PHASE 3.4: Navigation stopped because save failed."
  );

  return;
}

console.log(
  "PHASE 3.4: Moving to Phase 3.5..."
);

router.push(
  `/engagements/${engagementId}/execution/3.5`
);


};

// ============================================================
// LOADING
// ============================================================

if (loading) {
return (  <div className="flex min-h-[70vh] items-center justify-center"> <div className="flex items-center gap-3 text-gray-600"> <Loader2
           size={22}
           className="animate-spin"
         />
Loading substantive procedures... </div> </div> 
);
}

// ============================================================
// PAGE
// ============================================================

return (  <div className="w-full bg-gray-50">

```
    {/* HEADER */}

    <div className="mb-6 flex items-center gap-4">

      <button
        onClick={() =>
          router.push(
            `/engagements/${engagementId}/execution`
          )
        }
        className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white transition hover:bg-gray-50"
      >
        <ArrowLeft size={19} />
      </button>

      <div>

        <div className="flex gap-2 text-sm">

          <span className="font-semibold text-blue-600">
            Phase 3
          </span>

          <span>/</span>

          <span className="text-gray-500">
            3.4 Substantive Procedures
          </span>

        </div>

        <h1 className="mt-1 text-2xl font-bold">
          Perform Substantive Procedures
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Execute substantive analytical and detailed testing procedures.
        </p>

      </div>

    </div>

    {/* ERROR */}

    {error && (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">

        <CircleAlert
          size={20}
          className="mt-0.5 shrink-0"
        />

        <div>

          <p className="font-semibold">
            Unable to save
          </p>

          <pre className="mt-1 whitespace-pre-wrap text-sm">
            {error}
          </pre>

        </div>

      </div>
    )}

    {/* PROCEDURE INFORMATION */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <div className="mb-5 flex items-center gap-3">

        <FileSearch className="text-blue-600" />

        <div>

          <h2 className="font-semibold">
            Procedure Information
          </h2>

          <p className="text-sm text-gray-500">
            Define the substantive audit procedure and financial statement area.
          </p>

        </div>

      </div>

      <div className="grid gap-5 md:grid-cols-2">

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Procedure Type
          </label>

          <select
            value={procedureType}
            onChange={(e) => {
              setProcedureType(e.target.value);
              setSaved(false);
            }}
            className="w-full rounded-lg border bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >

            <option value="">
              Select procedure type
            </option>

            {PROCEDURE_TYPES.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}

          </select>

        </div>

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Account / Financial Statement Area
          </label>

          <input
            value={accountArea}
            onChange={(e) => {
              setAccountArea(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. Revenue, Cash, Inventory, Receivables"
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </div>

      </div>

      <div className="mt-5">

        <label className="mb-2 block text-sm font-medium text-gray-700">
          Audit Objective
        </label>

        <textarea
          value={objective}
          onChange={(e) => {
            setObjective(e.target.value);
            setSaved(false);
          }}
          rows={4}
          placeholder="Describe what the substantive procedure is intended to achieve..."
          className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

      </div>

    </section>

    {/* POPULATION & SAMPLE */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <div className="mb-4 flex items-center gap-3">

        <Database className="text-purple-600" />

        <div>

          <h2 className="font-semibold">
            Population & Sample
          </h2>

          <p className="text-sm text-gray-500">
            Document the population and items selected for testing.
          </p>

        </div>

      </div>

      <div className="grid gap-5 md:grid-cols-2">

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Population Size
          </label>

          <input
            type="number"
            min="0"
            value={population}
            onChange={(e) => {
              setPopulation(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. 500"
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </div>

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Sample / Items Tested
          </label>

          <input
            type="number"
            min="0"
            value={sample}
            onChange={(e) => {
              setSample(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. 40"
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </div>

      </div>

    </section>

    {/* PROCEDURE */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <div className="mb-4">

        <h2 className="font-semibold">
          Procedure Performed
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Describe the substantive audit work performed.
        </p>

      </div>

      <textarea
        value={procedure}
        onChange={(e) => {
          setProcedure(e.target.value);
          setSaved(false);
        }}
        rows={7}
        placeholder="Describe the substantive procedure performed, including the steps followed, documents examined and testing performed..."
        className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

    </section>

    {/* EVIDENCE */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <div className="mb-4">

        <h2 className="font-semibold">
          Evidence Obtained
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Document the audit evidence obtained and reviewed.
        </p>

      </div>

      <textarea
        value={evidence}
        onChange={(e) => {
          setEvidence(e.target.value);
          setSaved(false);
        }}
        rows={5}
        placeholder="Document evidence obtained, source documents, confirmations, reports or other audit evidence..."
        className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

    </section>

    {/* EXCEPTIONS */}

    <section className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-6">

      <div className="mb-4 flex items-center gap-3">

        <AlertTriangle className="text-orange-600" />

        <div>

          <h2 className="font-semibold">
            Exceptions & Misstatements
          </h2>

          <p className="text-sm text-gray-600">
            Record exceptions and quantify identified misstatements where applicable.
          </p>

        </div>

      </div>

      <div className="mb-4">

        <label className="mb-2 block text-sm font-medium text-gray-700">
          Exceptions Identified
        </label>

        <textarea
          value={exceptions}
          onChange={(e) => {
            setExceptions(e.target.value);
            setSaved(false);
          }}
          rows={4}
          placeholder="Describe any exceptions identified during testing..."
          className="w-full rounded-lg border bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

      </div>

      <div>

        <label className="mb-2 block text-sm font-medium text-gray-700">
          Misstatement Amount
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={misstatements}
          onChange={(e) => {
            setMisstatements(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. 150000.00"
          className="w-full rounded-lg border bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

      </div>

    </section>

    {/* CONCLUSION */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <div className="mb-4">

        <h2 className="font-semibold">
          Auditor Conclusion
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Document the conclusion reached from the substantive procedure.
        </p>

      </div>

      <textarea
        value={conclusion}
        onChange={(e) => {
          setConclusion(e.target.value);
          setSaved(false);
        }}
        rows={5}
        placeholder="Document the auditor's conclusion based on the procedures performed and evidence obtained..."
        className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

    </section>

    {/* ACTION BAR */}

    <div className="flex flex-col gap-3 rounded-xl border bg-white p-6 sm:flex-row sm:items-center sm:justify-between">

      <button
        onClick={() =>
          router.push(
            `/engagements/${engagementId}/execution`
          )
        }
        className="rounded-lg border px-5 py-3 font-semibold transition hover:bg-gray-50"
      >
        Cancel
      </button>

      <div className="flex flex-col gap-3 sm:flex-row">

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >

          {saving ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 size={18} />
              Saved
            </>
          ) : (
            <>
              <Save size={18} />
              Save Procedure
            </>
          )}

        </button>

        <button
          onClick={handleContinue}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue
          <ArrowRight size={18} />
        </button>

      </div>

    </div>

  </div>



);
}


