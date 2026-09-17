"use client";

import { useState } from "react";

const API_URL = "http://localhost:8000";

export default function AIAssistantPage() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      return;
    }

    setLoading(true);
    setReply("");
    setError("");

    try {
      // --------------------------------------------------
      // STEP 1: Get CSRF token from Django
      // --------------------------------------------------
      const csrfResponse = await fetch(`${API_URL}/api/ai/csrf/`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const csrfData = await csrfResponse.json();

      if (!csrfResponse.ok) {
        console.error("CSRF error:", {
          status: csrfResponse.status,
          statusText: csrfResponse.statusText,
          data: csrfData,
        });

        setError(
          csrfData?.details ||
            csrfData?.error ||
            csrfData?.detail ||
            `Could not get CSRF token. HTTP ${csrfResponse.status} ${csrfResponse.statusText}`
        );

        return;
      }

      const csrfToken = csrfData.csrfToken;

      if (!csrfToken) {
        console.error("CSRF token missing:", csrfData);

        setError("Django did not return a CSRF token.");

        return;
      }

      // --------------------------------------------------
      // STEP 2: Send message to AI backend
      // --------------------------------------------------
      const response = await fetch(`${API_URL}/api/ai/chat/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          message: message.trim(),
        }),
      });

      // Try to read JSON response
      const data = await response.json();

      // --------------------------------------------------
      // STEP 3: Handle backend error
      // --------------------------------------------------
      if (!response.ok) {
        console.error("AI error:", {
          status: response.status,
          statusText: response.statusText,
          data,
        });

        setError(
          data?.details ||
            data?.error ||
            data?.detail ||
            `AI request failed. HTTP ${response.status} ${response.statusText}`
        );

        return;
      }

      // --------------------------------------------------
      // STEP 4: Successful AI response
      // --------------------------------------------------
      setReply(data.reply || "No reply was returned.");
    } catch (err) {
      console.error("AI request error:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not connect to the AI server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-gray-50">
      {/* Responsive page wrapper */}
      <div className="w-full px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">
          {/* Main AI container */}
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            {/* --------------------------------------------------
                HEADER
            -------------------------------------------------- */}
            <div className="border-b border-gray-200 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7">
              <div className="max-w-3xl">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
                  AUD AI Assistant
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base sm:leading-7">
                  Ask questions about audit planning, risk assessment,
                  procedures, evidence, findings, reporting, and other audit
                  activities.
                </p>
              </div>
            </div>

            {/* --------------------------------------------------
                CONTENT
            -------------------------------------------------- */}
            <div className="px-4 py-5 sm:px-6 sm:py-7 md:px-8 md:py-8">
              {/* Question */}
              <div>
                <label
                  htmlFor="ai-message"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Your question
                </label>

                <textarea
                  id="ai-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();

                      if (!loading && message.trim()) {
                        handleSend();
                      }
                    }
                  }}
                  placeholder="Example: What is audit risk?"
                  disabled={loading}
                  className="min-h-36 w-full resize-y rounded-lg border border-gray-300 bg-white p-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 sm:min-h-40 sm:p-4 sm:text-base"
                />

                <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Press{" "}
                    <span className="font-medium text-gray-700">Enter</span>{" "}
                    to send. Use{" "}
                    <span className="font-medium text-gray-700">
                      Shift + Enter
                    </span>{" "}
                    for a new line.
                  </p>

                  <p className="hidden sm:block">
                    {message.length} characters
                  </p>
                </div>
              </div>

              {/* --------------------------------------------------
                  SEND BUTTON
              -------------------------------------------------- */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={loading || !message.trim()}
                  className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
                >
                  {loading ? "Thinking..." : "Send"}
                </button>
              </div>

              {/* --------------------------------------------------
                  LOADING
              -------------------------------------------------- */}
              {loading && (
                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-blue-900">
                        AUD AI is thinking...
                      </p>

                      <p className="mt-1 text-xs leading-5 text-blue-700 sm:text-sm">
                        Please wait while the assistant prepares a response.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------
                  ERROR
              -------------------------------------------------- */}
              {error && (
                <div
                  role="alert"
                  className="mt-6 overflow-hidden rounded-lg border border-red-300 bg-red-50 p-4 sm:p-5"
                >
                  <p className="text-sm font-semibold text-red-800">
                    Error
                  </p>

                  <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {/* --------------------------------------------------
                  AI RESPONSE
              -------------------------------------------------- */}
              {reply && (
                <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {/* Response header */}
                  <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
                    <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                      AI Response
                    </h2>
                  </div>

                  {/* Response content */}
                  <div className="px-4 py-5 sm:px-5 sm:py-6 md:px-6">
                    <div className="max-w-none break-words whitespace-pre-wrap text-sm leading-7 text-gray-700 sm:text-base sm:leading-7">
                      {reply}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --------------------------------------------------
              FOOTER
          -------------------------------------------------- */}
          <div className="px-2 py-4 text-center sm:py-5">
            <p className="text-xs text-gray-500">
              AUD AI Assistant • Audit Management System
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}