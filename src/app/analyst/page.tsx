"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import WorkflowHealthDashboard from "@/components/analyst/WorkflowHealthDashboard";
import type { EntflowTier } from "@/lib/analyst-tier-gate";
import Link from "next/link";

export default function AnalystPage() {
  const searchParams = useSearchParams();
  const portalId = searchParams.get("portal") || "";

  const [workflows, setWorkflows] = useState<any[]>([]);
  const [tier, setTier] = useState<EntflowTier>("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!portalId) { setLoading(false); return; }
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
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        <NavBar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">No portal connected</p>
            <Link href="/connect" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Connect HubSpot →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <NavBar portalId={portalId} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">AI Analyst</h1>
          <p className="text-sm text-gray-500 mt-1">Health scores and deep analysis for your workflows.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading workflows...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-lg p-6 text-center">
            <p className="text-sm font-medium text-red-800 mb-1">Failed to load workflows</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="text-center max-w-sm">
              <p className="text-sm font-medium text-gray-900 mb-1">No workflows to analyse</p>
              <p className="text-xs text-gray-500 mb-4">Sync your HubSpot portal first, then come back for health scores.</p>
              <Link href={`/dashboard?portal=${portalId}`} className="text-sm font-medium text-gray-500 hover:text-gray-700">
                ← Back to dashboard
              </Link>
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
