"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SyncStatus {
  status: string;
  progress: number;
  total: number;
  message: string;
  percent: number;
  lastSyncedAt: string | null;
}

interface SyncProgressProps {
  portalId: string;
  onComplete?: () => void;
  compact?: boolean;
}

/**
 * State machine:
 * WAITING → polling, haven't seen SYNCING yet (show "Starting sync...")
 * ACTIVE  → seen SYNCING at least once (show progress)
 * DONE    → was ACTIVE, now see COMPLETED/FAILED (fire onComplete, hide)
 */
export default function SyncProgress({ portalId, onComplete, compact = false }: SyncProgressProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [phase, setPhase] = useState<"WAITING" | "ACTIVE" | "DONE">("WAITING");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const firedComplete = useRef(false);
  const activeStartRef = useRef<number>(0);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/sync-status?portalId=${portalId}`);
      if (!res.ok) return;
      const data: SyncStatus = await res.json();
      setStatus(data);

      if (data.status === "SYNCING") {
        setPhase(prev => {
          if (prev === "WAITING") activeStartRef.current = Date.now();
          return "ACTIVE";
        });
        // If stuck syncing for over 5 minutes (matches server stale detection), treat as failed
        if (activeStartRef.current > 0 && Date.now() - activeStartRef.current > 300000) {
          setPhase("DONE");
        }
      } else if (data.status === "COMPLETED" || data.status === "FAILED") {
        // Transition to DONE from either WAITING or ACTIVE
        setPhase("DONE");
      }
    } catch {
      // Silent fail
    }
  }, [portalId]);

  // Start polling
  useEffect(() => {
    firedComplete.current = false;
    setPhase("WAITING");
    setStatus(null);
    poll();
    intervalRef.current = setInterval(poll, 800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [poll, portalId]);

  // Handle DONE phase
  useEffect(() => {
    if (phase === "DONE" && !firedComplete.current) {
      firedComplete.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Small delay so user sees "Sync complete!" before hiding
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  // Give up waiting after 15 seconds (sync should have started by then)
  useEffect(() => {
    if (phase !== "WAITING") return;
    const timeout = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase("DONE");
    }, 15000);
    return () => clearTimeout(timeout);
  }, [phase]);

  // Don't render when done
  if (phase === "DONE") return null;

  const isSyncing = phase === "ACTIVE";
  const msg = isSyncing ? (status?.message || "Syncing...") : "Starting sync...";

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-300 border-t-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-blue-800 truncate">{msg}</span>
            {isSyncing && status && status.total > 0 && (
              <span className="text-[10px] text-blue-600 font-mono flex-shrink-0">{status.progress}/{status.total}</span>
            )}
          </div>
          {isSyncing && status && status.total > 0 && (
            <div className="h-1 bg-blue-100 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${status.percent}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="animate-spin rounded-full h-6 w-6 border-[3px] border-blue-200 border-t-blue-600" />
        <div>
          <h3 className="text-sm font-bold text-gray-900">Syncing with HubSpot</h3>
          <p className="text-xs text-gray-500 mt-0.5">{msg}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${isSyncing ? Math.max(status?.percent || 0, 2) : 2}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {isSyncing && status && status.total > 0
              ? `${status.progress} of ${status.total} workflows`
              : "Connecting to HubSpot..."}
          </span>
          {isSyncing && status && (status.percent || 0) > 0 && (
            <span className="text-xs font-bold text-blue-600">{status.percent}%</span>
          )}
        </div>
      </div>

      {/* Steps indicator */}
      <div className="mt-4 space-y-1.5">
        {[
          { label: "Discover workflows", done: isSyncing && (status?.total || 0) > 0 },
          { label: "Fetch workflow details", done: isSyncing && (status?.percent || 0) >= 90 },
          { label: "Parse actions & dependencies", done: isSyncing && /Parsing|Detecting|Saving|Generating|complete/i.test(status?.message || "") },
          { label: "Detect conflicts", done: isSyncing && /Saving|Generating|complete/i.test(status?.message || "") },
          { label: "Save to database", done: isSyncing && /Generating|complete/i.test(status?.message || "") },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            {step.done ? (
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : isSyncing && status?.message?.toLowerCase().includes(step.label.toLowerCase().split(" ")[0]) ? (
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <div className="animate-spin rounded-full h-3 w-3 border-[2px] border-blue-200 border-t-blue-600" />
              </div>
            ) : (
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-gray-200" />
              </div>
            )}
            <span className={`text-xs ${step.done ? "text-gray-700" : "text-gray-400"}`}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
