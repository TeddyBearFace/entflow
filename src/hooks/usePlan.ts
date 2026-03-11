"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlanConfig } from "@/lib/plans";

interface PlanInfo {
  tier: string;
  name: string;
  workflowLimit: number | null;
  workflowCount: number;
  features: PlanConfig["features"];
  hasSubscription: boolean;
  periodEnd: string | null;
}

export function usePlan(portalId: string) {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/plan?portalId=${portalId}`);
      if (res.ok) setPlan(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, [portalId]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const canUse = (feature: keyof PlanConfig["features"]) => {
    if (!plan) return true; // Allow while loading
    return plan.features[feature];
  };

  const isPro = plan?.tier === "PRO" || plan?.tier === "ENTERPRISE";
  const isFree = plan?.tier === "FREE" || !plan;
  const isOverLimit = plan ? (plan.workflowLimit !== null && plan.workflowCount > plan.workflowLimit) : false;

  return { plan, loading, canUse, isPro, isFree, isOverLimit, refresh: fetchPlan };
}
