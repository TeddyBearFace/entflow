import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import DashboardSyncBanner from "@/components/DashboardSyncBanner";
import DisconnectButton from "@/components/DisconnectButton";
import UpgradeButton from "@/components/UpgradeButton";
import { getPlan } from "@/lib/plans";


interface DashboardPageProps {
  searchParams: { portal?: string; connected?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const portalId = searchParams.portal;

  if (!portalId) {
    // Try to find the most recently connected portal
    const latestPortal = await prisma.portal.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (latestPortal) {
      redirect(`/dashboard?portal=${latestPortal.id}`);
    }
    redirect("/connect");
  }

  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: {
      id: true,
      name: true,
      hubspotPortalId: true,
      syncStatus: true,
      lastSyncedAt: true,
      planTier: true,
    },
  });

  if (!portal) {
    redirect("/connect");
  }

  // Fetch stats
  const [workflowStats, dependencyCount, conflictStats, recentSync, recentChanges] =
    await Promise.all([
      prisma.workflow.groupBy({
        by: ["status"],
        where: { portalId },
        _count: true,
      }),
      prisma.dependency.count({ where: { portalId } }),
      prisma.conflict.groupBy({
        by: ["severity"],
        where: { portalId },
        _count: true,
      }),
      prisma.syncLog.findFirst({
        where: { portalId },
        orderBy: { startedAt: "desc" },
      }),
      prisma.changelogEntry.findMany({
        where: { portalId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }).catch(() => []),
    ]);

  const totalWorkflows = workflowStats.reduce((sum, s) => sum + s._count, 0);
  const activeWorkflows =
    workflowStats.find((s) => s.status === "ACTIVE")?._count || 0;
  const inactiveWorkflows =
    workflowStats.find((s) => s.status === "INACTIVE")?._count || 0;

  const totalConflicts = conflictStats.reduce((sum, s) => sum + s._count, 0);
  const criticalConflicts =
    conflictStats.find((s) => s.severity === "CRITICAL")?._count || 0;
  const warningConflicts =
    conflictStats.find((s) => s.severity === "WARNING")?._count || 0;

  // Get most complex workflows (highest dependency count)
  const topWorkflows = await prisma.workflow.findMany({
    where: { portalId },
    select: {
      id: true,
      name: true,
      status: true,
      objectType: true,
      actionCount: true,
      _count: {
        select: {
          sourceDependencies: true,
          targetDependencies: true,
          conflictWorkflows: true,
        },
      },
    },
    orderBy: { sourceDependencies: { _count: "desc" } },
    take: 5,
  });

  const isSyncing = portal.syncStatus === "SYNCING";
  const justConnected = searchParams.connected === "true";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <NavBar portalId={portalId} portalName={portal.name || undefined} />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Sync progress */}
        <DashboardSyncBanner portalId={portalId} isSyncing={isSyncing} justConnected={justConnected} />

        {/* Upgrade banner for free users */}
        {portal.planTier === "FREE" && totalWorkflows > 0 && (
          <div className="mb-6 px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="text-sm font-bold text-amber-900">You{"'"}re on the Free plan ({getPlan("FREE").workflowLimit} workflow limit)</p>
                <p className="text-xs text-amber-700 mt-0.5">Upgrade to Pro for exports, canvas tools, tagging, property impact, and up to 500 workflows.</p>
              </div>
            </div>
            <UpgradeButton portalId={portalId}
              className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:shadow-md transition-all bg-[#FF7A59]">
              Upgrade to Pro — $29/mo
            </UpgradeButton>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Workflows"
            value={totalWorkflows}
            sub={`${activeWorkflows} active, ${inactiveWorkflows} inactive`}
            color="blue"
          />
          <StatCard
            label="Dependencies"
            value={dependencyCount}
            sub="Cross-workflow relationships"
            color="purple"
          />
          <StatCard
            label="Conflicts"
            value={totalConflicts}
            sub={
              criticalConflicts > 0
                ? `${criticalConflicts} critical, ${warningConflicts} warnings`
                : totalConflicts > 0
                ? `${warningConflicts} warnings`
                : "No issues detected"
            }
            color={criticalConflicts > 0 ? "red" : totalConflicts > 0 ? "amber" : "green"}
          />
          <StatCard
            label="Last Sync"
            value={
              portal.lastSyncedAt
                ? timeAgo(new Date(portal.lastSyncedAt))
                : "Never"
            }
            sub={
              recentSync?.durationMs
                ? `Took ${(recentSync.durationMs / 1000).toFixed(1)}s`
                : ""
            }
            color="gray"
          />
        </div>

        {/* Quick actions */}
        {totalWorkflows > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Link
              href={`/map?portal=${portalId}`}
              className="group block p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
            >
              <span className="text-2xl">🗺️</span>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 mt-2">Workflow Map</h3>
              <p className="text-xs text-gray-500 mt-1">{totalWorkflows} workflows, {dependencyCount} dependencies</p>
            </Link>

            <Link
              href={`/map?portal=${portalId}`}
              className="group block p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
            >
              <span className="text-2xl">🎯</span>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 mt-2">Property Impact</h3>
              <p className="text-xs text-gray-500 mt-1">View property conflicts in the map sidebar</p>
            </Link>

            <Link
              href={`/changelog?portal=${portalId}`}
              className="group block p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
            >
              <span className="text-2xl">📋</span>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 mt-2">Changelog</h3>
              <p className="text-xs text-gray-500 mt-1">{recentChanges.length > 0 ? `${recentChanges.length} recent changes` : "Track workflow changes"}</p>
            </Link>

            <Link
              href={`/conflicts?portal=${portalId}`}
              className="group block p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
            >
              <span className="text-2xl">{criticalConflicts > 0 ? "🔴" : totalConflicts > 0 ? "⚠️" : "✅"}</span>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 mt-2">
                {totalConflicts > 0 ? `${totalConflicts} Conflict${totalConflicts !== 1 ? "s" : ""}` : "No Conflicts"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {criticalConflicts > 0 ? `${criticalConflicts} critical` : totalConflicts > 0 ? `${warningConflicts} warnings` : "All clear"}
              </p>
            </Link>
          </div>
        )}

        {/* Most complex workflows */}
        {topWorkflows.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Most Connected Workflows
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Workflows with the most dependencies — these are the ones to watch.
              </p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Workflow</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Actions</th>
                  <th className="px-6 py-3">Dependencies</th>
                  <th className="px-6 py-3">Conflicts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topWorkflows.map((wf) => {
                  const depCount =
                    wf._count.sourceDependencies + wf._count.targetDependencies;
                  return (
                    <tr key={wf.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <span className="text-sm font-medium text-gray-900">
                          {wf.name}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            wf.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {wf.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {wf.objectType.charAt(0) +
                          wf.objectType.slice(1).toLowerCase()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {wf.actionCount}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {depCount}
                      </td>
                      <td className="px-6 py-3">
                        {wf._count.conflictWorkflows > 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-700">
                            {wf._count.conflictWorkflows}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Changes */}
        {recentChanges.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Recent Changes</h3>
                <p className="text-xs text-gray-500 mt-0.5">Latest workflow modifications detected during sync</p>
              </div>
              <Link href={`/changelog?portal=${portalId}`} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentChanges.map((change: any) => {
                const icons: Record<string, string> = { WORKFLOW_CREATED: "🆕", STATUS_CHANGE: "🔄", RENAMED: "✏️", ACTION_ADDED: "➕", ACTION_REMOVED: "➖", ACTION_MODIFIED: "🔧", ENROLLMENT_CHANGED: "📥" };
                return (
                  <div key={change.id} className="px-6 py-3 flex items-start gap-3">
                    <span className="text-base mt-0.5">{icons[change.changeType] || "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{change.summary}</p>
                      <p className="text-xs text-gray-500 mt-0.5">in <span className="font-medium">{change.workflowName}</span> · {new Date(change.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Portal management */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Portal: {portal.name || portal.hubspotPortalId} · Plan: {portal.planTier}
          </p>
          <DisconnectButton portalId={portalId} portalName={portal.name || portal.hubspotPortalId} />
        </div>
      </main>
    </div>
  );
}

// --- Helper Components ---

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50",
    purple: "border-purple-200 bg-purple-50",
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    green: "border-emerald-200 bg-emerald-50",
    gray: "border-gray-200 bg-white",
  };

  const valueColorMap: Record<string, string> = {
    blue: "text-blue-900",
    purple: "text-purple-900",
    red: "text-red-900",
    amber: "text-amber-900",
    green: "text-emerald-900",
    gray: "text-gray-900",
  };

  return (
    <div
      className={`rounded-xl border px-4 py-4 ${colorMap[color] || colorMap.gray}`}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-1 ${valueColorMap[color] || "text-gray-900"}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
