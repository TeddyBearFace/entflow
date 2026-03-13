// components/analyst/WorkflowAnalyst.tsx
"use client";

import { useState, useCallback } from "react";
import type {
  AnalysisResult,
  AnalysisIssue,
  AnalystMode,
} from "@/lib/analyst-types";

// ── Severity styling ──────────────────────────────────────────────
const severityConfig: Record<
  AnalysisIssue["severity"],
  { bg: string; border: string; text: string; badge: string; icon: string }
> = {
  critical: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-300",
    badge: "bg-red-600 text-white",
    icon: "⛔",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-300",
    badge: "bg-amber-500 text-white",
    icon: "⚠️",
  },
  info: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800",
    text: "text-sky-800 dark:text-sky-300",
    badge: "bg-sky-500 text-white",
    icon: "ℹ️",
  },
};

const riskColor: Record<string, string> = {
  low: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-red-600 dark:text-red-400",
};

// ── Complexity bar ────────────────────────────────────────────────
function ComplexityBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score <= 3
      ? "bg-emerald-500"
      : score <= 6
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono font-semibold tabular-nums">
        {score}/10
      </span>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────
function AnalysisSkeleton() {
  return (
    <div className="animate-pulse space-y-6 mt-8">
      <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
      <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 bg-zinc-200 dark:bg-zinc-700 rounded-xl"
          />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}

// ── Issue card ────────────────────────────────────────────────────
function IssueCard({ issue }: { issue: AnalysisIssue }) {
  const s = severityConfig[issue.severity];
  return (
    <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">{s.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
              {issue.severity.toUpperCase()}
            </span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              {issue.category}
            </span>
            {issue.stepId && (
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                #{issue.stepId}
              </span>
            )}
          </div>
          <h4 className={`font-semibold text-sm ${s.text}`}>{issue.title}</h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {issue.detail}
          </p>
          <div className="mt-2 flex items-start gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-px shrink-0">
              FIX →
            </span>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
              {issue.suggestion}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function WorkflowAnalyst() {
  const [mode, setMode] = useState<AnalystMode>("paste");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objectType, setObjectType] = useState("contact");
  const [enrollmentCriteria, setEnrollmentCriteria] = useState("");
  const [rawJson, setRawJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"issues" | "optimizations" | "practices">("issues");

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: Record<string, unknown> = { name, description, objectType, enrollmentCriteria };

      if (mode === "paste") {
        if (!rawJson.trim()) {
          setError("Paste your workflow JSON or definition first.");
          setLoading(false);
          return;
        }
        payload.rawJson = rawJson.trim();
      } else {
        // Structured mode — try parsing rawJson as steps array
        try {
          payload.steps = JSON.parse(rawJson);
        } catch {
          setError("Structured mode requires valid JSON steps array.");
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed.");
        return;
      }

      setResult(data.analysis);
      setActiveTab("issues");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }, [mode, name, description, objectType, enrollmentCriteria, rawJson]);

  const issuesByPriority = result?.issues?.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const critCount = result?.issues?.filter((i) => i.severity === "critical").length ?? 0;
  const warnCount = result?.issues?.filter((i) => i.severity === "warning").length ?? 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93" />
              <path d="M8.24 4.47A4 4 0 0 1 12 2" />
              <path d="M12 6v2" />
              <circle cx="12" cy="14" r="4" />
              <path d="M12 18v4" />
              <path d="M8 14h-4" />
              <path d="M20 14h-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              AI Workflow Analyst
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Paste a HubSpot workflow definition — get instant audit, issues &amp; optimizations
            </p>
          </div>
        </div>
      </div>

      {/* ── Input section ──────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Mode toggle */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {(["paste", "structured"] as AnalystMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                mode === m
                  ? "text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 border-b-2 border-violet-600"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {m === "paste" ? "Raw Paste" : "Structured JSON"}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Metadata row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                Workflow Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lead Nurture Sequence"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                Object Type
              </label>
              <select
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition"
              >
                <option value="contact">Contact</option>
                <option value="company">Company</option>
                <option value="deal">Deal</option>
                <option value="ticket">Ticket</option>
                <option value="custom">Custom Object</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                Enrollment Criteria
              </label>
              <input
                type="text"
                value={enrollmentCriteria}
                onChange={(e) => setEnrollmentCriteria(e.target.value)}
                placeholder="e.g. Lifecycle = MQL"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition"
            />
          </div>

          {/* Main input area */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
              {mode === "paste"
                ? "Paste workflow JSON, YAML, or plain-text description"
                : "Paste steps array as JSON"}
            </label>
            <textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              rows={12}
              placeholder={
                mode === "paste"
                  ? `Paste anything here:\n• HubSpot workflow export JSON\n• A screenshot description\n• Step-by-step plain English\n• Workflow API response`
                  : `[\n  {\n    "id": "1",\n    "type": "trigger",\n    "name": "Form submitted",\n    "children": ["2"]\n  },\n  ...\n]`
              }
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Powered by Claude · Analysis stays local to your session
            </p>
            <button
              onClick={analyze}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Analysing…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
                    <path d="m14 7 3 3" />
                    <path d="M5 6v4" />
                    <path d="M19 14v4" />
                    <path d="M10 2v2" />
                    <path d="M7 8H3" />
                    <path d="M21 16h-4" />
                    <path d="M11 3H9" />
                  </svg>
                  Analyse Workflow
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Loading state ──────────────────────────────────── */}
      {loading && <AnalysisSkeleton />}

      {/* ── Results ─────────────────────────────────────────── */}
      {result && !loading && (
        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Summary */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
              Summary
            </h2>
            <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
              {result.summary}
            </p>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Steps</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
                {result.metrics.totalSteps}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Branch Depth</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
                {result.metrics.branchDepth}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Runtime</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {result.metrics.estimatedRuntime}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Enrollment Risk</div>
              <div className={`text-lg font-bold uppercase ${riskColor[result.metrics.enrollmentRisk]}`}>
                {result.metrics.enrollmentRisk}
              </div>
            </div>
          </div>

          {/* Complexity */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Complexity Score
            </div>
            <ComplexityBar score={result.metrics.complexityScore} />
          </div>

          {/* Headline counts */}
          {(critCount > 0 || warnCount > 0) && (
            <div className="flex gap-3">
              {critCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm font-semibold">
                  ⛔ {critCount} critical
                </div>
              )}
              {warnCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-sm font-semibold">
                  ⚠️ {warnCount} warning{warnCount > 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}

          {/* Tabbed detail section */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex border-b border-zinc-200 dark:border-zinc-800">
              {(
                [
                  ["issues", `Issues (${result.issues?.length ?? 0})`],
                  ["optimizations", `Optimizations (${result.optimizations?.length ?? 0})`],
                  ["practices", `Best Practices (${result.bestPractices?.length ?? 0})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === key
                      ? "text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 border-b-2 border-violet-600"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-3">
              {activeTab === "issues" &&
                (issuesByPriority && issuesByPriority.length > 0 ? (
                  issuesByPriority.map((issue, i) => (
                    <IssueCard key={i} issue={issue} />
                  ))
                ) : (
                  <p className="text-sm text-zinc-400 text-center py-8">
                    No issues found — looking clean! 🎉
                  </p>
                ))}

              {activeTab === "optimizations" &&
                (result.optimizations?.length > 0 ? (
                  <ul className="space-y-2">
                    {result.optimizations.map((opt, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <span className="text-violet-500 mt-0.5 shrink-0">◆</span>
                        {opt}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-400 text-center py-8">
                    No optimizations suggested.
                  </p>
                ))}

              {activeTab === "practices" &&
                (result.bestPractices?.length > 0 ? (
                  <ul className="space-y-2">
                    {result.bestPractices.map((bp, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                        {bp}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-400 text-center py-8">
                    No additional best practices noted.
                  </p>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
