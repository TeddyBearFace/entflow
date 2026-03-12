import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DisconnectButton from "@/components/DisconnectButton";
import PortalLoginButton from "@/components/PortalLoginButton";

interface ConnectPageProps {
  searchParams: { error?: string };
}

export default async function ConnectPage({ searchParams }: ConnectPageProps) {
  // Only show portals that have actually synced successfully
  const existingPortals = await prisma.portal.findMany({
    where: {
      OR: [
        { syncStatus: "COMPLETED" },
        { syncStatus: "SYNCING" },
        { lastSyncedAt: { not: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, hubspotPortalId: true, name: true, updatedAt: true, syncStatus: true, lastSyncedAt: true },
  });

  const error = searchParams.error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">Entflow</span>
        </div>
        {existingPortals.length > 0 && (
          <PortalLoginButton portalId={existingPortals[0].id} href={`/dashboard?portal=${existingPortals[0].id}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            Go to dashboard
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
          </PortalLoginButton>
        )}
      </header>

      {/* Connected portals */}
      {existingPortals.length > 0 && (
        <div className="max-w-4xl w-full mx-auto px-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Connected Portals</h3>
            <div className="space-y-2">
              {existingPortals.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${p.syncStatus === "COMPLETED" ? "bg-emerald-500" : p.syncStatus === "SYNCING" ? "bg-blue-500 animate-pulse" : "bg-gray-400"}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name || `Portal ${p.hubspotPortalId}`}</p>
                      <p className="text-xs text-gray-400">
                        ID: {p.hubspotPortalId}
                        {p.lastSyncedAt && <> · Last synced: {new Date(p.lastSyncedAt).toLocaleDateString()}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PortalLoginButton portalId={p.id} href={`/dashboard?portal=${p.id}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                      Open
                    </PortalLoginButton>
                    <PortalLoginButton portalId={p.id} href={`/map?portal=${p.id}`}
                      className="text-xs font-medium text-gray-600 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                      Map
                    </PortalLoginButton>
                    <DisconnectButton portalId={p.id} portalName={p.name || `Portal ${p.hubspotPortalId}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Value prop */}
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              For HubSpot admins & RevOps teams
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
              See how your workflows <span className="text-blue-600">actually connect</span>
            </h1>
            <p className="text-lg text-gray-500 mt-4 leading-relaxed">
              Visual dependency map of every automation in your HubSpot portal. Find conflicts, track changes, and understand the full picture before something breaks.
            </p>

            {/* Features */}
            <div className="mt-8 space-y-3">
              {[
                { icon: "🗺️", title: "Visual Dependency Map", desc: "See every workflow and how they connect through shared properties, enrollments, and lists" },
                { icon: "🎯", title: "Property Impact Analysis", desc: "Know exactly which workflows read or write to lifecycle stage, deal stage, and other critical fields" },
                { icon: "📋", title: "Workflow Changelog", desc: "Track every change between syncs — actions added, properties changed, workflows activated" },
                { icon: "⚡", title: "Conflict Detection", desc: "Catch property write collisions, circular dependencies, and orphaned enrollments automatically" },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{f.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                    <p className="text-sm text-gray-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Connect card */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {existingPortals.length > 0 ? "Connect another portal" : "Get started in 30 seconds"}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {existingPortals.length > 0
                  ? "Add a new HubSpot portal or reconnect an existing one with updated permissions."
                  : "Connect your HubSpot portal and we'll map your workflows instantly. No setup required."
                }
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{decodeURIComponent(error)}</p>
                </div>
              )}

              <a
                href="/api/auth/hubspot"
                className="group block w-full text-center px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:shadow-lg hover:brightness-110"
                style={{ backgroundColor: "#ff7a59" }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.16 3.68v4.3a2.42 2.42 0 00-1.39-.44 2.47 2.47 0 00-2.47 2.47c0 .53.17 1.03.47 1.44l-2.63 2.63a2.42 2.42 0 00-1.44-.47c-.53 0-1.03.17-1.44.47l-1.12-1.12A2.47 2.47 0 008.6 11.5a2.47 2.47 0 10.55 4.89l1.12-1.12c.3.3.66.47 1.03.47A2.47 2.47 0 0013.77 13.27c0-.37-.12-.72-.33-1.03l2.63-2.63c.31.21.66.33 1.03.33a2.47 2.47 0 002.47-2.47V3.68h-1.41z"/>
                  </svg>
                  Connect HubSpot
                  {existingPortals.length > 0 && " Portal"}
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </a>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Permissions requested
                </h3>
                <div className="space-y-2">
                  {[
                    { ok: true, text: "Read workflow configurations" },
                    { ok: true, text: "Read property definitions" },
                    { ok: true, text: "Read pipeline & stage info" },
                    { ok: true, text: "Read email & list metadata" },
                    { ok: false, text: "We never access your CRM records" },
                    { ok: false, text: "We never modify your portal" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={`flex-shrink-0 ${item.ok ? "text-emerald-500" : "text-gray-400"}`}>
                        {item.ok ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        )}
                      </span>
                      <span className={item.ok ? "text-gray-700" : "text-gray-500"}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust */}
            <p className="text-center text-xs text-gray-400 mt-4">
              Free for up to 10 workflows. No credit card required.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
