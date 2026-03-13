// app/api/analyst/workflows/route.ts
// Returns workflows with actions + enrollment data for the AI analyst

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");

  if (!portalId) {
    return NextResponse.json({ error: "portalId required" }, { status: 400 });
  }

  try {
    const workflows = await prisma.workflow.findMany({
      where: { portalId },
      select: {
        id: true,
        hubspotFlowId: true,
        name: true,
        objectType: true,
        status: true,
        flowType: true,
        actionCount: true,
        enrollmentCriteria: true,
        actions: true,
        description: true,
        hubspotUpdatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    // Shape for the analyst dashboard
    const shaped = workflows.map((w) => ({
      id: w.id,
      name: w.name,
      objectType: w.objectType?.toLowerCase() || "contact",
      status: w.status,
      description: w.description || undefined,
      enrollmentCriteria: w.enrollmentCriteria
        ? JSON.stringify(w.enrollmentCriteria)
        : undefined,
      definition: {
        name: w.name,
        objectType: w.objectType,
        flowType: w.flowType,
        enrollmentCriteria: w.enrollmentCriteria,
        actions: w.actions,
        steps: w.actions, // alias for the local scorer
      },
    }));

    // Get portal tier for gating
    const portal = await prisma.portal.findUnique({
      where: { id: portalId },
      select: { planTier: true },
    });

    return NextResponse.json({
      workflows: shaped,
      tier: portal?.planTier || "FREE",
    });
  } catch (err) {
    console.error("[analyst/workflows] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}
