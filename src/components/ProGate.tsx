"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ProGateProps {
  /** Whether the user can use this feature */
  allowed: boolean;
  portalId: string;
  /** Feature name shown in the upgrade popover */
  feature?: string;
  children: React.ReactNode;
  /** If true, renders a tiny ⚡ badge next to the children instead of overlaying */
  badge?: boolean;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * Wraps a Pro feature's UI so free users can see it but can't interact.
 * Shows the full UI at reduced opacity with a subtle "Pro" badge.
 * Clicking triggers a small upgrade popover instead of the feature action.
 */
export default function ProGate({ allowed, portalId, feature, children, badge = false, className }: ProGateProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!showPopover) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handler);
    // Auto-dismiss after 4s
    const timer = setTimeout(() => setShowPopover(false), 4000);
    return () => { document.removeEventListener("mousedown", handler); clearTimeout(timer); };
  }, [showPopover]);

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoading(false);
    }
  }, [portalId]);

  // If allowed, just render children directly
  if (allowed) return <>{children}</>;

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      {/* Intercept all clicks */}
      <div
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPopover(true); }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        style={{ cursor: "pointer" }}
        className="relative"
      >
        {/* Render children with reduced interactivity look */}
        <div className="pointer-events-none select-none" style={{ opacity: 0.55 }}>
          {children}
        </div>

        {/* Subtle Pro badge overlay */}
        {badge && (
          <span className="absolute -top-1 -right-1 z-10 flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-px">
            ⚡ Pro
          </span>
        )}
      </div>

      {/* Upgrade popover */}
      {showPopover && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowPopover(false)} />
          <div ref={popoverRef}
            className="absolute z-[70] bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-[240px] animate-in fade-in"
            style={{
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: 8,
            }}>
            {/* Arrow */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">⚡</span>
                <span className="text-sm font-bold text-gray-900">Paid Feature</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                {feature ? `${feature} requires` : "This requires"} a paid plan. Plans start at $9/mo.
              </p>
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-md disabled:opacity-50"
                style={{ backgroundColor: "#FF7A59" }}
              >
                {loading ? "Loading..." : "View Plans"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Tiny inline Pro badge for toolbar buttons.
 * Shows ⚡ next to the element and intercepts click.
 */
export function ProBadge({ allowed, portalId, feature, children, className }: Omit<ProGateProps, "badge">) {
  const [showPopover, setShowPopover] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPopover) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowPopover(false);
    };
    document.addEventListener("mousedown", handler);
    const timer = setTimeout(() => setShowPopover(false), 3500);
    return () => { document.removeEventListener("mousedown", handler); clearTimeout(timer); };
  }, [showPopover]);

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch {}
    finally { setLoading(false); }
  }, [portalId]);

  if (allowed) return <>{children}</>;

  return (
    <div ref={ref} className={`relative inline-flex items-center ${className || ""}`}>
      <div
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPopover(true); }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        className="inline-flex items-center gap-1 cursor-pointer"
        style={{ opacity: 0.6 }}
      >
        <div className="pointer-events-none">{children}</div>
        <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-0.5 leading-none py-px">⚡</span>
      </div>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowPopover(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[70] bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-[200px]">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
            <p className="text-xs text-gray-600 mb-2 relative">
              <strong className="text-gray-900">⚡ {feature || "Paid"}</strong> — upgrade to unlock.
            </p>
            <button onClick={handleUpgrade} disabled={loading}
              className="w-full py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "#FF7A59" }}>
              {loading ? "..." : "View Plans"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
