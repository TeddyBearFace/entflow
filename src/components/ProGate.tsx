"use client";

import { useEffect, useRef, useState } from "react";
import { IconLock, IconBolt } from "@/components/icons";

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
 * Clicking triggers a small upgrade popover that links to the pricing page.
 */
export default function ProGate({ allowed, portalId, feature, children, badge = false, className }: ProGateProps) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPopover) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handler);
    const timer = setTimeout(() => setShowPopover(false), 4000);
    return () => { document.removeEventListener("mousedown", handler); clearTimeout(timer); };
  }, [showPopover]);

  const goToPricing = () => {
    window.location.href = `/pricing?portal=${portalId}`;
  };

  if (allowed) return <>{children}</>;

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      <div
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPopover(true); }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        style={{ cursor: "pointer" }}
        className="relative"
      >
        <div className="pointer-events-none select-none" style={{ opacity: 0.55 }}>
          {children}
        </div>
        {badge && (
          <span className="absolute -top-1 -right-1 z-10 flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-px">
            <IconBolt className="w-3 h-3 inline" /> Pro
          </span>
        )}
      </div>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowPopover(false)} />
          <div ref={popoverRef}
            className="absolute z-[70] bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-[240px]"
            style={{ top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 8 }}>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <IconBolt className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-gray-900">Paid Feature</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                {feature ? `${feature} requires` : "This requires"} a paid plan. Plans start at $9/mo.
              </p>
              <button onClick={goToPricing}
                className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-md"
                style={{ backgroundColor: "#FF7A59" }}>
                View Plans
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

  const goToPricing = () => {
    window.location.href = `/pricing?portal=${portalId}`;
  };

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
        <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-0.5 leading-none py-px flex items-center gap-0.5"><IconBolt className="w-2.5 h-2.5" />Pro</span>
      </div>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowPopover(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[70] bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-[200px]">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
            <p className="text-xs text-gray-600 mb-2 relative">
              <strong className="text-gray-900"><IconBolt className="w-3.5 h-3.5 inline" /> {feature || "Paid"}</strong> — upgrade to unlock.
            </p>
            <button onClick={goToPricing}
              className="w-full py-1.5 rounded-md text-xs font-semibold text-white"
              style={{ backgroundColor: "#FF7A59" }}>
              View Plans
            </button>
          </div>
        </>
      )}
    </div>
  );
}
