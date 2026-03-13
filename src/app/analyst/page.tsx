"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import WorkflowHealthDashboard from "@/components/analyst/WorkflowHealthDashboard";
import type { EntflowTier } from "@/lib/analyst-tier-gate";

export default function AnalystPage() {
  const searchParams = useSearchParams();
  const portalId = searchParams.get("portal") || "";

  const [workflows, setWorkflows] = useState<any[]>([]);
  const [tier, setTier] = useState<EntflowTier>("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!portalId) {
      setLoading(false);
      return;
    }

    async function fetchWorkflows() {
      try {
        const res = await fetch(`/api/analyst/workflows?portalId=${portalId}`);
        if (!res.ok) throw new Error("Failed to fetch workflows");
        const data = await res.json();
        setWorkflows(data.workflows || []);
        setTier((data.tier || "FREE").toLowerCase() as EntflowTier);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    fetchWorkflows();
  }, [portalId]);

  if (!portalId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg mb-2">No portal connected</p>
            <a href="/connect" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              Connect HubSpot →
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar portalId={portalId} />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading workflows...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <p className="text-red-600 font-medium mb-2">Failed to load workflows</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="text-gray-900 font-semibold text-lg mb-1">No workflows to analyse</p>
              <p className="text-sm text-gray-500 mb-4">Sync your HubSpot portal first, then come back for health scores.</p>
              <a href={`/dashboard?portal=${portalId}`} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                ← Back to dashboard
              </a>
            </div>
          </div>
        ) : (
          <WorkflowHealthDashboard
            workflows={workflows}
            tier={tier}
            aiUsedThisMonth={0}
          />
        )}
      </main>
    </div>
  );
}
