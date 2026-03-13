// components/analyst/WorkflowHealthDashboard.tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { scoreWorkflow, type LocalScore } from "@/lib/local-scorer";
import {
  canUseAIAnalysis,
  type EntflowTier,
  TIER_CONFIG,
} from "@/lib/analyst-tier-gate";
import type { AnalysisResult, AnalysisIssue } from "@/lib/analyst-types";
import WorkflowHealthBadge from "./WorkflowHealthBadge";
import UpgradePrompt from "./UpgradePrompt";

// ── Types ─────────────────────────────────────────────────────────

interface WorkflowItem {
  id: string;
  name: string;
  objectType?: string;
  description?: string;
  definition: any;
  enrollmentCriteria?: string;
}

interface Props {
  workflows: WorkflowItem[];
  tier: EntflowTier;
  aiUsedThisMonth?: number;
}

interface WorkflowWithScore extends WorkflowItem {
  localScore: LocalScore;
}

interface SequenceItem {
  workflowId: string;
  position: number;
  stage: string;
  triggeredBy: string | null;
  triggers: string[];
  reasoning: string;
}

interface SequenceData {
  sequence: SequenceItem[];
  lifecycle_summary: string;
}

// ── Severity config ───────────────────────────────────────────────
const sevConfig: Record<
  AnalysisIssue["severity"],
  { badge: string; icon: string }
> = {
  critical: { badge: "bg-red-600 text-white", icon: "⛔" },
  warning: { badge: "bg-amber-500 text-white", icon: "⚠️" },
  info: { badge: "bg-sky-500 text-white", icon: "ℹ️" },
};

// Stage colors for trigger-order view
const stageColors: Record<string, string> = {
  "Lead Capture": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Nurture": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Qualification": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Sales Handoff": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Onboarding": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Retention": "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "Re-engagement": "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "Notification": "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function getStageColor(stage: string): string {
  // Try exact match first, then partial
  if (stageColors[stage]) return stageColors[stage];
  const lower = stage.toLowerCase();
  for (const [key, val] of Object.entries(stageColors)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
}

// ── Sort options ──────────────────────────────────────────────────
type SortKey = "score-asc" | "score-desc" | "name" | "steps" | "trigger-order";

// ── Main component ────────────────────────────────────────────────
export default function WorkflowHealthDashboard({
  workflows,
  tier,
  aiUsedThisMonth = 0,
}: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("score-asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, AnalysisResult>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [usedCount, setUsedCount] = useState(aiUsedThisMonth);

  // Sequence state
  const [sequenceData, setSequenceData] = useState<SequenceData | null>(null);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [sequenceError, setSequenceError] = useState<string | null>(null);

  // Score all workflows locally
  const scoredWorkflows: WorkflowWithScore[] = useMemo(
    () =>
      workflows.map((w) => ({
        ...w,
        localScore: scoreWorkflow(w.definition),
      })),
    [workflows]
  );

  // Build lookup from sequence data
  const sequenceMap = useMemo(() => {
    if (!sequenceData?.sequence) return new Map<string, SequenceItem>();
    const map = new Map<string, SequenceItem>();
    for (const item of sequenceData.sequence) {
      map.set(item.workflowId, item);
    }
    return map;
  }, [sequenceData]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...scoredWorkflows];
    switch (sortBy) {
      case "score-asc":
        return copy.sort((a, b) => a.localScore.overall - b.localScore.overall);
      case "score-desc":
        return copy.sort((a, b) => b.localScore.overall - a.localScore.overall);
      case "name":
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case "steps":
        return copy.sort(
          (a, b) => b.localScore.totalSteps - a.localScore.totalSteps
        );
      case "trigger-order":
        if (sequenceMap.size === 0) return copy;
        return copy.sort((a, b) => {
          const posA = sequenceMap.get(a.id)?.position ?? 999;
          const posB = sequenceMap.get(b.id)?.position ?? 999;
          return posA - posB;
        });
      default:
        return copy;
    }
  }, [scoredWorkflows, sortBy, sequenceMap]);

  // Summary stats
  const avgScore = Math.round(
    scoredWorkflows.reduce((sum, w) => sum + w.localScore.overall, 0) /
      Math.max(scoredWorkflows.length, 1)
  );
  const criticalCount = scoredWorkflows.filter(
    (w) => w.localScore.grade === "F" || w.localScore.grade === "D"
  ).length;
  const healthyCount = scoredWorkflows.filter(
    (w) => w.localScore.grade === "A" || w.localScore.grade === "B"
  ).length;

  // AI tier check
  const tierCheck = canUseAIAnalysis(tier, usedCount);

  // ── Trigger order handler ───────────────────────────────────────
  const runSequenceSort = useCallback(async () => {
    if (sequenceData) {
      // Already have data, just switch sort
      setSortBy("trigger-order");
      return;
    }

    setSequenceLoading(true);
    setSequenceError(null);

    try {
      const res = await fetch("/api/analyst/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflows }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSequenceError(data.error || "Sequencing failed");
        return;
      }

      setSequenceData(data.sequence);
      setSortBy("trigger-order");
      setUsedCount((c) => c + 1);
    } catch (err: unknown) {
      setSequenceError(
        err instanceof Error ? err.message : "Network error"
      );
    } finally {
      setSequenceLoading(false);
    }
  }, [workflows, sequenceData]);

  // Deep analyse handler
  const runDeepAnalysis = useCallback(
    async (workflow: WorkflowWithScore) => {
      const check = canUseAIAnalysis(tier, usedCount);
      if (!check.allowed) return;

      setAiLoading((prev) => ({ ...prev, [workflow.id]: true }));
      setAiErrors((prev) => ({ ...prev, [workflow.id]: "" }));

      try {
        const res = await fetch("/api/analyst", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: workflow.name,
            description: workflow.description,
            objectType: workflow.objectType,
            enrollmentCriteria: workflow.enrollmentCriteria,
            rawJson:
              typeof workflow.definition === "string"
                ? workflow.definition
                : JSON.stringify(workflow.definition),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAiErrors((prev) => ({
            ...prev,
            [workflow.id]: data.error || "Analysis failed",
          }));
          return;
        }

        setAiResults((prev) => ({ ...prev, [workflow.id]: data.analysis }));
        setUsedCount((c) => c + 1);
      } catch (err: unknown) {
        setAiErrors((prev) => ({
          ...prev,
          [workflow.id]:
            err instanceof Error ? err.message : "Network error",
        }));
      } finally {
        setAiLoading((prev) => ({ ...prev, [workflow.id]: false }));
      }
    },
    [tier, usedCount]
  );

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Helper to get workflow name by id
  const getWorkflowName = (id: string) =>
    workflows.find((w) => w.id === id)?.name || id;

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Workflow Health
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {scoredWorkflows.length} workflow
              {scoredWorkflows.length !== 1 ? "s" : ""} scored ·{" "}
              <span className="font-medium">{TIER_CONFIG[tier].label}</span> plan
            </p>
          </div>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
            Workflows
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
            {scoredWorkflows.length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
            Avg Score
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
            {avgScore}
            <span className="text-sm font-normal text-zinc-400">/100</span>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
            Needs Work
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">
            {criticalCount}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
            Healthy
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {healthyCount}
          </div>
        </div>
      </div>

      {/* ── AI usage / tier info ───────────────────────────── */}
      {tier !== "free" && tierCheck.remaining !== undefined && (
        <div className="mb-4 text-xs text-zinc-400 dark:text-zinc-500">
          AI analyses used: {usedCount} /{" "}
          {TIER_CONFIG[tier].monthlyAILimit ?? "∞"} this month
          {tierCheck.remaining !== undefined && tierCheck.remaining <= 3 && (
            <span className="text-amber-500 ml-2">
              ({tierCheck.remaining} remaining)
            </span>
          )}
        </div>
      )}

      {/* ── Sort controls ──────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          Sort by
        </span>
        {(
          [
            ["score-asc", "Worst first"],
            ["score-desc", "Best first"],
            ["name", "Name"],
            ["steps", "Most steps"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              sortBy === key
                ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-semibold"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}

        {/* AI Trigger Order button */}
        {tier !== "free" ? (
          <button
            onClick={runSequenceSort}
            disabled={sequenceLoading}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
              sortBy === "trigger-order"
                ? "bg-gradient-to-r from-violet-200 to-fuchsia-200 dark:from-violet-800/60 dark:to-fuchsia-800/60 text-violet-800 dark:text-violet-200 font-semibold"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            } disabled:opacity-50`}
          >
            {sequenceLoading ? (
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
                <path d="m14 7 3 3" />
              </svg>
            )}
            {sequenceLoading ? "Mapping…" : "Trigger order"}
          </button>
        ) : (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 px-2 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700">
            Trigger order (paid plans)
          </span>
        )}
      </div>

      {sequenceError && (
        <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-2 text-xs text-red-700 dark:text-red-300">
          {sequenceError}
        </div>
      )}

      {/* ── Lifecycle summary banner ───────────────────────── */}
      {sortBy === "trigger-order" && sequenceData?.lifecycle_summary && (
        <div className="mb-4 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 px-4 py-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed">
              {sequenceData.lifecycle_summary}
            </p>
          </div>
        </div>
      )}

      {/* ── Workflow list ───────────────────────────────────── */}
      <div className="space-y-3">
        {sorted.map((w, index) => {
          const isExpanded = expandedId === w.id;
          const aiResult = aiResults[w.id];
          const isLoading = aiLoading[w.id];
          const aiError = aiErrors[w.id];
          const seqItem = sequenceMap.get(w.id);
          const showSequence = sortBy === "trigger-order" && seqItem;

          return (
            <div key={w.id}>
              {/* Trigger chain connector */}
              {showSequence && index > 0 && seqItem.triggeredBy && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex flex-col items-center">
                    <svg width="16" height="20" viewBox="0 0 16 20" className="text-violet-400 dark:text-violet-600">
                      <path d="M8 0 L8 14 L4 10 M8 14 L12 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[10px] text-violet-400 dark:text-violet-500">
                      triggers
                    </span>
                  </div>
                </div>
              )}

              <div
                className={`bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden transition-shadow hover:shadow-sm ${
                  showSequence
                    ? "border-violet-200 dark:border-violet-800/60"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {/* Row */}
                <button
                  onClick={() => toggleExpand(w.id)}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  {/* Position number in trigger-order mode */}
                  {showSequence ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/40 dark:to-fuchsia-900/40 flex items-center justify-center font-bold text-sm text-violet-700 dark:text-violet-300 shrink-0 ring-1 ring-inset ring-violet-200 dark:ring-violet-700">
                      {seqItem.position}
                    </div>
                  ) : (
                    <WorkflowHealthBadge score={w.localScore} size="md" showFlags={false} />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {w.name}
                      </span>
                      {showSequence && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${getStageColor(
                            seqItem.stage
                          )}`}
                        >
                          {seqItem.stage}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {showSequence ? (
                        seqItem.reasoning
                      ) : (
                        <>
                          {w.localScore.totalSteps} steps
                          {w.objectType && ` · ${w.objectType}`}
                          {w.localScore.branchDepth > 0 &&
                            ` · depth ${w.localScore.branchDepth}`}
                        </>
                      )}
                    </div>
                    {/* Trigger chain info */}
                    {showSequence && seqItem.triggers.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          Triggers →
                        </span>
                        {seqItem.triggers.map((tId) => (
                          <span
                            key={tId}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          >
                            {getWorkflowName(tId)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {showSequence && (
                      <WorkflowHealthBadge score={w.localScore} size="sm" showFlags={false} />
                    )}
                    {!showSequence && (
                      <span
                        className={`text-lg font-bold tabular-nums ${w.localScore.color}`}
                      >
                        {w.localScore.overall}
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-zinc-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 pb-4 pt-3 space-y-4">
                    {/* Local issues */}
                    {w.localScore.issues.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                          Quick Scan Issues
                        </h3>
                        <div className="space-y-2">
                          {w.localScore.issues.map((issue, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="shrink-0 mt-0.5">
                                {issue.severity === "critical"
                                  ? "⛔"
                                  : issue.severity === "warning"
                                    ? "⚠️"
                                    : "ℹ️"}
                              </span>
                              <div>
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                  {issue.title}
                                </span>
                                <span className="text-zinc-500 dark:text-zinc-400">
                                  {" "}
                                  — {issue.detail}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {w.localScore.issues.length === 0 && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        No issues found in quick scan — looking clean!
                      </p>
                    )}

                    {/* Deep analysis section */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      {tier === "free" ? (
                        <UpgradePrompt
                          message={TIER_CONFIG.free.upgradeMessage}
                          currentTier="Free"
                        />
                      ) : !aiResult ? (
                        <div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              runDeepAnalysis(w);
                            }}
                            disabled={isLoading || !tierCheck.allowed}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoading ? (
                              <>
                                <svg
                                  className="animate-spin h-3.5 w-3.5"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                  />
                                </svg>
                                Running AI analysis…
                              </>
                            ) : (
                              <>
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
                                  <path d="m14 7 3 3" />
                                </svg>
                                Deep Analyse with AI
                              </>
                            )}
                          </button>

                          {!tierCheck.allowed && tierCheck.message && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                              {tierCheck.message}
                            </p>
                          )}

                          {aiError && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                              {aiError}
                            </p>
                          )}
                        </div>
                      ) : (
                        /* AI Results */
                        <div className="space-y-4">
                          <h3 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1.5">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
                            </svg>
                            AI Deep Analysis
                          </h3>

                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {aiResult.summary}
                          </p>

                          {aiResult.issues?.length > 0 && (
                            <div className="space-y-2">
                              {aiResult.issues.map((issue, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <span className="shrink-0 mt-0.5">
                                    {sevConfig[issue.severity].icon}
                                  </span>
                                  <div>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                      {issue.title}
                                    </span>
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                      {" "}
                                      — {issue.detail}
                                    </span>
                                    <div className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                                      FIX → {issue.suggestion}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {aiResult.optimizations?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                                Optimizations
                              </h4>
                              <ul className="space-y-1">
                                {aiResult.optimizations.map((opt, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
                                  >
                                    <span className="text-violet-500 mt-px shrink-0">
                                      ◆
                                    </span>
                                    {opt}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-500">
          <p className="text-lg mb-1">No workflows to score</p>
          <p className="text-sm">
            Map some HubSpot workflows first, then come back for health scores.
          </p>
        </div>
      )}
    </div>
  );
}
