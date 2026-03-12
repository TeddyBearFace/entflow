import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, PRICE_IDS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    const { portalId, tier } = await request.json();
    if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

    const portal = await prisma.portal.findUnique({ where: { id: portalId } });
    if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

    // Determine which price to use
    const targetTier = (tier || "PRO").toUpperCase();
    const priceId = PRICE_IDS[targetTier];
    if (!priceId) {
      // No price configured for this tier — redirect to landing pricing
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      return NextResponse.json({ url: `${appUrl}/landing#pricing` });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Reuse existing Stripe customer or create new one
    let customerId = portal.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { portalId: portal.id, hubspotPortalId: portal.hubspotPortalId },
        name: portal.name || undefined,
      });
      customerId = customer.id;
      await prisma.portal.update({
        where: { id: portalId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?portal=${portalId}&upgraded=true`,
      cancel_url: `${appUrl}/dashboard?portal=${portalId}`,
      metadata: { portalId, tier: targetTier },
      subscription_data: { metadata: { portalId, tier: targetTier } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Checkout failed" }, { status: 500 });
  }
}
