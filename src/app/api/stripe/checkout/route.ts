import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, PRO_PRICE_ID } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    const { portalId } = await request.json();
    if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

    const portal = await prisma.portal.findUnique({ where: { id: portalId } });
    if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

    if (!PRO_PRICE_ID) return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 });

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
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/dashboard?portal=${portalId}&upgraded=true`,
      cancel_url: `${appUrl}/dashboard?portal=${portalId}`,
      metadata: { portalId },
      subscription_data: { metadata: { portalId } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Checkout failed" }, { status: 500 });
  }
}
