import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: {
      planTier: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      _count: { select: { workflows: true } },
    },
  });

  if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  const plan = getPlan(portal.planTier);

  return NextResponse.json({
    tier: portal.planTier,
    name: plan.name,
    workflowLimit: plan.workflowLimit === Infinity ? null : plan.workflowLimit,
    workflowCount: portal._count.workflows,
    features: plan.features,
    hasSubscription: !!portal.stripeSubscriptionId,
    periodEnd: portal.stripeCurrentPeriodEnd,
  });
}
