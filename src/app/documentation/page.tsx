import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import SyncBar from "@/components/SyncBar";
import UpgradeButton from "@/components/UpgradeButton";
import { getPlan } from "@/lib/plans";

interface DashboardPageProps {
  searchParams: { portal?: string; connected?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const portalId = searchParams.portal;

  if (!portalId) {
    const latestPortal = await prisma.portal.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (latestPortal) redirect(`/dashboard?portal=${latestPortal.id}`);
    redirect("/connect");
  }

  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: {
      id: true, name: true, hubspotPortalId: true,
      syncStatus: true, syncMessage: true, lastSyncedAt: true, planTier: true,
    },
  });

  if (!portal) redirect("/connect");

  const [workflowStats, dependencyCount, conflictStats, recentSync, recentChanges] =
    await Promise.all([
      prisma.workflow.groupBy({ by: ["status"], where: { portalId }, _count: true }),
      prisma.dependency.count({ where: { portalId } }),
      prisma.conflict.groupBy({ by: ["severity"], where: { portalId }, _count: true }),
      prisma.syncLog.findFirst({ where: { portalId }, orderBy: { startedAt: "desc" } }),
      prisma.changelogEntry.findMany({ where: { portalId }, orderBy: { createdAt: "desc" }, take: 5 }).catch(() => []),
    ]);

  const totalWorkflows = workflowStats.reduce((sum, s) => sum + s._count, 0);
  const activeWorkflows = workflowStats.find((s) => s.status === "ACTIVE")?._count || 0;
  const inactiveWorkflows = workflowStats.find((s) => s.status === "INACTIVE")?._count || 0;
  const totalConflicts = conflictStats.reduce((sum, s) => sum + s._count, 0);
  const criticalConflicts = conflictStats.find((s) => s.severity === "CRITICAL")?._count || 0;
  const warningConflicts = conflictStats.find((s) => s.severity === "WARNING")?._count || 0;

  const topWorkflows = await prisma.workflow.findMany({
    where: { portalId },
    select: {
      id: true, name: true, status: true, objectType: true, actionCount: true,
      _count: { select: { sourceDependencies: true, targetDependencies: true, conflictWorkflows: true } },
    },
    orderBy: { sourceDependencies: { _count: "desc" } },
    take: 5,
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <NavBar portalId={portalId} portalName={portal.name || undefined} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Sync */}
        <div className="mb-5">
          <SyncBar
            portalId={portalId}
            planTier={portal.planTier}
            lastSyncedAt={portal.lastSyncedAt?.toISOString() || null}
            initialStatus={portal.syncStatus}
            initialMessage={portal.syncMessage}
          />
        </div>

        {/* Upgrade banner */}
        {portal.planTier === "FREE" && totalWorkflows > 0 && (
          <div className="mb-5 px-4 py-3 bg-white border border-amber-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Free plan — {getPlan("FREE").workflowLimit} workflow limit</p>
              <p className="text-xs text-gray-500 mt-0.5">Upgrade for unlimited syncs, tagging, exports, and up to 300 workflows.</p>
            </div>
            <UpgradeButton portalId={portalId}
              className="flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors">
              Upgrade
            </UpgradeButton>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Metric label="Workflows" value={totalWorkflows} detail={`${activeWorkflows} active · ${inactiveWorkflows} inactive`} />
          <Metric label="Dependencies" value={dependencyCount} detail="Cross-workflow links" />
          <Metric
            label="Conflicts"
            value={totalConflicts}
            detail={criticalConflicts > 0 ? `${criticalConflicts} critical` : totalConflicts > 0 ? `${warningConflicts} warnings` : "All clear"}
            alert={criticalConflicts > 0}
          />
          <Metric
            label="Last sync"
            value={portal.lastSyncedAt ? timeAgo(new Date(portal.lastSyncedAt)) : "Never"}
            detail={recentSync?.durationMs ? `${(recentSync.durationMs / 1000).toFixed(1)}s` : ""}
          />
        </div>

        {/* Quick actions */}
        {totalWorkflows > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <ActionCard href={`/map?portal=${portalId}`} label="Workflow Map" detail={`${totalWorkflows} workflows`} />
            <ActionCard href={`/analyst?portal=${portalId}`} label="AI Analyst" detail="Health scores & analysis" />
            <ActionCard href={`/timeline?portal=${portalId}`} label="Flow Timeline" detail="Execution order" />
            <ActionCard href={`/changelog?portal=${portalId}`} label="Changelog" detail={recentChanges.length > 0 ? `${recentChanges.length} recent` : "Track changes"} />
          </div>
        )}

        {/* Most connected workflows */}
        {topWorkflows.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Most connected workflows</h3>
                <p className="text-xs text-gray-500 mt-0.5">Highest dependency count — watch these closely.</p>
              </div>
              <Link href={`/map?portal=${portalId}`} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                Open map →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px]">
                <thead>
                  <tr className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-4 py-2.5">Workflow</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                    <th className="px-4 py-2.5 text-right">Deps</th>
                    <th className="px-4 py-2.5 text-right">Conflicts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topWorkflows.map((wf) => {
                    const depCount = wf._count.sourceDependencies + wf._count.targetDependencies;
                    return (
                      <tr key={wf.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="text-sm text-gray-900">{wf.name}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-xs ${wf.status === "ACTIVE" ? "text-emerald-600" : "text-gray-400"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${wf.status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-300"}`} />
                            {wf.status.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {wf.objectType.charAt(0) + wf.objectType.slice(1).toLowerCase()}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 text-right tabular-nums">{wf.actionCount}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 text-right tabular-nums">{depCount}</td>
                        <td className="px-4 py-2.5 text-right">
                          {wf._count.conflictWorkflows > 0 ? (
                            <span className="text-xs font-medium text-red-600 tabular-nums">{wf._count.conflictWorkflows}</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent changes */}
        {recentChanges.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Recent changes</h3>
              <Link href={`/changelog?portal=${portalId}`} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentChanges.map((change: any) => (
                <div key={change.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{change.summary}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {change.workflowName} · {new Date(change.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {portal.name || portal.hubspotPortalId} · {portal.planTier.toLowerCase()}
          </p>
          <Link href={`/pricing?portal=${portalId}`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Manage plan
          </Link>
        </div>
      </main>
    </div>
  );
}

// ── Components ──

function Metric({ label, value, detail, alert }: { label: string; value: number | string; detail: string; alert?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      {detail && <p className="text-xs text-gray-400 mt-0.5">{detail}</p>}
    </div>
  );
}

function ActionCard({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link href={href}
      className="group bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all">
      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
    </Link>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
