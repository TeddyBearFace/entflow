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

const STAGE_COLORS: Record<string, string> = {
  "Lead Capture": "#2563EB",
  "Data Enrichment": "#0891B2",
  "Lead Scoring": "#D97706",
  "Nurture": "#7C3AED",
  "Qualification": "#CA8A04",
  "Sales Handoff": "#EA580C",
  "Opportunity": "#DC2626",
  "Close Won": "#16A34A",
  "Onboarding": "#059669",
  "Retention": "#2563EB",
  "Re-engagement": "#E11D48",
  "Internal Ops": "#6B7280",
  "Notification": "#6B7280",
  "Data Management": "#6B7280",
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
    }).catch(() => setLoading(false));
  }, [portalId]);

  const getName = (id: string) => workflows.find(w => w.id === id)?.name || id;
  const getStatus = (id: string) => workflows.find(w => w.id === id)?.status || "UNKNOWN";
  const getType = (id: string) => (workflows.find(w => w.id === id)?.objectType || "contact").toLowerCase();

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
        setError(err.error || `Error (${res.status})`);
        setRunning(false);
        return;
      }
      const data = await res.json();
      if (!data.sequence?.sequence?.length) { setError("Empty results. Try again."); setRunning(false); return; }

      setSequenceData(data.sequence);
      setGeneratedAt(new Date().toISOString());
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
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        <NavBar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">No portal connected</p>
            <Link href="/connect" className="text-sm font-medium text-blue-600 hover:text-blue-700">Connect HubSpot →</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <NavBar portalId={portalId} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Flow Timeline</h1>
            <p className="text-sm text-gray-500 mt-1">
              {generatedAt
                ? `Last mapped ${new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : "Map the execution order of your automations"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/map?portal=${portalId}`}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
              Open map
            </Link>
            <button onClick={runTimeline} disabled={running}
              className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-1.5">
              {running ? (
                <><div className="animate-spin rounded-full h-3 w-3 border border-gray-600 border-t-white" /> Mapping...</>
              ) : sequenceData ? "Rerun" : "Generate"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900" />
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-lg p-5 text-center">
            <p className="text-sm text-red-800 mb-2">{error}</p>
            <button onClick={runTimeline} className="text-xs font-medium text-gray-600 hover:text-gray-800">Try again →</button>
          </div>
        ) : running ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">Tracing trigger chains...</p>
              <p className="text-xs text-gray-500 mt-1">Matching property writes to enrollment criteria</p>
            </div>
          </div>
        ) : !sequenceData ? (
          <div className="flex justify-center py-20">
            <div className="text-center max-w-sm">
              <p className="text-sm font-medium text-gray-900 mb-1">No timeline yet</p>
              <p className="text-xs text-gray-500 mb-5">
                AI will trace causal chains between your {workflows.length} workflows to determine execution order.
              </p>
              <button onClick={runTimeline}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors">
                Generate timeline
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            {sequenceData.lifecycle_summary && (
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <p className="text-sm text-gray-600 leading-relaxed">{sequenceData.lifecycle_summary}</p>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-4 text-xs text-gray-500">
              <span>{sequenceData.sequence.length} workflows</span>
              <span>{new Set(sequenceData.sequence.map(s => s.stage)).size} stages</span>
              <span>{sequenceData.sequence.filter(s => s.triggeredBy).length} chains</span>
            </div>

            {/* Timeline */}
            {(() => {
              const sorted = [...sequenceData.sequence].sort((a, b) => a.position - b.position);
              let currentStage = "";

              return (
                <div className="space-y-1">
                  {sorted.map((item) => {
                    const showStage = item.stage !== currentStage;
                    currentStage = item.stage;
                    const stageColor = STAGE_COLORS[item.stage] || "#6B7280";
                    const name = getName(item.workflowId);
                    const status = getStatus(item.workflowId);
                    const objType = getType(item.workflowId);

                    return (
                      <div key={item.workflowId}>
                        {showStage && (
                          <div className="flex items-center gap-2 pt-4 pb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColor }} />
                            <span className="text-xs font-medium" style={{ color: stageColor }}>{item.stage}</span>
                            <div className="flex-1 h-px bg-gray-100" />
                          </div>
                        )}

                        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 ml-4 hover:border-gray-300 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-400 tabular-nums w-5">#{item.position}</span>
                                <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
                                <span className={`inline-flex items-center gap-1 text-[10px] ${status === "ACTIVE" ? "text-emerald-600" : "text-gray-400"}`}>
                                  <span className={`w-1 h-1 rounded-full ${status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-300"}`} />
                                  {status.toLowerCase()}
                                </span>
                                <span className="text-[10px] text-gray-400">{objType}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 ml-7">{item.reasoning}</p>
                              {item.triggerReason && (
                                <p className="text-xs text-blue-600 mt-0.5 ml-7">{item.triggerReason}</p>
                              )}
                            </div>
                          </div>

                          {(item.triggeredBy || (item.triggers && item.triggers.length > 0)) && (
                            <div className="flex flex-wrap gap-1.5 mt-2 ml-7">
                              {item.triggeredBy && (
                                <span className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                                  ← {getName(item.triggeredBy)}
                                </span>
                              )}
                              {item.triggers?.map(tId => (
                                <span key={tId} className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                  → {getName(tId)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
