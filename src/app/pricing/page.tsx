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

// ── Tier definitions ──────────────────────────────────────────────
const TIERS = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    period: "",
    desc: "See your workflows clearly",
    audience: "Solo ops exploring their HubSpot setup",
    features: [
      "10 workflows",
      "Dependency map",
      "Conflict detection",
      "Changelog + diffs",
      "Sync every 2 hours",
      "AI health scores (local)",
    ],
    missing: [
      "AI deep analysis",
      "AI trigger ordering",
      "Tags",
      "Property impact",
      "Export",
      "Canvas tools",
      "Auto-sync",
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    price: 9,
    period: "/mo",
    desc: "Dig deeper, export your work",
    audience: "Ops managers with a growing portal",
    features: [
      "25 workflows",
      "Everything in Free",
      "Unlimited manual sync",
      "Workflow tagging",
      "Property impact (view)",
      "PNG + CSV export",
      "AI deep analysis (10/mo)",
      "AI trigger ordering",
    ],
    missing: [
      "Canvas tools",
      "Property conflict detail",
      "SVG/PDF export",
      "Auto-sync",
    ],
  },
  {
    id: "GROWTH",
    name: "Growth",
    price: 19,
    period: "/mo",
    popular: true,
    desc: "Full visibility for RevOps teams",
    audience: "Teams managing complex automation",
    features: [
      "100 workflows",
      "Everything in Starter",
      "Property conflict detail",
      "Canvas: sections + stickies",
      "PNG + CSV export",
      "AI deep analysis (50/mo)",
      "AI trigger ordering",
    ],
    missing: ["Full canvas toolkit", "SVG/PDF export", "Auto-sync"],
  },
  {
    id: "PRO",
    name: "Pro",
    price: 29,
    period: "/mo",
    desc: "Full toolkit, zero limits",
    audience: "Agencies & senior RevOps leads",
    features: [
      "300 workflows",
      "Everything in Growth",
      "Full canvas toolkit",
      "SVG + PDF export",
      "Auto-sync",
      "Unlimited AI deep analysis",
      "AI trigger ordering",
      "Priority support",
    ],
    missing: [],
  },
];

// ── Comparison table data ─────────────────────────────────────────
const COMPARISON_SECTIONS = [
  {
    title: "Workflow mapping",
    rows: [
      { feature: "Workflows", free: "10", starter: "25", growth: "100", pro: "300" },
      { feature: "Dependency map", free: true, starter: true, growth: true, pro: true },
      { feature: "Conflict detection", free: true, starter: true, growth: true, pro: true },
      { feature: "Property conflict detail", free: false, starter: false, growth: true, pro: true },
      { feature: "Property impact view", free: false, starter: true, growth: true, pro: true },
      { feature: "Changelog + diffs", free: true, starter: true, growth: true, pro: true },
      { feature: "Workflow tagging", free: false, starter: true, growth: true, pro: true },
    ],
  },
  {
    title: "AI analyst",
    rows: [
      { feature: "Health scores (local)", free: true, starter: true, growth: true, pro: true },
      { feature: "AI deep analysis", free: false, starter: "10/mo", growth: "50/mo", pro: "Unlimited" },
      { feature: "AI trigger ordering", free: false, starter: true, growth: true, pro: true },
    ],
  },
  {
    title: "Canvas & export",
    rows: [
      { feature: "Canvas sections + stickies", free: false, starter: false, growth: true, pro: true },
      { feature: "Full canvas toolkit", free: false, starter: false, growth: false, pro: true },
      { feature: "PNG + CSV export", free: false, starter: true, growth: true, pro: true },
      { feature: "SVG + PDF export", free: false, starter: false, growth: false, pro: true },
    ],
  },
  {
    title: "Sync & support",
    rows: [
      { feature: "Sync frequency", free: "Every 2hr", starter: "Manual", growth: "Manual", pro: "Auto" },
      { feature: "Unlimited manual sync", free: false, starter: true, growth: true, pro: true },
      { feature: "Auto-sync", free: false, starter: false, growth: false, pro: true },
      { feature: "Priority support", free: false, starter: false, growth: false, pro: true },
    ],
  },
];

// ── Cell renderer ─────────────────────────────────────────────────
function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return (
      <span className="text-sm font-medium text-gray-900">{value}</span>
    );
  }
  if (value) {
    return (
      <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function PricingPage() {
  const searchParams = useSearchParams();
  const portalId = searchParams.get("portal") || "";
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (!portalId) {
      setLoading(false);
      return;
    }
    fetch(`/api/plan?portalId=${portalId}`)
      .then((r) => r.json())
      .then((data) => {
        setPlan(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [portalId]);

  const handleCheckout = useCallback(
    async (tier: string) => {
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
    },
    [portalId]
  );

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

  const currentTierIndex = TIERS.findIndex((t) => t.id === plan?.tier);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar portalId={portalId} />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Choose your plan
          </h1>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            {plan ? (
              <>
                You{"'"}re on the{" "}
                <span className="font-semibold text-gray-800">
                  {plan.name}
                </span>{" "}
                plan with {plan.workflowCount} workflow
                {plan.workflowCount !== 1 ? "s" : ""}.
              </>
            ) : (
              <>
                Every plan includes workflow mapping and health scores.
                Upgrade for AI-powered analysis, canvas tools, and more.
              </>
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* ── Plan cards ───────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {TIERS.map((tier, i) => {
                const isCurrent = plan?.tier === tier.id;
                const isDowngrade = currentTierIndex > i;
                const isUpgrade =
                  currentTierIndex >= 0 && currentTierIndex < i;

                return (
                  <div
                    key={tier.id}
                    className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
                      isCurrent
                        ? "border-blue-500 bg-blue-50/30 shadow-md"
                        : (tier as any).popular
                          ? "border-blue-300 bg-white shadow-sm"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    {/* Badges */}
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

                    {/* Plan name + price */}
                    <h3 className="text-lg font-bold text-gray-900">
                      {tier.name}
                    </h3>
                    <div className="mt-2 mb-1">
                      <span className="text-3xl font-bold text-gray-900">
                        {tier.price === 0 ? "Free" : `$${tier.price}`}
                      </span>
                      {tier.period && (
                        <span className="text-sm text-gray-500">
                          {tier.period}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{tier.desc}</p>
                    <p className="text-[11px] text-gray-400 mb-5 italic">
                      {tier.audience}
                    </p>

                    {/* Features list */}
                    <ul className="space-y-2 mb-6 flex-1">
                      {tier.features.map((f) => {
                        const isAI =
                          f.toLowerCase().includes("ai ") ||
                          f.toLowerCase().startsWith("ai ");
                        return (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            {isAI ? (
                              <svg
                                className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="m14 7 3 3"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                            <span
                              className={
                                isAI
                                  ? "text-violet-700 font-medium"
                                  : "text-gray-700"
                              }
                            >
                              {f}
                            </span>
                          </li>
                        );
                      })}
                      {tier.missing.map((f) => {
                        const isAI =
                          f.toLowerCase().includes("ai ") ||
                          f.toLowerCase().startsWith("ai ");
                        return (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            <svg
                              className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span className="text-gray-400">{f}</span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* CTA buttons — unchanged logic */}
                    {isCurrent ? (
                      plan?.hasSubscription ? (
                        <button
                          onClick={handleManage}
                          disabled={checkoutLoading === "manage"}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          {checkoutLoading === "manage"
                            ? "Loading..."
                            : "Manage Subscription"}
                        </button>
                      ) : (
                        <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center text-gray-400 border-2 border-gray-100">
                          Current Plan
                        </div>
                      )
                    ) : tier.id === "FREE" ? (
                      isDowngrade && plan?.hasSubscription ? (
                        <button
                          onClick={handleManage}
                          disabled={!!checkoutLoading}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          Downgrade
                        </button>
                      ) : (
                        <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center text-gray-400 border-2 border-gray-100">
                          Free Forever
                        </div>
                      )
                    ) : isDowngrade ? (
                      <button
                        onClick={handleManage}
                        disabled={!!checkoutLoading}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Switch Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckout(tier.id)}
                        disabled={!!checkoutLoading}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:shadow-md"
                        style={{ backgroundColor: "#FF7A59" }}
                      >
                        {checkoutLoading === tier.id
                          ? "Loading..."
                          : isUpgrade
                            ? `Upgrade to ${tier.name}`
                            : `Start ${tier.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Enterprise ───────────────────────────────────── */}
            <div className="mt-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between text-white gap-4">
              <div>
                <h3 className="text-lg font-bold">Enterprise</h3>
                <p className="text-sm text-white/60 mt-1">
                  Unlimited workflows, unlimited AI analysis, multi-portal,
                  white-label, dedicated support.
                </p>
              </div>
              <a
                href="https://meetings-eu1.hubspot.com/kbredekamp1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
              >
                Book a Call →
              </a>
            </div>

            {/* ── AI Feature callout ───────────────────────────── */}
            <div className="mt-10 rounded-2xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
                    <path d="m14 7 3 3" />
                    <path d="M5 6v4" />
                    <path d="M19 14v4" />
                    <path d="M10 2v2" />
                    <path d="M7 8H3" />
                    <path d="M21 16h-4" />
                    <path d="M11 3H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    AI Workflow Analyst
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-200 text-violet-700 uppercase tracking-wide">
                      New
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-800 mb-1">
                        Health Scores
                      </p>
                      <p className="text-gray-600">
                        Every workflow gets an instant A–F grade with
                        issue flags. Free for all plans — no AI calls
                        needed.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 mb-1">
                        Deep Analysis
                      </p>
                      <p className="text-gray-600">
                        AI audits your workflow for compliance gaps, logic
                        errors, deliverability risks, and gives specific
                        fix suggestions. Paid plans only.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 mb-1">
                        Trigger Ordering
                      </p>
                      <p className="text-gray-600">
                        AI maps how your workflows chain together through
                        the customer lifecycle — from lead capture to
                        retention. Paid plans only.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Compare plans toggle ──────────────────────────── */}
            <div className="mt-10 text-center">
              <button
                onClick={() => setShowComparison((v) => !v)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showComparison ? "Hide" : "Compare all features"}
                <svg
                  className={`w-4 h-4 transition-transform ${showComparison ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {/* ── Comparison table ──────────────────────────────── */}
            {showComparison && (
              <div className="mt-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    {/* Header */}
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-4 px-5 text-gray-500 font-medium w-[240px]">
                          Feature
                        </th>
                        {TIERS.map((t) => (
                          <th
                            key={t.id}
                            className="text-center py-4 px-4 font-bold text-gray-900"
                          >
                            <div>{t.name}</div>
                            <div className="text-xs font-normal text-gray-400 mt-0.5">
                              {t.price === 0
                                ? "Free"
                                : `$${t.price}/mo`}
                            </div>
                          </th>
                        ))}
                        <th className="text-center py-4 px-4 font-bold text-gray-900">
                          <div>Enterprise</div>
                          <div className="text-xs font-normal text-gray-400 mt-0.5">
                            Custom
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON_SECTIONS.map((section) => (
                        <>
                          {/* Section header */}
                          <tr key={`section-${section.title}`}>
                            <td
                              colSpan={6}
                              className="pt-5 pb-2 px-5 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50"
                            >
                              {section.title}
                            </td>
                          </tr>
                          {/* Rows */}
                          {section.rows.map((row) => (
                            <tr
                              key={row.feature}
                              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="py-3 px-5 text-gray-700">
                                {row.feature}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <ComparisonCell value={row.free} />
                              </td>
                              <td className="py-3 px-4 text-center">
                                <ComparisonCell value={row.starter} />
                              </td>
                              <td className="py-3 px-4 text-center">
                                <ComparisonCell value={row.growth} />
                              </td>
                              <td className="py-3 px-4 text-center">
                                <ComparisonCell value={row.pro} />
                              </td>
                              <td className="py-3 px-4 text-center">
                                <ComparisonCell value={true} />
                              </td>
                            </tr>
                          ))}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── FAQ ──────────────────────────────────────────── */}
            <div className="mt-14 max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
                Common questions
              </h2>
              <div className="space-y-4">
                {[
                  {
                    q: "What are AI health scores vs deep analysis?",
                    a: "Health scores run locally in your browser — every plan gets them for free. They check for common issues like missing suppression lists and deep nesting. Deep analysis uses AI to audit your workflow for compliance gaps, logic errors, and gives specific fix suggestions. That requires a paid plan.",
                  },
                  {
                    q: "What happens if I hit my workflow limit?",
                    a: "Your existing workflows keep working, but you won't be able to sync new ones until you upgrade or remove some. We'll let you know when you're close to your limit.",
                  },
                  {
                    q: "Can I switch plans at any time?",
                    a: "Yes — upgrades take effect immediately and downgrades apply at the end of your billing period. No lock-in, cancel anytime.",
                  },
                  {
                    q: "What's included in the Enterprise plan?",
                    a: "Unlimited workflows, unlimited AI analysis, multi-portal support, white-label options, custom integrations, and a dedicated account manager. Book a call to discuss your needs.",
                  },
                  {
                    q: "Do you offer annual pricing?",
                    a: "Not yet — but it's coming soon. When it does, annual plans will include a discount.",
                  },
                ].map(({ q, a }) => (
                  <details key={q} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                      {q}
                      <svg
                        className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </summary>
                    <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                      {a}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* ── Back link ────────────────────────────────────── */}
            <div className="text-center mt-10">
              <Link
                href={
                  portalId
                    ? `/dashboard?portal=${portalId}`
                    : "/connect"
                }
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to dashboard
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
