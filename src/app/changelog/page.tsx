"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";

interface ChangeEntry {
  id: string; workflowId: string; hubspotFlowId: string; workflowName: string;
  changeType: string; severity: string; summary: string; details?: string;
  previousValue?: string; newValue?: string; createdAt: string;
}

const CHANGE_ICONS: Record<string, string> = {
  WORKFLOW_CREATED: "🆕", STATUS_CHANGE: "🔄", RENAMED: "✏️",
  ACTION_ADDED: "➕", ACTION_REMOVED: "➖", ACTION_MODIFIED: "🔧",
  ACTIONS_REORDERED: "↕️", ENROLLMENT_CHANGED: "📥", WORKFLOW_DELETED: "🗑️",
};
const CHANGE_COLORS: Record<string, string> = {
  WORKFLOW_CREATED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  STATUS_CHANGE: "bg-blue-100 text-blue-800 border-blue-200",
  RENAMED: "bg-gray-100 text-gray-800 border-gray-200",
  ACTION_ADDED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ACTION_REMOVED: "bg-red-100 text-red-800 border-red-200",
  ACTION_MODIFIED: "bg-amber-100 text-amber-800 border-amber-200",
  ACTIONS_REORDERED: "bg-purple-100 text-purple-800 border-purple-200",
  ENROLLMENT_CHANGED: "bg-orange-100 text-orange-800 border-orange-200",
};

export default function ChangelogPage() {
  const searchParams = useSearchParams();
  const portalId = searchParams.get("portal") || "";
  const [entries, setEntries] = useState<ChangeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [changeTypes, setChangeTypes] = useState<Array<{ changeType: string; _count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!portalId) return;
    setLoading(true);
    const params = new URLSearchParams({ portalId, limit: "100" });
    if (filter) params.set("changeType", filter);
    fetch(`/api/changelog?${params}`).then(r => r.json()).then(data => {
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setChangeTypes(data.changeTypes || []);
      setLoading(false);
    });
  }, [portalId, filter]);

  // Group entries by date
  const grouped = new Map<string, ChangeEntry[]>();
  for (const e of entries) {
    const date = new Date(e.createdAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(e);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar portalId={portalId} />
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Workflow Changelog</h2>
            <p className="text-xs text-gray-500 mt-0.5">{total} change{total !== 1 ? "s" : ""} tracked across syncs</p>
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
            <option value="">All changes</option>
            {changeTypes.map(ct => (
              <option key={ct.changeType} value={ct.changeType}>
                {CHANGE_ICONS[ct.changeType] || "📋"} {ct.changeType.replace(/_/g, " ").toLowerCase()} ({ct._count})
              </option>
            ))}
          </select>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📋</p>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No changes recorded yet</h2>
            <p className="text-gray-500">Changes will appear here after your next sync. The changelog tracks workflow modifications between syncs.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {[...grouped.entries()].map(([date, dayEntries]) => (
              <div key={date}>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 sticky top-0 bg-gray-50 py-2">{date}</h2>
                <div className="space-y-3">
                  {dayEntries.map(entry => {
                    const isExpanded = expanded.has(entry.id);
                    const hasDetails = entry.details || entry.previousValue || entry.newValue;
                    return (
                      <div key={entry.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                        <button
                          onClick={() => hasDetails && setExpanded(prev => { const n = new Set(prev); if (n.has(entry.id)) n.delete(entry.id); else n.add(entry.id); return n; })}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 ${hasDetails ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <span className="text-lg mt-0.5">{CHANGE_ICONS[entry.changeType] || "📋"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${CHANGE_COLORS[entry.changeType] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                {entry.changeType.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mt-1">{entry.summary}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              in <span className="font-medium">{entry.workflowName}</span>
                              {entry.workflowId && (
                                <Link href={`/changelog/diff?portal=${portalId}&workflow=${entry.workflowId}`}
                                  onClick={e => e.stopPropagation()}
                                  className="ml-1.5 text-blue-500 hover:text-blue-700 transition-colors inline-flex items-center gap-0.5"
                                  title="View diff">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                                  diff
                                </Link>
                              )}
                            </p>
                          </div>
                          {hasDetails && (
                            <svg className={`w-4 h-4 text-gray-400 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                          )}
                        </button>
                        {isExpanded && hasDetails && (
                          <div className="px-4 pb-3 pt-0 ml-9 border-t border-gray-100">
                            {entry.details && (
                              <div className="mt-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Details</p>
                                <div className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-2">{entry.details}</div>
                              </div>
                            )}
                            {entry.previousValue && (
                              <div className="mt-2">
                                <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Previous</p>
                                <div className="text-xs text-gray-600 font-mono bg-red-50 rounded-lg p-2 break-all">{entry.previousValue.slice(0, 300)}</div>
                              </div>
                            )}
                            {entry.newValue && (
                              <div className="mt-2">
                                <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Current</p>
                                <div className="text-xs text-gray-600 font-mono bg-emerald-50 rounded-lg p-2 break-all">{entry.newValue.slice(0, 300)}</div>
                              </div>
                            )}
                            {entry.workflowId && (
                              <div className="mt-3">
                                <Link href={`/changelog/diff?portal=${portalId}&workflow=${entry.workflowId}`}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                                  View full diff for this workflow
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
