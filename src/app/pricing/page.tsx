"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";

interface PlanInfo {
  tier: string;
  name: string;
  workflowLimit: number | null;
  workflowCount: number;
  features: Record<string, boolean>;
  hasSubscription: boolean;
}

const TIERS = [
  {
    id: "FREE", name: "Free", price: 0, period: "",
    desc: "Get started in seconds",
    features: ["10 workflows", "Dependency map", "Conflict detection", "Changelog + diffs", "Sync every 2 hours"],
    missing: ["Tags", "Property impact", "Export", "Canvas tools", "Auto-sync"],
  },
  {
    id: "STARTER", name: "Starter", price: 9, period: "/mo",
    desc: "For growing portals",
    features: ["25 workflows", "Everything in Free", "Unlimited manual sync", "Workflow tagging", "Property impact (view)", "PNG + CSV export"],
    missing: ["Canvas tools", "Property conflict detail", "SVG/PDF export", "Auto-sync"],
  },
  {
    id: "GROWTH", name: "Growth", price: 19, period: "/mo", popular: true,
    desc: "For active RevOps teams",
    features: ["100 workflows", "Everything in Starter", "Property conflict detail", "Canvas: sections + stickies", "PNG + CSV export"],
    missing: ["Full canvas toolkit", "SVG/PDF export", "Auto-sync"],
  },
  {
    id: "PRO", name: "Pro", price: 29, period: "/mo",
    desc: "Full toolkit, unlimited sync",
    features: ["300 workflows", "Everything in Growth", "Full canvas toolkit", "SVG + PDF export", "Auto-sync", "Priority support"],
    missing: [],
  },
];

export default function PricingPage() {
  const searchParams = useSearchParams();
  const portalId = searchParams.get("portal") || "";
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!portalId) { setLoading(false); return; }
    fetch(`/api/plan?portalId=${portalId}`)
      .then(r => r.json())
      .then(data => { setPlan(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [portalId]);

  const handleCheckout = useCallback(async (tier: string) => {
    if (!portalId) return;
    setCheckoutLoading(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId, tier }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setCheckoutLoading(null);
    }
  }, [portalId]);

  const handleManage = useCallback(async () => {
    if (!portalId) return;
    setCheckoutLoading("manage");
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
    } catch (err) {
      console.error("Portal failed:", err);
    } finally {
      setCheckoutLoading(null);
    }
  }, [portalId]);

  const currentTierIndex = TIERS.findIndex(t => t.id === plan?.tier);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar portalId={portalId} />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900">Choose your plan</h1>
          <p className="text-sm text-gray-500 mt-2">
            {plan ? (
              <>You{"'"}re currently on the <span className="font-semibold text-gray-800">{plan.name}</span> plan with {plan.workflowCount} workflow{plan.workflowCount !== 1 ? "s" : ""}.</>
            ) : (
              <>Start free. Upgrade anytime.</>
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TIERS.map((tier, i) => {
                const isCurrent = plan?.tier === tier.id;
                const isDowngrade = currentTierIndex > i;
                const isUpgrade = currentTierIndex >= 0 && currentTierIndex < i;

                return (
                  <div key={tier.id}
                    className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
                      isCurrent ? "border-blue-500 bg-blue-50/30 shadow-md"
                        : (tier as any).popular ? "border-blue-300 bg-white shadow-sm"
                        : "border-gray-200 bg-white"
                    }`}>
                    {(tier as any).popular && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                        Most Popular
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                        Current Plan
                      </div>
                    )}

                    <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                    <div className="mt-2 mb-1">
                      <span className="text-3xl font-bold text-gray-900">
                        {tier.price === 0 ? "Free" : `$${tier.price}`}
                      </span>
                      {tier.period && <span className="text-sm text-gray-500">{tier.period}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mb-5">{tier.desc}</p>

                    <ul className="space-y-2 mb-6 flex-1">
                      {tier.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">{f}</span>
                        </li>
                      ))}
                      {tier.missing.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-gray-400">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      plan?.hasSubscription ? (
                        <button onClick={handleManage} disabled={checkoutLoading === "manage"}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                          {checkoutLoading === "manage" ? "Loading..." : "Manage Subscription"}
                        </button>
                      ) : (
                        <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center text-gray-400 border-2 border-gray-100">
                          Current Plan
                        </div>
                      )
                    ) : tier.id === "FREE" ? (
                      isDowngrade && plan?.hasSubscription ? (
                        <button onClick={handleManage} disabled={!!checkoutLoading}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                          Downgrade
                        </button>
                      ) : (
                        <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center text-gray-400 border-2 border-gray-100">
                          Free Forever
                        </div>
                      )
                    ) : isDowngrade ? (
                      <button onClick={handleManage} disabled={!!checkoutLoading}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                        Switch Plan
                      </button>
                    ) : (
                      <button onClick={() => handleCheckout(tier.id)} disabled={!!checkoutLoading}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:shadow-md"
                        style={{ backgroundColor: "#FF7A59" }}>
                        {checkoutLoading === tier.id ? "Loading..." : isUpgrade ? `Upgrade to ${tier.name}` : `Start ${tier.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Enterprise */}
            <div className="mt-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-bold">Enterprise</h3>
                <p className="text-sm text-white/60 mt-1">Unlimited workflows, multi-portal, white-label, dedicated support.</p>
              </div>
              <a href="https://meetings-eu1.hubspot.com/kbredekamp1" target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition-colors">
                Book a Call →
              </a>
            </div>

            <div className="text-center mt-8">
              <Link href={portalId ? `/dashboard?portal=${portalId}` : "/connect"}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                ← Back to dashboard
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
