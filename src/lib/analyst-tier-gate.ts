// lib/analyst-tier-gate.ts
// Entflow tier gating for AI workflow analysis

export type EntflowTier = "free" | "starter" | "growth" | "pro" | "enterprise";

export interface TierConfig {
  hasAIAnalysis: boolean;
  monthlyAILimit: number | null; // null = unlimited
  label: string;
  upgradeMessage: string;
}

export const TIER_CONFIG: Record<EntflowTier, TierConfig> = {
  free: {
    hasAIAnalysis: false,
    monthlyAILimit: 0,
    label: "Free",
    upgradeMessage:
      "Upgrade to Starter ($9/mo) or higher to unlock AI-powered deep workflow analysis.",
  },
  starter: {
    hasAIAnalysis: true,
    monthlyAILimit: 10,
    label: "Starter",
    upgradeMessage:
      "You've used all 10 AI analyses this month. Upgrade to Growth for 50/month.",
  },
  growth: {
    hasAIAnalysis: true,
    monthlyAILimit: 50,
    label: "Growth",
    upgradeMessage:
      "You've used all 50 AI analyses this month. Upgrade to Pro for unlimited.",
  },
  pro: {
    hasAIAnalysis: true,
    monthlyAILimit: null,
    label: "Pro",
    upgradeMessage: "",
  },
  enterprise: {
    hasAIAnalysis: true,
    monthlyAILimit: null,
    label: "Enterprise",
    upgradeMessage: "",
  },
};

export function canUseAIAnalysis(
  tier: EntflowTier,
  usedThisMonth: number
): { allowed: boolean; message?: string; remaining?: number } {
  const config = TIER_CONFIG[tier];

  if (!config.hasAIAnalysis) {
    return { allowed: false, message: config.upgradeMessage };
  }

  if (config.monthlyAILimit === null) {
    return { allowed: true };
  }

  if (usedThisMonth >= config.monthlyAILimit) {
    return { allowed: false, message: config.upgradeMessage, remaining: 0 };
  }

  return {
    allowed: true,
    remaining: config.monthlyAILimit - usedThisMonth,
  };
}
