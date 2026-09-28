"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
ArrowLeft,
FileText,
Users,
UserCheck,
Calculator,
Save,
CheckCircle2,
Loader2,
ArrowRight,
CircleAlert,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

const PROCEDURE_TYPES = [
"Group Audit",
"Internal Audit Reliance",
"Expert Involvement",
"Sampling",
"Accounting Estimates",
"Financial Statement Close Process",
"Sustainability",
"Service Organization",
"Complex Transactions",
];

interface GeneralAuditProcedure {
id: number;
engagement: number;
procedure_type: string;
responsible_person: string;
procedure_performed: string;
evidence_documentation: string;
findings: string;
issues_follow_up: string;
auditor_conclusion: string;
created_at?: string;
updated_at?: string;
}

export default function GeneralAuditPage() {
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
const [responsiblePerson, setResponsiblePerson] =
useState("");

const [procedure, setProcedure] = useState("");
const [evidence, setEvidence] = useState("");

const [findings, setFindings] = useState("");
const [issues, setIssues] = useState("");

const [conclusion, setConclusion] = useState("");

// ============================================================
// SYSTEM STATE
// ============================================================

const [recordId, setRecordId] = useState<number | null>(
null
);

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);

const [saved, setSaved] = useState(false);

const [error, setError] = useState("");

// ============================================================
// LOAD EXISTING 3.5 RECORD
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
      "PHASE 3.5: Loading assessment for engagement:",
      engagementId
    );

    const response = await fetch(
      `${API_BASE_URL}/general-audit-procedures/?engagement=${engagementId}`,
      {
        method: "GET",
        credentials: "include",
        headers: getHeaders(false),
        cache: "no-store",
      }
    );

    console.log(
      "PHASE 3.5: GET status:",
      response.status
    );

    // ------------------------------------------------------
    // AUTHENTICATION FAILURE
    // ------------------------------------------------------

    if (response.status === 401) {
      console.warn(
        "PHASE 3.5: User is not authenticated."
      );

      handleAuthenticationFailure();
      return;
    }

    // ------------------------------------------------------
    // PERMISSION / SESSION FAILURE
    // ------------------------------------------------------

    if (response.status === 403) {
      let errorData: unknown = null;

      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }

      console.error(
        "PHASE 3.5: GET 403 response:",
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

    // ------------------------------------------------------
    // OTHER API ERRORS
    // ------------------------------------------------------

    if (!response.ok) {
      let errorData: unknown = null;

      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }

      throw new Error(
        `Failed to load General Audit Procedures (${response.status}): ${
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

    // ------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------

    const data = await response.json();

    console.log(
      "PHASE 3.5: GET response:",
      data
    );

    const records: GeneralAuditProcedure[] =
      Array.isArray(data)
        ? data
        : data?.results || [];

    if (records.length > 0) {
      const record = records[0];

      console.log(
        "PHASE 3.5: Existing record found:",
        record
      );

      setRecordId(record.id);

      setProcedureType(
        record.procedure_type || ""
      );

      setResponsiblePerson(
        record.responsible_person || ""
      );

      setProcedure(
        record.procedure_performed || ""
      );

      setEvidence(
        record.evidence_documentation || ""
      );

      setFindings(
        record.findings || ""
      );

      setIssues(
        record.issues_follow_up || ""
      );

      setConclusion(
        record.auditor_conclusion || ""
      );

      setSaved(true);
    } else {
      console.log(
        "PHASE 3.5: No existing assessment found."
      );
    }
  } catch (err) {
    console.error(
      "PHASE 3.5: Load error:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Unable to load General Audit Procedures."
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
    "Please select a procedure type."
  );
  return false;
}

if (!procedure.trim()) {
  setError(
    "Please describe the general audit procedure performed."
  );
  return false;
}

// ----------------------------------------------------------
// PAYLOAD
// ----------------------------------------------------------

const payload = {
  engagement: Number(engagementId),

  procedure_type:
    procedureType,

  responsible_person:
    responsiblePerson,

  procedure_performed:
    procedure,

  evidence_documentation:
    evidence,

  findings:
    findings,

  issues_follow_up:
    issues,

  auditor_conclusion:
    conclusion,
};

console.log(
  "PHASE 3.5: SAVE payload:",
  payload
);

setSaving(true);

try {
  let response: Response;

  // ========================================================
  // UPDATE EXISTING RECORD
  // ========================================================

  if (recordId) {
    console.log(
      "PHASE 3.5: Updating record:",
      recordId
    );

    response = await fetch(
      `${API_BASE_URL}/general-audit-procedures/${recordId}/`,
      {
        method: "PATCH",
        credentials: "include",
        headers: getHeaders(true),
        body: JSON.stringify(payload),
      }
    );
  }

  // ========================================================
  // CREATE NEW RECORD
  // ========================================================

  else {
    console.log(
      "PHASE 3.5: Creating new record."
    );

    response = await fetch(
      `${API_BASE_URL}/general-audit-procedures/`,
      {
        method: "POST",
        credentials: "include",
        headers: getHeaders(true),
        body: JSON.stringify(payload),
      }
    );
  }

  console.log(
    "PHASE 3.5: SAVE status:",
    response.status
  );

  // --------------------------------------------------------
  // AUTHENTICATION FAILURE
  // --------------------------------------------------------

  if (response.status === 401) {
    console.warn(
      "PHASE 3.5: Authentication failed during save."
    );

    handleAuthenticationFailure();

    return false;
  }

  // --------------------------------------------------------
  // CSRF / PERMISSION FAILURE
  // --------------------------------------------------------

  if (response.status === 403) {
    let errorData: unknown = null;

    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }

    console.error(
      "PHASE 3.5: SAVE 403 response:",
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

  // --------------------------------------------------------
  // OTHER API ERRORS
  // --------------------------------------------------------

  if (!response.ok) {
    let errorData: unknown = null;

    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }

    console.error(
      "PHASE 3.5: API error:",
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

  // --------------------------------------------------------
  // SUCCESS
  // --------------------------------------------------------

  const data: GeneralAuditProcedure =
    await response.json();

  console.log(
    "PHASE 3.5: SAVE response:",
    data
  );

  setRecordId(data.id);

  setSaved(true);

  setError("");

  return true;
} catch (err) {
  console.error(
    "PHASE 3.5: Save error:",
    err
  );

  setSaved(false);

  setError(
    err instanceof Error
      ? err.message
      : "Failed to save General Audit Procedures."
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
"PHASE 3.5: CONTINUE CLICKED"
);


if (saving) {
  console.log(
    "PHASE 3.5: Save already in progress."
  );

  return;
}

const success = await handleSave();

console.log(
  "PHASE 3.5: Save result:",
  success
);

if (!success) {
  console.warn(
    "PHASE 3.5: Navigation stopped because save failed."
  );

  return;
}

console.log(
  "PHASE 3.5: Moving to Phase 3.6..."
);

router.push(
  `/engagements/${engagementId}/execution/3.6`
);


};

// ============================================================
// LOADING
// ============================================================

if (loading) {
return (  <div className="flex min-h-[70vh] items-center justify-center"> <div className="flex items-center gap-3 text-gray-600">


        <Loader2
          size={22}
          className="animate-spin"
        />

        Loading General Audit Procedures...

      </div>
    </div>
  
);


}

// ============================================================
// PAGE
// ============================================================

return ( 


  <div className="min-h-screen bg-gray-50">

    {/* =====================================================
        HEADER
    ====================================================== */}

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
            3.5 General Audit Procedures
          </span>

        </div>

        <h1 className="mt-1 text-2xl font-bold">
          General Audit Procedures
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Document cross-cutting audit procedures and specialist work.
        </p>

      </div>

    </div>

    {/* =====================================================
        ERROR
    ====================================================== */}

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

    {/* =====================================================
        PROCEDURE CLASSIFICATION
    ====================================================== */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <div className="mb-5 flex items-center gap-3">

        <FileText className="text-blue-600" />

        <div>

          <h2 className="font-semibold">
            Procedure Classification
          </h2>

          <p className="text-sm text-gray-500">
            Classify the general audit procedure and identify the responsible person.
          </p>

        </div>

      </div>

      <div className="grid gap-5 md:grid-cols-2">

        {/* PROCEDURE TYPE */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Procedure Type
          </label>

          <select
            value={procedureType}
            onChange={(e) => {
              setProcedureType(
                e.target.value
              );
              setSaved(false);
            }}
            className="w-full rounded-lg border bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >

            <option value="">
              Select procedure
            </option>

            {PROCEDURE_TYPES.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              )
            )}

          </select>

        </div>

        {/* RESPONSIBLE PERSON */}

        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Responsible Auditor / Specialist
          </label>

          <input
            value={responsiblePerson}
            onChange={(e) => {
              setResponsiblePerson(
                e.target.value
              );
              setSaved(false);
            }}
            placeholder="Responsible Auditor / Specialist"
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </div>

      </div>

    </section>

    {/* =====================================================
        PROCEDURE
    ====================================================== */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <div className="mb-4 flex items-center gap-3">

        <Users className="text-purple-600" />

        <div>

          <h2 className="font-semibold">
            Procedure Performed
          </h2>

          <p className="text-sm text-gray-500">
            Describe the general audit procedure performed.
          </p>

        </div>

      </div>

      <textarea
        value={procedure}
        onChange={(e) => {
          setProcedure(
            e.target.value
          );
          setSaved(false);
        }}
        rows={7}
        placeholder="Describe the general audit procedure performed..."
        className="w-full rounded-lg border px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
      />

    </section>

    {/* =====================================================
        EVIDENCE
    ====================================================== */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <div className="mb-4 flex items-center gap-3">

        <UserCheck className="text-green-600" />

        <div>

          <h2 className="font-semibold">
            Evidence & Documentation
          </h2>

          <p className="text-sm text-gray-500">
            Record the evidence and supporting documentation obtained.
          </p>

        </div>

      </div>

      <textarea
        value={evidence}
        onChange={(e) => {
          setEvidence(
            e.target.value
          );
          setSaved(false);
        }}
        rows={5}
        placeholder="Describe evidence obtained..."
        className="w-full rounded-lg border px-4 py-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
      />

    </section>

    {/* =====================================================
        FINDINGS
    ====================================================== */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <h2 className="font-semibold">
        Findings
      </h2>

      <textarea
        value={findings}
        onChange={(e) => {
          setFindings(
            e.target.value
          );
          setSaved(false);
        }}
        rows={5}
        placeholder="Document findings..."
        className="mt-4 w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

    </section>

    {/* =====================================================
        ISSUES
    ====================================================== */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <div className="mb-4 flex items-center gap-3">

        <Calculator className="text-orange-600" />

        <div>

          <h2 className="font-semibold">
            Issues Requiring Follow-Up
          </h2>

          <p className="text-sm text-gray-500">
            Record matters requiring additional investigation or action.
          </p>

        </div>

      </div>

      <textarea
        value={issues}
        onChange={(e) => {
          setIssues(
            e.target.value
          );
          setSaved(false);
        }}
        rows={5}
        placeholder="Document issues requiring follow-up..."
        className="w-full rounded-lg border px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
      />

    </section>

    {/* =====================================================
        CONCLUSION
    ====================================================== */}

    <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

      <h2 className="font-semibold">
        Auditor Conclusion
      </h2>

      <textarea
        value={conclusion}
        onChange={(e) => {
          setConclusion(
            e.target.value
          );
          setSaved(false);
        }}
        rows={5}
        placeholder="Document the conclusion..."
        className="mt-4 w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

    </section>

    {/* =====================================================
        ACTION BAR
    ====================================================== */}

    <div className="flex flex-col gap-3 rounded-xl border bg-white p-6 sm:flex-row sm:items-center sm:justify-between">

      {/* CANCEL */}

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

        {/* SAVE */}

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

        {/* CONTINUE */}

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

