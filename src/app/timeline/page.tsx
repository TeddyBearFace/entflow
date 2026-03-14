"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Link from "next/link";

interface SequenceItem {
  workflowId: string;
  position: number;
  stage: string;
  triggeredBy?: string | null;
  triggerReason?: string | null;
  triggers?: string[];
  reasoning: string;
}

interface SequenceData {
  sequence: SequenceItem[];
  lifecycle_summary: string;
}

interface WorkflowInfo {
  id: string;
  name: string;
  objectType: string;
  status: string;
}

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Lead Capture": { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  "Data Enrichment": { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  "Lead Scoring": { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  "Nurture": { bg: "#FAF5FF", text: "#7C3AED", border: "#DDD6FE" },
  "Qualification": { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  "Sales Handoff": { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  "Opportunity": { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  "Close Won": { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" },
  "Onboarding": { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" },
  "Retention": { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  "Re-engagement": { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" },
  "Internal Ops": { bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB" },
  "Notification": { bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB" },
  "Data Management": { bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB" },
};
const DEFAULT_STAGE_COLOR = { bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB" };

const OBJ_COLORS: Record<string, string> = {
  contact: "#2E75B6", deal: "#27AE60", company: "#8E44AD", ticket: "#E67E22",
};

export default function FlowTimelinePage() {
  const searchParams = useSearchParams();
  const portalId = searchParams.get("portal") || "";

  const [sequenceData, setSequenceData] = useState<SequenceData | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved timeline + workflow names
  useEffect(() => {
    if (!portalId) { setLoading(false); return; }

    Promise.all([
      fetch(`/api/analyst/sequence/save?portalId=${portalId}`).then(r => r.json()),
      fetch(`/api/analyst/workflows?portalId=${portalId}`).then(r => r.json()),
    ]).then(([timelineData, wfData]) => {
      if (timelineData.sequence) {
        setSequenceData(timelineData.sequence);
        setGeneratedAt(timelineData.generatedAt);
      }
      setWorkflows((wfData.workflows || []).map((w: any) => ({
        id: w.id, name: w.name, objectType: w.objectType, status: w.status,
      })));
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [portalId]);

  const getWorkflowName = (id: string) => workflows.find(w => w.id === id)?.name || id;
  const getWorkflowStatus = (id: string) => workflows.find(w => w.id === id)?.status || "UNKNOWN";
  const getWorkflowType = (id: string) => (workflows.find(w => w.id === id)?.objectType || "contact").toLowerCase();

  const runTimeline = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const wfRes = await fetch(`/api/analyst/workflows?portalId=${portalId}`);
      if (!wfRes.ok) { setError("Failed to load workflows"); setRunning(false); return; }
      const wfData = await wfRes.json();
      const payload = (wfData.workflows || []).map((w: any) => ({
        id: w.id, name: w.name, objectType: w.objectType,
        enrollmentCriteria: w.enrollmentCriteria, definition: w.definition,
      }));

      if (payload.length === 0) { setError("No workflows found. Sync first."); setRunning(false); return; }

      const res = await fetch("/api/analyst/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflows: payload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `AI error (${res.status})`);
        setRunning(false);
        return;
      }

      const data = await res.json();
      if (!data.sequence?.sequence?.length) { setError("AI returned empty results. Try again."); setRunning(false); return; }

      setSequenceData(data.sequence);
      setGeneratedAt(new Date().toISOString());

      // Save
      fetch("/api/analyst/sequence/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId, sequence: data.sequence }),
      }).catch(() => {});
    } catch {
      setError("Network error. Try again.");
    } finally {
      setRunning(false);
    }
  }, [portalId]);

  if (!portalId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg mb-2">No portal connected</p>
            <a href="/connect" className="text-blue-600 hover:text-blue-700 font-medium text-sm">Connect HubSpot →</a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar portalId={portalId} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Flow Timeline</h1>
            <p className="text-sm text-gray-500 mt-1">
              {generatedAt
                ? `Last mapped ${new Date(generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : "Map the execution order of your automations"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/map?portal=${portalId}`}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Open Map
            </Link>
            <button onClick={runTimeline} disabled={running}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
              {running ? (
                <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" /> Mapping...</>
              ) : sequenceData ? (
                <>Rerun Timeline</>
              ) : (
                <>Generate Timeline</>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-sm font-medium text-red-800 mb-2">{error}</p>
            <button onClick={runTimeline} className="text-sm text-red-600 hover:text-red-700 font-medium">Try again →</button>
          </div>
        ) : running ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-300 border-t-violet-600 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900 mb-1">Tracing trigger chains...</p>
              <p className="text-xs text-gray-500">Mapping property writes → enrollment criteria</p>
            </div>
          </div>
        ) : !sequenceData ? (
          // Empty state — no timeline yet
          <div className="flex justify-center py-20">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">No timeline yet</h2>
              <p className="text-sm text-gray-500 mb-6">
                AI will trace the causal chains between your {workflows.length} workflows — matching property writes to enrollment criteria to determine exact execution order.
              </p>
              <button onClick={runTimeline}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:shadow-md transition-all"
                style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
                Generate Flow Timeline
              </button>
            </div>
          </div>
        ) : (
          // Timeline content
          <div className="space-y-6">
            {/* Summary */}
            {sequenceData.lifecycle_summary && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4">
                <p className="text-sm text-violet-800 leading-relaxed">{sequenceData.lifecycle_summary}</p>
              </div>
            )}

            {/* Stats bar */}
            <div className="flex flex-wrap gap-3">
              {(() => {
                const stageSet = new Set(sequenceData.sequence.map(s => s.stage));
                const chains = sequenceData.sequence.filter(s => s.triggeredBy).length;
                return (
                  <>
                    <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                      {sequenceData.sequence.length} workflows
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                      {stageSet.size} stages
                    </span>
                    <span className="text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5">
                      {chains} causal chain{chains !== 1 ? "s" : ""}
                    </span>
                  </>
                );
              })()}
            </div>

            {/* Timeline */}
            {(() => {
              const sorted = [...sequenceData.sequence].sort((a, b) => a.position - b.position);
              let currentStage = "";

              return (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />

                  <div className="space-y-1">
                    {sorted.map((item, idx) => {
                      const showStage = item.stage !== currentStage;
                      currentStage = item.stage;
                      const sc = STAGE_COLORS[item.stage] || DEFAULT_STAGE_COLOR;
                      const name = getWorkflowName(item.workflowId);
                      const status = getWorkflowStatus(item.workflowId);
                      const objType = getWorkflowType(item.workflowId);

                      return (
                        <div key={item.workflowId}>
                          {/* Stage header */}
                          {showStage && (
                            <div className="flex items-center gap-3 pt-4 pb-2 pl-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0"
                                style={{ backgroundColor: sc.bg, border: `2px solid ${sc.border}` }}>
                                <span className="text-xs font-bold" style={{ color: sc.text }}>
                                  {(() => {
                                    const stageWorkflows = sorted.filter(s => s.stage === item.stage);
                                    return stageWorkflows[0] === item ? sorted.indexOf(item) + 1 : "";
                                  })()}
                                </span>
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                {item.stage}
                              </span>
                            </div>
                          )}

                          {/* Workflow card */}
                          <div className="flex items-start gap-3 pl-2">
                            {/* Position dot */}
                            <div className="w-8 flex justify-center flex-shrink-0 pt-3">
                              <div className="w-3 h-3 rounded-full z-10 border-2 border-white shadow-sm"
                                style={{ backgroundColor: sc.text }} />
                            </div>

                            {/* Card */}
                            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-gray-300 transition-all">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-400 tabular-nums">#{item.position}</span>
                                    <h3 className="text-sm font-semibold text-gray-900 truncate">{name}</h3>
                                  </div>
                                  <p className="text-xs text-gray-500 leading-relaxed">{item.reasoning}</p>
                                  {item.triggerReason && (
                                    <p className="text-xs text-violet-600 mt-1 font-medium">{item.triggerReason}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : status === "ERRORING" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                                    {status.toLowerCase()}
                                  </span>
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                                    backgroundColor: `${OBJ_COLORS[objType] || "#6B7280"}15`,
                                    color: OBJ_COLORS[objType] || "#6B7280",
                                  }}>
                                    {objType}
                                  </span>
                                </div>
                              </div>

                              {/* Trigger chain */}
                              {(item.triggeredBy || (item.triggers && item.triggers.length > 0)) && (
                                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                                  {item.triggeredBy && (
                                    <span className="text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 flex items-center gap-1">
                                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                                      {getWorkflowName(item.triggeredBy)}
                                    </span>
                                  )}
                                  {item.triggers?.map(tId => (
                                    <span key={tId} className="text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-md px-2 py-1 flex items-center gap-1">
                                      <svg className="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                      {getWorkflowName(tId)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
