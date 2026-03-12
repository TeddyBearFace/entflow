"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Portal { id: string; hubspotPortalId: string; name: string | null; }

interface NavBarProps { portalId?: string; portalName?: string; }

export default function NavBar({ portalId, portalName }: NavBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pid = portalId || searchParams.get("portal") || "";

  const [portals, setPortals] = useState<Portal[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const links = [
    { href: `/dashboard?portal=${pid}`, label: "Dashboard", icon: "📊", match: "/dashboard" },
    { href: `/map?portal=${pid}`, label: "Map", icon: "🗺️", match: "/map" },
    { href: `/changelog?portal=${pid}`, label: "Changelog", icon: "📋", match: "/changelog" },
    { href: `/documentation`, label: "Docs", icon: "📖", match: "/documentation" },
  ];

  const fetchPortals = useCallback(async () => {
    try {
      const res = await fetch("/api/portals");
      if (res.ok) { const data = await res.json(); setPortals(data.portals || []); }
    } catch {}
  }, []);

  useEffect(() => { fetchPortals(); }, [fetchPortals]);

  const switchPortal = async (newPortalId: string) => {
    setShowSwitcher(false);
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId: newPortalId }),
      });
    } catch {}
    router.push(`${pathname || "/dashboard"}?portal=${newPortalId}`);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/connect");
    } catch {}
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Link href={pid ? `/dashboard?portal=${pid}` : "/connect"} className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Entflow</span>
        </Link>

        {pid && (
          <div className="relative">
            <button onClick={() => { if (portals.length > 1) setShowSwitcher(!showSwitcher); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm text-gray-500 transition-colors border border-transparent ${portals.length > 1 ? "hover:text-gray-700 hover:bg-gray-50 hover:border-gray-200 cursor-pointer" : "cursor-default"}`}>
              <span className="text-gray-300 mr-0.5">|</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="font-medium truncate max-w-[150px]">{portalName || `Portal`}</span>
              {portals.length > 1 && (
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showSwitcher ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              )}
            </button>
            {showSwitcher && portals.length > 1 && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowSwitcher(false)} />
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-40">
                  <div className="px-3 py-1.5"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Switch Portal</span></div>
                  {portals.map(p => (
                    <button key={p.id} onClick={() => switchPortal(p.id)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors ${p.id === pid ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.id === pid ? "bg-blue-500" : "bg-emerald-500"}`} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{p.name || `Portal ${p.hubspotPortalId}`}</span>
                        <span className="text-[10px] text-gray-400">ID: {p.hubspotPortalId}</span>
                      </div>
                      {p.id === pid && <span className="text-[10px] font-bold text-blue-500">ACTIVE</span>}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <Link href="/connect" onClick={() => setShowSwitcher(false)}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                      Connect new portal
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {pid && (
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1">
            {links.map(link => {
              const isActive = pathname === link.match;
              return (
                <Link key={link.href} href={link.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${isActive ? "text-blue-700 bg-blue-50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}>
                  <span className="text-xs">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <span className="w-px h-5 bg-gray-200 mx-1" />
          <Link href={`/settings?portal=${pid}`}
            className={`px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${pathname === "/settings" ? "text-blue-700 bg-blue-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"}`}
            title="Settings">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <button onClick={handleLogout}
            className="px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            title="Log out">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      )}
    </header>
  );
}
