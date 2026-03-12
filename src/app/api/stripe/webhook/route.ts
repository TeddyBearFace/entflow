import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const portalId = session.metadata?.portalId;
        if (portalId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await prisma.portal.update({
            where: { id: portalId },
            data: {
              planTier: "PRO",
              stripeSubscriptionId: subscription.id,
              stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            },
          });
          console.log(`[Stripe] Portal ${portalId} upgraded to PRO`);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const portalId = subscription.metadata?.portalId;
          if (portalId) {
            await prisma.portal.update({
              where: { id: portalId },
              data: {
                planTier: "PRO",
                stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const portalId = subscription.metadata?.portalId;
        if (portalId) {
          const isActive = ["active", "trialing"].includes(subscription.status);
          await prisma.portal.update({
            where: { id: portalId },
            data: {
              planTier: isActive ? "PRO" : "FREE",
              stripeSubscriptionId: subscription.id,
              stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            },
          });
          console.log(`[Stripe] Portal ${portalId} subscription updated: ${subscription.status} → ${isActive ? "PRO" : "FREE"}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const portalId = subscription.metadata?.portalId;
        if (portalId) {
          await prisma.portal.update({
            where: { id: portalId },
            data: {
              planTier: "FREE",
              stripeSubscriptionId: null,
              stripeCurrentPeriodEnd: null,
            },
          });
          console.log(`[Stripe] Portal ${portalId} downgraded to FREE`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
