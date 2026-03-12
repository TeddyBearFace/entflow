import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
      typescript: true,
    })
  : null;

// Price IDs for each paid tier — set in environment variables
export const PRICE_IDS: Record<string, string> = {
  STARTER: process.env.STRIPE_STARTER_PRICE_ID || "",
  GROWTH: process.env.STRIPE_GROWTH_PRICE_ID || "",
  PRO: process.env.STRIPE_PRO_PRICE_ID || "",
};

// Reverse lookup: Stripe price ID → plan tier
export function tierFromPriceId(priceId: string): string | null {
  for (const [tier, pid] of Object.entries(PRICE_IDS)) {
    if (pid && pid === priceId) return tier;
  }
  return null;
}

// Legacy export for backward compat
export const PRO_PRICE_ID = PRICE_IDS.PRO;
