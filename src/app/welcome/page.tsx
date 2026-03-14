"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Phase = "syncing" | "done" | "error";

interface SyncStatus {
  status: string;
  message?: string;
  progress?: number;
  total?: number;
  percent?: number;
  lastSyncedAt?: string;
  portalName?: string;
}

export default function WelcomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const portalId = searchParams.get("portal") || "";

  const [phase, setPhase] = useState<Phase>("syncing");
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [portalName, setPortalName] = useState<string>("");
  const [workflowCount, setWorkflowCount] = useState(0);
  const [depCount, setDepCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [step, setStep] = useState(0);

  // Poll sync status
  const pollSync = useCallback(async () => {
    if (!portalId) return;
    try {
      const res = await fetch(`/api/sync-status?portalId=${portalId}`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);

      if (data.portalName) setPortalName(data.portalName);

      const isComplete = data.status === "COMPLETED" || 
        (data.status === "SYNCING" && data.progress > 0 && data.total > 0 && data.progress >= data.total);
      
      // If sync hasn't started yet (null/IDLE), keep waiting
      // If status is unknown but lastSyncedAt exists, treat as complete
      if (!isComplete && !data.status && data.lastSyncedAt) {
        setPhase("done");
        setShowConfetti(true);
        setTimeout(() => setStep(1), 800);
        setTimeout(() => setStep(2), 1600);
        setTimeout(() => setStep(3), 2400);
        return;
      }

      if (isComplete) {
        setPhase("done");
        setShowConfetti(true);

        // Fetch final stats
        const statsRes = await fetch(`/api/graph?portalId=${portalId}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setWorkflowCount(statsData.stats?.totalWorkflows || statsData.nodes?.length || 0);
          setDepCount(statsData.stats?.totalDependencies || statsData.edges?.length || 0);
          setConflictCount(statsData.stats?.totalConflicts || 0);
        }

        // Auto-advance steps
        setTimeout(() => setStep(1), 800);
        setTimeout(() => setStep(2), 1600);
        setTimeout(() => setStep(3), 2400);

        return; // Stop polling
      }

      if (data.status === "FAILED") {
        setPhase("error");
        return;
      }

      // Status is null or unexpected — if portal has been synced before, treat as done
      if (!data.status || (data.status !== "SYNCING" && data.lastSyncedAt)) {
        setPhase("done");
        setShowConfetti(true);
        const statsRes = await fetch(`/api/graph?portalId=${portalId}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setWorkflowCount(statsData.stats?.totalWorkflows || statsData.nodes?.length || 0);
          setDepCount(statsData.stats?.totalDependencies || statsData.edges?.length || 0);
          setConflictCount(statsData.stats?.totalConflicts || 0);
        }
        if (data.portalName) setPortalName(data.portalName);
        setTimeout(() => setStep(1), 800);
        setTimeout(() => setStep(2), 1600);
        setTimeout(() => setStep(3), 2400);
        return;
      }
      
    } catch {}
  }, [portalId]);

  useEffect(() => {
    if (!portalId || phase !== "syncing") return;
    pollSync();
    const interval = setInterval(pollSync, 2000);
    return () => clearInterval(interval);
  }, [portalId, pollSync, phase]);

  // Stop polling when done
  useEffect(() => {
    if (phase === "done" || phase === "error") {
      // Cleanup handled by return in the interval effect
    }
  }, [phase]);

  if (!portalId) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">No portal found</p>
          <Link href="/connect" className="text-sm font-medium text-blue-600">Connect HubSpot →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Minimal header */}
      <header className="h-12 border-b border-gray-200 bg-white flex items-center px-5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900">Entflow</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full">

          {/* ── SYNCING ── */}
          {phase === "syncing" && (
            <div className="text-center">
              {/* Animated rings */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping opacity-20" />
                <div className="absolute inset-2 rounded-full border-2 border-blue-300 animate-ping opacity-30" style={{ animationDelay: "0.5s" }} />
                <div className="absolute inset-0 rounded-full border-2 border-blue-100 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
                </div>
              </div>

              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                {status?.syncedWorkflows
                  ? `Syncing workflows...`
                  : "Connecting to HubSpot..."}
              </h1>

              {status?.progress !== undefined && status?.total ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    {status.progress} of {status.total} workflows
                  </p>
                  {/* Progress bar */}
                  <div className="w-64 mx-auto h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${status.percent || 0}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  {status?.message || "Pulling your workflow data..."}
                </p>
              )}

              <p className="text-xs text-gray-400 mt-6">
                This usually takes 10-30 seconds
              </p>
            </div>
          )}

          {/* ── DONE ── */}
          {phase === "done" && (
            <div className="text-center">
              {/* Success checkmark */}
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className={`absolute inset-0 rounded-full bg-emerald-100 transition-transform duration-500 ${showConfetti ? "scale-100" : "scale-0"}`} />
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 delay-200 ${showConfetti ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>

              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                {portalName ? `${portalName} is ready` : "Your portal is ready"}
              </h1>
              <p className="text-sm text-gray-500 mb-8">
                We found {workflowCount} workflow{workflowCount !== 1 ? "s" : ""}, {depCount} dependenc{depCount !== 1 ? "ies" : "y"}{conflictCount > 0 ? `, and ${conflictCount} conflict${conflictCount !== 1 ? "s" : ""}` : ""}.
              </p>

              {/* Guided steps */}
              <div className="text-left space-y-3 mb-8">
                {[
                  { label: "Portal synced", detail: `${workflowCount} workflows mapped`, done: step >= 1 },
                  { label: "Dependencies traced", detail: `${depCount} cross-workflow links found`, done: step >= 2 },
                  { label: "Map ready", detail: "Visual workflow map is waiting for you", done: step >= 3 },
                ].map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${s.done ? "bg-white border-gray-200" : "bg-gray-50 border-transparent opacity-40"}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${s.done ? "bg-emerald-100" : "bg-gray-200"}`}>
                      {s.done ? (
                        <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.label}</p>
                      <p className="text-xs text-gray-500">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className={`space-y-3 transition-all duration-500 ${step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <Link href={`/map?portal=${portalId}`}
                  className="block w-full text-center px-6 py-3 rounded-lg font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors text-sm">
                  Open your workflow map →
                </Link>
                <Link href={`/dashboard?portal=${portalId}`}
                  className="block w-full text-center px-6 py-3 rounded-lg font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-sm">
                  Go to dashboard
                </Link>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {phase === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Sync failed</h1>
              <p className="text-sm text-gray-500 mb-6">
                {status?.message || "Something went wrong during the sync. This can happen with large portals — try again."}
              </p>
              <div className="space-y-3">
                <button onClick={() => { setPhase("syncing"); fetch(`/api/sync`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portalId }) }).catch(() => {}); }}
                  className="block w-full text-center px-6 py-3 rounded-lg font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors text-sm">
                  Retry sync
                </button>
                <Link href={`/dashboard?portal=${portalId}`}
                  className="block w-full text-center px-6 py-3 rounded-lg font-medium text-gray-600 text-sm hover:text-gray-800 transition-colors">
                  Go to dashboard anyway
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
