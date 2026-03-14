"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import NavBar from "@/components/NavBar";

interface PlanInfo {
  tier: string;
  name: string;
  workflowLimit: number | null;
  workflowCount: number;
  features: Record<string, boolean>;
  hasSubscription: boolean;
  periodEnd: string | null;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const portalId = searchParams.get("portal") || "";
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [portal, setPortal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!portalId) { setLoading(false); return; }
    Promise.all([
      fetch(`/api/plan?portalId=${portalId}`).then(r => r.json()),
      fetch(`/api/portals`).then(r => r.json()),
    ]).then(([planData, portalsData]) => {
      setPlan(planData);
      const p = (portalsData.portals || []).find((p: any) => p.id === portalId);
      if (p) setPortal(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [portalId]);

  const handleManageBilling = useCallback(async () => {
    setActionLoading("billing");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch {}
    finally { setActionLoading(null); }
  }, [portalId]);

  const handleLogout = useCallback(async () => {
    setActionLoading("logout");
    await signOut({ callbackUrl: "/login" });
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!confirm("Disconnect this HubSpot portal? All synced data, canvas elements, tags, and changelog entries will be permanently deleted.")) return;
    setActionLoading("disconnect");
    try {
      const res = await fetch("/api/portals/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId }),
      });
      if (res.ok) router.push("/connect");
    } catch {}
    finally { setActionLoading(null); }
  }, [portalId, router]);

  const usagePercent = plan && plan.workflowLimit
    ? Math.min(100, Math.round((plan.workflowCount / plan.workflowLimit) * 100))
    : 0;
  const isOverLimit = plan && plan.workflowLimit && plan.workflowCount > plan.workflowLimit;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar portalId={portalId} portalName={portal?.name || undefined} />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Account</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* Profile */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Profile</h2>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    {session?.user?.name && (
                      <p className="text-sm font-semibold text-gray-900 truncate">{session.user.name}</p>
                    )}
                    <p className="text-sm text-gray-500 truncate">{session?.user?.email || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Plan & Billing</h2>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-bold text-gray-900">{plan?.name || "Free"}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        plan?.tier === "PRO" || plan?.tier === "ENTERPRISE" ? "bg-blue-100 text-blue-700"
                          : plan?.tier === "GROWTH" ? "bg-indigo-100 text-indigo-700"
                          : plan?.tier === "STARTER" ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {plan?.tier || "FREE"}
                      </span>
                    </div>
                    {plan?.hasSubscription && plan?.periodEnd && (
                      <p className="text-xs text-gray-500 mt-1">
                        Renews {new Date(plan.periodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    {!plan?.hasSubscription && (
                      <p className="text-xs text-gray-400 mt-1">No active subscription</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {plan?.hasSubscription && (
                      <button onClick={handleManageBilling} disabled={actionLoading === "billing"}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                        {actionLoading === "billing" ? "Loading..." : "Manage Billing"}
                      </button>
                    )}
                    <Link href={`/pricing?portal=${portalId}`}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-md"
                      style={{ backgroundColor: "#FF7A59" }}>
                      {plan?.hasSubscription ? "Change Plan" : "Upgrade"}
                    </Link>
                  </div>
                </div>

                {plan && plan.workflowLimit && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500">Workflow usage</span>
                      <span className={`text-xs font-bold ${isOverLimit ? "text-red-600" : "text-gray-700"}`}>
                        {plan.workflowCount} / {plan.workflowLimit}
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        isOverLimit ? "bg-red-500" : usagePercent > 80 ? "bg-amber-500" : "bg-blue-500"
                      }`} style={{ width: `${Math.min(100, usagePercent)}%` }} />
                    </div>
                    {isOverLimit && (
                      <p className="text-xs text-red-600 mt-1.5">
                        Over your limit. <Link href={`/pricing?portal=${portalId}`} className="font-semibold underline">Upgrade</Link> to sync all workflows.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Your Features</h2>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "manualSync", label: "Unlimited manual sync" },
                    { key: "tagging", label: "Workflow tagging" },
                    { key: "propertyImpact", label: "Property impact" },
                    { key: "propertyConflicts", label: "Property conflict detail" },
                    { key: "export", label: "PNG + CSV export" },
                    { key: "exportAdvanced", label: "SVG + PDF export" },
                    { key: "canvas", label: "Basic canvas tools" },
                    { key: "canvasAdvanced", label: "Full canvas toolkit" },
                    { key: "autoSync", label: "Auto-sync" },
                    { key: "multiPortal", label: "Multi-portal" },
                  ].map(f => {
                    const enabled = plan?.features?.[f.key];
                    return (
                      <div key={f.key} className="flex items-center gap-2.5 py-1.5">
                        {enabled ? (
                          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={`text-sm ${enabled ? "text-gray-800" : "text-gray-400"}`}>{f.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* HubSpot Connection */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">HubSpot Connection</h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <Row label="Portal" value={portal?.name || `Portal ${portal?.hubspotPortalId || "—"}`} />
                <Row label="Portal ID" value={portal?.hubspotPortalId || "—"} mono />
                <Row label="Status">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    portal?.syncStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-700"
                    : portal?.syncStatus === "SYNCING" ? "bg-blue-50 text-blue-700"
                    : portal?.syncStatus === "FAILED" ? "bg-red-50 text-red-700"
                    : "bg-gray-100 text-gray-500"
                  }`}>
                    {portal?.syncStatus?.toLowerCase() || "—"}
                  </span>
                </Row>
                <Row label="Last synced" value={portal?.lastSyncedAt ? new Date(portal.lastSyncedAt).toLocaleString() : "Never"} />
                <Row label="Workflows" value={String(portal?._count?.workflows ?? plan?.workflowCount ?? "—")} />
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Session</h2>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Log out</p>
                    <p className="text-xs text-gray-500">Sign out of Entflow on this device.</p>
                  </div>
                  <button onClick={handleLogout} disabled={actionLoading === "logout"}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {actionLoading === "logout" ? "..." : "Log Out"}
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-red-100 bg-red-50">
                <h2 className="text-sm font-bold text-red-900">Danger Zone</h2>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Disconnect HubSpot</p>
                    <p className="text-xs text-gray-500">Permanently delete all synced data, canvas elements, tags, and changelog entries.</p>
                  </div>
                  <button onClick={handleDisconnect} disabled={actionLoading === "disconnect"}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                    {actionLoading === "disconnect" ? "Deleting..." : "Disconnect"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, mono, children }: { label: string; value?: string; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      {children || <span className={`text-sm ${mono ? "font-mono text-gray-600" : "font-medium text-gray-900"}`}>{value}</span>}
    </div>
  );
}
