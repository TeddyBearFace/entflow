"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconSync } from "@/components/icons";

interface SyncStatus {
  status: string;
  progress: number;
  total: number;
  message: string;
  percent: number;
  lastSyncedAt: string | null;
}

interface SyncBarProps {
  portalId: string;
  planTier?: string;
  lastSyncedAt?: string | null;
  initialStatus?: string;
  initialMessage?: string | null;
  onSyncComplete?: () => void;
  /** Compact mode for embedding in map toolbar */
  compact?: boolean;
}

const FREE_COOLDOWN_MS = 2 * 60 * 60 * 1000;

function formatCountdown(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Unified sync bar used on both dashboard and map.
 *
 * States:
 * - idle: shows "Sync Now" button + last sync time
 * - syncing: shows progress bar with real percentage
 * - failed: shows error with retry button
 * - disconnected: shows reconnect prompt
 * - cooldown: shows countdown (free tier)
 */
export default function SyncBar({
  portalId,
  planTier,
  lastSyncedAt: initialLastSynced,
  initialStatus,
  initialMessage,
  onSyncComplete,
  compact = false,
}: SyncBarProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [phase, setPhase] = useState<"idle" | "syncing" | "done">(
    initialStatus === "SYNCING" ? "syncing" : "idle"
  );
  const [cooldownMs, setCooldownMs] = useState(0);
  const [lastSynced, setLastSynced] = useState(initialLastSynced || null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const doneTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isFree = !planTier || planTier === "FREE";

  // Calculate cooldown
  const updateCooldown = useCallback(() => {
    if (!isFree || !lastSynced) {
      setCooldownMs(0);
      return;
    }
    const elapsed = Date.now() - new Date(lastSynced).getTime();
    setCooldownMs(Math.max(0, FREE_COOLDOWN_MS - elapsed));
  }, [isFree, lastSynced]);

  // Poll sync status
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/sync-status?portalId=${portalId}`);
      if (!res.ok) return;
      const data: SyncStatus = await res.json();
      setSyncStatus(data);

      if (data.status === "SYNCING") {
        setPhase("syncing");
      } else if (data.status === "COMPLETED" || data.status === "FAILED") {
        if (data.lastSyncedAt) setLastSynced(data.lastSyncedAt);
        setPhase("done");
      }
    } catch {}
  }, [portalId]);

  // Unified polling — always runs at 2s
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    let active = true;

    const tick = async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/sync-status?portalId=${portalId}`);
        if (!res.ok || !active) return;
        const data: SyncStatus = await res.json();
        setSyncStatus(data);

        if (data.lastSyncedAt) {
          setLastSynced(data.lastSyncedAt);
          if (isFree) {
            const elapsed = Date.now() - new Date(data.lastSyncedAt).getTime();
            setCooldownMs(Math.max(0, FREE_COOLDOWN_MS - elapsed));
          }
        }

        if (data.status === "SYNCING" && phaseRef.current !== "syncing") {
          setPhase("syncing");
        } else if ((data.status === "COMPLETED" || data.status === "FAILED") && phaseRef.current === "syncing") {
          setPhase("done");
        }
      } catch {}
    };

    tick();
    const interval = setInterval(tick, 2000);
    return () => { active = false; clearInterval(interval); };
  }, [portalId, isFree]);

  // Handle "done" phase — notify parent, then go idle
  useEffect(() => {
    if (phase !== "done") return;
    updateCooldown();
    const timeout = setTimeout(() => {
      setPhase("idle");
      onSyncComplete?.();
    }, 1500);
    return () => clearTimeout(timeout);
  }, [phase, onSyncComplete, updateCooldown]);

  // Cooldown ticker
  useEffect(() => {
    if (!isFree || cooldownMs <= 0) return;
    cooldownRef.current = setInterval(updateCooldown, 30000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [isFree, cooldownMs, updateCooldown]);

  // Trigger sync
  const triggerSync = useCallback(async () => {
    if (phase === "syncing") return;
    setPhase("syncing");
    setSyncStatus(null);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId }),
      });
    } catch (err) {
      console.error("Sync trigger failed:", err);
    }
  }, [portalId, phase]);

  const onCooldown = isFree && cooldownMs > 0;
  const isDisconnected =
    syncStatus?.status === "FAILED" &&
    syncStatus?.message?.includes("disconnected");
  const isFailed =
    phase === "done" &&
    syncStatus?.status === "FAILED" &&
    !isDisconnected;
  const isComplete = phase === "done" && syncStatus?.status === "COMPLETED";
  const isSyncing = phase === "syncing";

  const percent = syncStatus?.percent || 0;
  const progress = syncStatus?.progress || 0;
  const total = syncStatus?.total || 0;
  const message = syncStatus?.message || "Starting sync...";

  // ── Disconnected ────────────────────────────────────────────
  if (isDisconnected) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl ${compact ? "text-xs" : ""}`}>
        <span className="text-lg">🔌</span>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-red-900 ${compact ? "text-xs" : "text-sm"}`}>HubSpot Disconnected</p>
          {!compact && (
            <p className="text-xs text-red-700 mt-0.5">Reconnect to resume syncing.</p>
          )}
        </div>
        <Link
          href="/api/auth/hubspot"
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-orange-500 hover:shadow-md transition-all"
        >
          Reconnect
        </Link>
      </div>
    );
  }

  // ── Syncing ─────────────────────────────────────────────────
  if (isSyncing) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-xl overflow-hidden ${compact ? "" : ""}`}>
        {/* Top row: message + stats */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-blue-800 truncate ${compact ? "text-xs" : "text-sm"}`}>
              {message}
            </p>
          </div>
          {total > 0 && (
            <span className="text-xs font-mono text-blue-600 flex-shrink-0 tabular-nums">
              {progress}/{total}
            </span>
          )}
          {percent > 0 && (
            <span className="text-xs font-bold text-blue-700 flex-shrink-0 tabular-nums">
              {percent}%
            </span>
          )}
        </div>
        {/* Progress bar — full width, fixed height, never changes container size */}
        <div className="h-1.5 bg-blue-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
      </div>
    );
  }

  // ── Just completed ──────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <p className={`font-medium text-emerald-800 ${compact ? "text-xs" : "text-sm"}`}>
          Sync complete — {total} workflow{total !== 1 ? "s" : ""} synced
        </p>
      </div>
    );
  }

  // ── Failed ──────────────────────────────────────────────────
  if (isFailed) {
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl ${compact ? "text-xs" : ""}`}>
        <span className="text-base">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-amber-900 ${compact ? "text-xs" : "text-sm"}`}>Sync failed</p>
          {!compact && syncStatus?.message && (
            <p className="text-xs text-amber-700 mt-0.5 truncate">{syncStatus.message}</p>
          )}
        </div>
        <button
          onClick={triggerSync}
          className="flex-shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Idle ────────────────────────────────────────────────────
  return (
    <div className={`flex items-center gap-2 ${compact ? "px-3 py-1.5" : "px-4 py-2.5"} bg-gray-50 border border-gray-200 rounded-xl`}>
      <svg className={`${compact ? "w-3 h-3" : "w-4 h-4"} text-gray-400 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span className={`flex-1 ${compact ? "text-[10px]" : "text-sm"} text-gray-500 truncate`}>
        {onCooldown
          ? <>Sync in {formatCountdown(cooldownMs)}</>
          : lastSynced
            ? <>Synced {timeAgo(lastSynced)}</>
            : "Ready to sync"
        }
      </span>
      <button
        onClick={triggerSync}
        disabled={onCooldown}
        className={`flex-shrink-0 font-semibold rounded-md transition-colors ${
          compact ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1.5"
        } ${onCooldown ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}`}
      >
        {onCooldown ? `⏳` : "Sync"}
      </button>
    </div>
  );
}
