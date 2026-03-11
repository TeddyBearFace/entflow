// Plan tier configuration
// Defines workflow limits and feature access for each plan

export interface PlanConfig {
  name: string;
  workflowLimit: number;
  features: {
    export: boolean;
    canvas: boolean;
    tagging: boolean;
    propertyImpact: boolean;
    manualSync: boolean;
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
    workflowLimit: 10,
    features: {
      export: false,
      canvas: false,
      tagging: false,
      propertyImpact: false,
      manualSync: false,
      autoSync: false,
      multiPortal: false,
      changelog: true,
      conflictDetection: true,
      healthScores: true,
    },
  },
  PRO: {
    name: "Pro",
    workflowLimit: 500,
    features: {
      export: true,
      canvas: true,
      tagging: true,
      propertyImpact: true,
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
    workflowLimit: Infinity,
    features: {
      export: true,
      canvas: true,
      tagging: true,
      propertyImpact: true,
      manualSync: true,
      autoSync: true,
      multiPortal: true,
      changelog: true,
      conflictDetection: true,
      healthScores: true,
    },
  },
};

export function getPlan(tier: string): PlanConfig {
  return PLANS[tier] || PLANS.FREE;
}

export function canAccess(tier: string, feature: keyof PlanConfig["features"]): boolean {
  return getPlan(tier).features[feature];
}
