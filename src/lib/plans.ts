// Plan tier configuration
// Defines workflow limits and feature access for each plan

export interface PlanConfig {
  name: string;
  price: number; // monthly USD, 0 for free, -1 for custom
  workflowLimit: number;
  features: {
    export: boolean;              // PNG + CSV export
    exportAdvanced: boolean;      // SVG + PDF export
    canvas: boolean;              // Basic canvas (sections, stickies)
    canvasAdvanced: boolean;      // Full toolkit (shapes, text, connectors)
    tagging: boolean;
    propertyImpact: boolean;      // View property index
    propertyConflicts: boolean;   // See write collision detail in property impact
    manualSync: boolean;          // Unlimited manual sync (false = 2h cooldown)
    autoSync: boolean;
    multiPortal: boolean;
    changelog: boolean;
    conflictDetection: boolean;
    healthScores: boolean;
  };
}

export const PLANS: Record<string, PlanConfig> = {
  FREE: {
    name: "Free",
    price: 0,
    workflowLimit: 10,
    features: {
      export: false,
      exportAdvanced: false,
      canvas: false,
      canvasAdvanced: false,
      tagging: false,
      propertyImpact: false,
      propertyConflicts: false,
      manualSync: false,
      autoSync: false,
      multiPortal: false,
      changelog: true,
      conflictDetection: true,
      healthScores: true,
    },
  },
  STARTER: {
    name: "Starter",
    price: 9,
    workflowLimit: 25,
    features: {
      export: true,
      exportAdvanced: false,
      canvas: false,
      canvasAdvanced: false,
      tagging: true,
      propertyImpact: true,
      propertyConflicts: false,
      manualSync: true,
      autoSync: false,
      multiPortal: false,
      changelog: true,
      conflictDetection: true,
      healthScores: true,
    },
  },
  GROWTH: {
    name: "Growth",
    price: 19,
    workflowLimit: 100,
    features: {
      export: true,
      exportAdvanced: false,
      canvas: true,
      canvasAdvanced: false,
      tagging: true,
      propertyImpact: true,
      propertyConflicts: true,
      manualSync: true,
      autoSync: false,
      multiPortal: false,
      changelog: true,
      conflictDetection: true,
      healthScores: true,
    },
  },
  PRO: {
    name: "Pro",
    price: 29,
    workflowLimit: 300,
    features: {
      export: true,
      exportAdvanced: true,
      canvas: true,
      canvasAdvanced: true,
      tagging: true,
      propertyImpact: true,
      propertyConflicts: true,
      manualSync: true,
      autoSync: true,
      multiPortal: false,
      changelog: true,
      conflictDetection: true,
      healthScores: true,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: -1,
    workflowLimit: Infinity,
    features: {
      export: true,
      exportAdvanced: true,
      canvas: true,
      canvasAdvanced: true,
      tagging: true,
      propertyImpact: true,
      propertyConflicts: true,
      manualSync: true,
      autoSync: true,
      multiPortal: true,
      changelog: true,
      conflictDetection: true,
      healthScores: true,
    },
  },
};

// Ordered list for upgrade prompts — show the next tier up
export const PLAN_ORDER = ["FREE", "STARTER", "GROWTH", "PRO", "ENTERPRISE"] as const;

export function getPlan(tier: string): PlanConfig {
  return PLANS[tier] || PLANS.FREE;
}

export function canAccess(tier: string, feature: keyof PlanConfig["features"]): boolean {
  return getPlan(tier).features[feature];
}

/** Get the cheapest plan that includes a given feature */
export function cheapestPlanFor(feature: keyof PlanConfig["features"]): PlanConfig | null {
  for (const tier of PLAN_ORDER) {
    if (PLANS[tier].features[feature]) return PLANS[tier];
  }
  return null;
}
