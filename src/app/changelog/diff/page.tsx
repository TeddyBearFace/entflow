"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";

interface Snapshot {
  id: string;
  name: string;
  status: string;
  actionCount: number;
  actionsHash: string;
  enrollmentHash: string;
  createdAt: string;
  syncLogId: string | null;
}

interface FieldChange {
  field: string;
  previous: any;
  current: any;
}

interface ActionDiff {
  status: "added" | "removed" | "modified" | "unchanged";
  label: string;
  actionTypeId: string;
  key: string;
  previousFields?: Record<string, any>;
  currentFields?: Record<string, any>;
  fieldChanges?: FieldChange[];
}

interface DiffResult {
  from: { id: string; name: string; status: string; actionCount: number; createdAt: string };
  to: { id: string; name: string; status: string; actionCount: number; createdAt: string };
  nameChanged: boolean;
  statusChanged: boolean;
  enrollmentChanged: boolean;
  previousEnrollment: any;
  currentEnrollment: any;
  actionDiffs: ActionDiff[];
  summary: { added: number; removed: number; modified: number; unchanged: number };
}

interface Workflow {
  id: string;
  name: string;
  hubspotFlowId: string;
  status: string;
  objectType: string;
}

export default function DiffPage() {
  const searchParams = useSearchParams();
  const portalId = searchParams.get("portal") || "";
  const workflowId = searchParams.get("workflow") || "";

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [diffLoading, setDiffLoading] = useState(false);
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [showUnchanged, setShowUnchanged] = useState(false);

  // Load snapshots
  useEffect(() => {
    if (!portalId || !workflowId) return;
    setLoading(true);
    fetch(`/api/workflow-diff?portalId=${portalId}&workflowId=${workflowId}`)
      .then(r => r.json())
      .then(data => {
        setWorkflow(data.workflow);
        setSnapshots(data.snapshots || []);
        // Auto-select the two most recent snapshots
        if (data.snapshots?.length >= 2) {
          setFromId(data.snapshots[1].id);
          setToId(data.snapshots[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [portalId, workflowId]);

  // Load diff when selections change
  useEffect(() => {
    if (!fromId || !toId || fromId === toId) { setDiff(null); return; }
    setDiffLoading(true);
    fetch(`/api/workflow-diff?portalId=${portalId}&workflowId=${workflowId}&from=${fromId}&to=${toId}`)
      .then(r => r.json())
      .then(data => {
        setDiff(data.diff);
        setDiffLoading(false);
      })
      .catch(() => setDiffLoading(false));
  }, [portalId, workflowId, fromId, toId]);

  const visibleDiffs = useMemo(() => {
    if (!diff) return [];
    return showUnchanged ? diff.actionDiffs : diff.actionDiffs.filter(d => d.status !== "unchanged");
  }, [diff, showUnchanged]);

  if (!portalId || !workflowId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Missing portal or workflow ID</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar portalId={portalId} />

      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href={`/changelog?portal=${portalId}`} className="hover:text-blue-600 transition-colors">Changelog</Link>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            <span className="text-gray-900 font-medium">{workflow?.name || "Loading..."}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Workflow Diff</h2>
              <p className="text-xs text-gray-500 mt-0.5">Compare workflow versions across syncs</p>
            </div>
            {workflow && (
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${workflow.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {workflow.status.toLowerCase()}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {workflow.objectType.toLowerCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : snapshots.length < 2 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📸</p>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Not enough snapshots</h2>
            <p className="text-gray-500">This workflow needs at least 2 syncs to compare versions. Snapshots: {snapshots.length}</p>
          </div>
        ) : (
          <>
            {/* Snapshot selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Before (older)</label>
                  <select value={fromId} onChange={e => setFromId(e.target.value)}
                    className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-red-50/50 focus:outline-none focus:ring-2 focus:ring-red-200">
                    {snapshots.map(s => (
                      <option key={s.id} value={s.id} disabled={s.id === toId}>
                        {new Date(s.createdAt).toLocaleString()} — {s.actionCount} actions — {s.status.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">After (newer)</label>
                  <select value={toId} onChange={e => setToId(e.target.value)}
                    className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-200">
                    {snapshots.map(s => (
                      <option key={s.id} value={s.id} disabled={s.id === fromId}>
                        {new Date(s.createdAt).toLocaleString()} — {s.actionCount} actions — {s.status.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Diff content */}
            {diffLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : diff ? (
              <div className="space-y-4">
                {/* Summary bar */}
                <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {diff.summary.added > 0 && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        {diff.summary.added} added
                      </span>
                    )}
                    {diff.summary.removed > 0 && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-red-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        {diff.summary.removed} removed
                      </span>
                    )}
                    {diff.summary.modified > 0 && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        {diff.summary.modified} modified
                      </span>
                    )}
                    {diff.summary.unchanged > 0 && (
                      <span className="text-sm text-gray-400">{diff.summary.unchanged} unchanged</span>
                    )}
                    {diff.summary.added === 0 && diff.summary.removed === 0 && diff.summary.modified === 0 && !diff.nameChanged && !diff.statusChanged && !diff.enrollmentChanged && (
                      <span className="text-sm text-gray-500">No differences found</span>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                    <input type="checkbox" checked={showUnchanged} onChange={e => setShowUnchanged(e.target.checked)} className="rounded" />
                    Show unchanged
                  </label>
                </div>

                {/* Metadata changes */}
                {(diff.nameChanged || diff.statusChanged) && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Workflow Metadata</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {diff.nameChanged && (
                        <div className="px-5 py-3 flex items-center gap-4">
                          <span className="text-xs font-medium text-gray-400 w-16">Name</span>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm bg-red-50 text-red-800 px-2 py-0.5 rounded line-through">{diff.from.name}</span>
                            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                            <span className="text-sm bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">{diff.to.name}</span>
                          </div>
                        </div>
                      )}
                      {diff.statusChanged && (
                        <div className="px-5 py-3 flex items-center gap-4">
                          <span className="text-xs font-medium text-gray-400 w-16">Status</span>
                          <div className="flex items-center gap-2 flex-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.from.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                              {diff.from.status.toLowerCase()}
                            </span>
                            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.to.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                              {diff.to.status.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Enrollment changes */}
                {diff.enrollmentChanged && (
                  <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-amber-100 bg-amber-50">
                      <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">📥 Enrollment Criteria Changed</h3>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      <div className="p-4">
                        <p className="text-[10px] font-bold text-red-400 uppercase mb-2">Before</p>
                        <pre className="text-[11px] text-gray-600 font-mono bg-red-50 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(diff.previousEnrollment, null, 2)?.slice(0, 800) || "None"}
                        </pre>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase mb-2">After</p>
                        <pre className="text-[11px] text-gray-600 font-mono bg-emerald-50 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(diff.currentEnrollment, null, 2)?.slice(0, 800) || "None"}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action diffs */}
                {visibleDiffs.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Actions ({diff.actionDiffs.length} total)</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {visibleDiffs.map((ad, i) => (
                        <ActionDiffRow key={`${ad.key}-${i}`} diff={ad} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Snapshot timeline */}
            <div className="mt-8">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Snapshot History ({snapshots.length})</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {snapshots.map((s, i) => {
                    const isFrom = s.id === fromId;
                    const isTo = s.id === toId;
                    return (
                      <div key={s.id} className={`px-5 py-3 flex items-center gap-4 transition-colors ${isFrom ? "bg-red-50/50" : isTo ? "bg-emerald-50/50" : "hover:bg-gray-50"}`}>
                        <div className="flex-shrink-0 w-6 text-center">
                          {isFrom && <span className="text-[10px] font-bold text-red-500 bg-red-100 rounded px-1">OLD</span>}
                          {isTo && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 rounded px-1">NEW</span>}
                          {!isFrom && !isTo && <span className="text-xs text-gray-300">#{snapshots.length - i}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                          <p className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleString()} · {s.actionCount} actions · {s.status.toLowerCase()}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setFromId(s.id)} disabled={s.id === toId}
                            className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${isFrom ? "bg-red-200 text-red-800" : "text-gray-500 hover:bg-red-50 hover:text-red-600"} disabled:opacity-30`}>
                            Set as Before
                          </button>
                          <button onClick={() => setToId(s.id)} disabled={s.id === fromId}
                            className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${isTo ? "bg-emerald-200 text-emerald-800" : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-600"} disabled:opacity-30`}>
                            Set as After
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// --- Action Diff Row Component ---

function ActionDiffRow({ diff }: { diff: ActionDiff }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    added: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "➕", text: "text-emerald-800", badge: "bg-emerald-100 text-emerald-700" },
    removed: { bg: "bg-red-50", border: "border-red-200", icon: "➖", text: "text-red-800", badge: "bg-red-100 text-red-700" },
    modified: { bg: "bg-amber-50", border: "border-amber-200", icon: "🔧", text: "text-amber-800", badge: "bg-amber-100 text-amber-700" },
    unchanged: { bg: "bg-white", border: "border-gray-100", icon: "•", text: "text-gray-500", badge: "bg-gray-100 text-gray-500" },
  };

  const config = statusConfig[diff.status];
  const hasDetails = diff.status === "modified" && diff.fieldChanges && diff.fieldChanges.length > 0;

  // Build label detail
  let detail = diff.label;
  const fields = diff.currentFields || diff.previousFields || {};
  if (fields.property_name) detail += ` → ${fields.property_name}`;
  if (fields.content_id) detail += ` → email ${fields.content_id}`;
  if (fields.flow_id) detail += ` → workflow ${fields.flow_id}`;

  return (
    <div className={`${config.bg}`}>
      <button onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full text-left px-5 py-2.5 flex items-center gap-3 ${hasDetails ? "cursor-pointer" : "cursor-default"}`}>
        <span className="text-sm flex-shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={`text-sm font-medium ${config.text}`}>{detail}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${config.badge}`}>{diff.status}</span>
        </div>
        {hasDetails && (
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        )}
      </button>
      {expanded && diff.fieldChanges && (
        <div className="px-5 pb-3 ml-8">
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-1.5 font-bold text-gray-400 uppercase tracking-wider">Field</th>
                  <th className="px-3 py-1.5 font-bold text-red-400 uppercase tracking-wider">Before</th>
                  <th className="px-3 py-1.5 font-bold text-emerald-500 uppercase tracking-wider">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {diff.fieldChanges.map((fc, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono text-gray-600 align-top">{fc.field.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 font-mono text-red-700 bg-red-50/50 break-all align-top max-w-[250px]">
                      {formatFieldValue(fc.previous)}
                    </td>
                    <td className="px-3 py-2 font-mono text-emerald-700 bg-emerald-50/50 break-all align-top max-w-[250px]">
                      {formatFieldValue(fc.current)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFieldValue(val: any): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "object") {
    const s = JSON.stringify(val);
    return s.length > 120 ? s.slice(0, 120) + "…" : s;
  }
  const s = String(val);
  return s.length > 120 ? s.slice(0, 120) + "…" : s;
}
