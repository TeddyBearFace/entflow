"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import SyncProgress from "@/components/SyncProgress";

export default function DashboardSyncBanner({ portalId, isSyncing: serverSyncing, justConnected }: {
  portalId: string;
  isSyncing: boolean;
  justConnected: boolean;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(serverSyncing || justConnected);
  const [syncKey, setSyncKey] = useState(0);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    setSyncKey(k => k + 1);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId }),
      });
      // Non-blocking — SyncProgress polls for progress
    } catch (err) {
      console.error("Sync trigger failed:", err);
    }
  }, [portalId]);

  const handleComplete = useCallback(() => {
    setSyncing(false);
    router.refresh();
  }, [router]);

  if (syncing) {
    return (
      <div className="mb-6">
        <SyncProgress key={syncKey} portalId={portalId} onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        <span className="text-sm text-gray-600">Pull latest workflow changes from HubSpot</span>
      </div>
      <button onClick={triggerSync}
        className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1.5">
        Sync Now
      </button>
    </div>
  );
}
