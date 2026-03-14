"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";

interface Portal { id: string; hubspotPortalId: string; name: string | null; }
interface NavBarProps { portalId?: string; portalName?: string; }

export default function NavBar({ portalId, portalName }: NavBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pid = portalId || searchParams.get("portal") || "";

  const [portals, setPortals] = useState<Portal[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: `/dashboard?portal=${pid}`, label: "Dashboard", match: "/dashboard", tip: "Portal overview and stats" },
    { href: `/map?portal=${pid}`, label: "Map", match: "/map", tip: "Visual workflow dependency map" },
    { href: `/analyst?portal=${pid}`, label: "Analyst", match: "/analyst", tip: "AI health scores and deep analysis" },
    { href: `/timeline?portal=${pid}`, label: "Timeline", match: "/timeline", tip: "Execution order of your automations" },
    { href: `/changelog?portal=${pid}`, label: "Changelog", match: "/changelog", tip: "Track workflow changes between syncs" },
  ];

  const fetchPortals = useCallback(async () => {
    try {
      const res = await fetch("/api/portals");
      if (res.ok) { const data = await res.json(); setPortals(data.portals || []); }
    } catch {}
  }, []);

  useEffect(() => { fetchPortals(); }, [fetchPortals]);

  const switchPortal = (newPortalId: string) => {
    setShowSwitcher(false);
    router.push(`${pathname || "/dashboard"}?portal=${newPortalId}`);
  };

  const handleLogout = () => signOut({ callbackUrl: "/login" });

  return (
    <header className="h-12 border-b border-gray-200 bg-white flex items-center px-4 md:px-5 flex-shrink-0 relative z-50">
      {/* Left: Logo + Portal */}
      <div className="flex items-center gap-2 mr-6">
        <Link href={pid ? `/dashboard?portal=${pid}` : "/connect"} className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900 hidden sm:inline">Entflow</span>
        </Link>

        {pid && (
          <div className="relative hidden md:block">
            <button onClick={() => { if (portals.length > 1) setShowSwitcher(!showSwitcher); }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-gray-500 transition-colors ${portals.length > 1 ? "hover:text-gray-700 hover:bg-gray-100 cursor-pointer" : "cursor-default"}`}>
              <span className="text-gray-300">/</span>
              <span className="font-medium text-gray-700 truncate max-w-[120px]">{portalName || "Portal"}</span>
              {portals.length > 1 && (
                <svg className={`w-3 h-3 text-gray-400 transition-transform ${showSwitcher ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              )}
            </button>
            {showSwitcher && portals.length > 1 && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowSwitcher(false)} />
                <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-40">
                  <div className="px-3 py-1.5"><span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Portals</span></div>
                  {portals.map(p => (
                    <button key={p.id} onClick={() => switchPortal(p.id)}
                      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${p.id === pid ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.id === pid ? "bg-gray-900" : "bg-gray-300"}`} />
                      <span className="truncate flex-1">{p.name || `Portal ${p.hubspotPortalId}`}</span>
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <Link href="/connect" onClick={() => setShowSwitcher(false)}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 flex items-center gap-2 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                      Add portal
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Center: Nav links */}
      {pid && (
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {links.map(link => {
            const isActive = pathname === link.match;
            return (
              <Link key={link.href} href={link.href}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${isActive ? "text-gray-900 bg-gray-100" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Right: Actions */}
      {pid && (
        <div className="hidden md:flex items-center gap-0.5 ml-auto">
          <Link href="/documentation" title="Documentation"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </Link>
          <Link href={`/settings?portal=${pid}`}
            className={`p-1.5 rounded-md transition-colors ${pathname === "/settings" ? "text-gray-900 bg-gray-100" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
            title="Settings">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <button onClick={handleLogout}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            title="Log out">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      )}

      {/* Mobile hamburger */}
      {pid && (
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 -mr-1.5 text-gray-500 hover:text-gray-700 ml-auto">
          {mobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
          )}
        </button>
      )}

      {/* Mobile menu */}
      {pid && mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/10" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-12 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm md:hidden">
            <div className="px-4 py-2 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">{portalName || "Portal"}</span>
            </div>
            <nav className="py-1">
              {links.map(link => {
                const isActive = pathname === link.match;
                return (
                  <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-2 text-sm transition-colors ${isActive ? "text-gray-900 bg-gray-50 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-gray-100 py-1">
              <Link href="/documentation" onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Docs
              </Link>
              <Link href={`/settings?portal=${pid}`} onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Settings
              </Link>
              <button onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
