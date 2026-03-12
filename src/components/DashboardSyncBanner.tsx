"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import SyncProgress from "@/components/SyncProgress";

interface Props {
  portalId: string;
  isSyncing: boolean;
  justConnected: boolean;
  syncStatus?: string;
  syncMessage?: string | null;
}

export default function DashboardSyncBanner({ portalId, isSyncing: serverSyncing, justConnected, syncStatus, syncMessage }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(serverSyncing || justConnected);
  const [syncKey, setSyncKey] = useState(0);

  const isDisconnected = syncStatus === "FAILED" && syncMessage?.includes("disconnected");
  const isFailed = syncStatus === "FAILED" && !isDisconnected;

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    setSyncKey(k => k + 1);
    try {
      await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portalId }) });
    } catch (err) {
      console.error("Sync trigger failed:", err);
    }
  }, [portalId]);

  const handleComplete = useCallback(() => {
    setSyncing(false);
    router.refresh();
  }, [router]);

  if (syncing) {
    return <div className="mb-6"><SyncProgress key={syncKey} portalId={portalId} onComplete={handleComplete} /></div>;
  }

  if (isDisconnected) {
    return (
      <div className="mb-6 px-5 py-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="disconnected">{"🔌"}</span>
          <div>
            <p className="text-sm font-bold text-red-900">HubSpot Disconnected</p>
            <p className="text-xs text-red-700 mt-0.5">Your HubSpot app has been disconnected. Reconnect to resume syncing.</p>
          </div>
        </div>
        <Link href="/api/auth/hubspot" className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-orange-500 hover:shadow-md transition-all">
          Reconnect HubSpot
        </Link>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="mb-6 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="warning">{"⚠️"}</span>
          <div>
            <p className="text-sm font-bold text-amber-900">Last sync failed</p>
            <p className="text-xs text-amber-700 mt-0.5 max-w-md truncate">{syncMessage || "Unknown error"}</p>
          </div>
        </div>
        <button onClick={triggerSync} className="flex-shrink-0 text-sm font-medium text-amber-700 hover:text-amber-800 px-3 py-1.5 rounded-md hover:bg-amber-100 transition-colors">
          Retry Sync
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-sm text-gray-600">Pull latest workflow changes from HubSpot</span>
      </div>
      <button onClick={triggerSync} className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors">
        Sync Now
      </button>
    </div>
  );
}