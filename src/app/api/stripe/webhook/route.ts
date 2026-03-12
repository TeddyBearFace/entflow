import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, tierFromPriceId } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

/** Resolve plan tier from subscription — checks metadata first, then price ID */
function resolveTier(subscription: Stripe.Subscription): string {
  // Check metadata (set during checkout)
  const metaTier = subscription.metadata?.tier;
  if (metaTier && ["STARTER", "GROWTH", "PRO", "ENTERPRISE"].includes(metaTier)) return metaTier;

  // Fallback: resolve from price ID
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (priceId) {
    const tier = tierFromPriceId(priceId);
    if (tier) return tier;
  }

  // Final fallback
  return "PRO";
}

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
          const tier = resolveTier(subscription);
          await prisma.portal.update({
            where: { id: portalId },
            data: {
              planTier: tier as any,
              stripeSubscriptionId: subscription.id,
              stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            },
          });
          console.log(`[Stripe] Portal ${portalId} upgraded to ${tier}`);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const portalId = subscription.metadata?.portalId;
          if (portalId) {
            const tier = resolveTier(subscription);
            await prisma.portal.update({
              where: { id: portalId },
              data: {
                planTier: tier as any,
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
          const tier = isActive ? resolveTier(subscription) : "FREE";
          await prisma.portal.update({
            where: { id: portalId },
            data: {
              planTier: tier as any,
              stripeSubscriptionId: subscription.id,
              stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            },
          });
          console.log(`[Stripe] Portal ${portalId} subscription updated: ${subscription.status} → ${tier}`);
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
