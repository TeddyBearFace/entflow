import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    const { portalId } = await request.json();
    if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

    const portal = await prisma.portal.findUnique({ where: { id: portalId } });
    if (!portal || !portal.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: portal.stripeCustomerId,
      return_url: `${appUrl}/dashboard?portal=${portalId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Portal failed" }, { status: 500 });
  }
}
