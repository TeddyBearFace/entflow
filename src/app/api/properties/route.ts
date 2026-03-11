// GET /api/properties?portalId=xxx
// Returns the property index showing which workflows touch each property.
// Optional: ?search=lifecycle to filter by property name.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const portalId = params.get("portalId");
  const search = params.get("search");

  if (!portalId) {
    return NextResponse.json(
      { error: "portalId is required" },
      { status: 400 }
    );
  }

  try {
    const where: any = { portalId };

    if (search) {
      where.propertyName = { contains: search, mode: "insensitive" };
    }

    const properties = await prisma.propertyIndex.findMany({
      where,
      orderBy: { propertyName: "asc" },
    });

    // Resolve workflow names for the IDs
    const allWorkflowIds = new Set<string>();
    for (const prop of properties) {
      prop.readByWorkflows.forEach((id) => allWorkflowIds.add(id));
      prop.writtenByWorkflows.forEach((id) => allWorkflowIds.add(id));
    }

    const workflows = await prisma.workflow.findMany({
      where: {
        portalId,
        hubspotFlowId: { in: Array.from(allWorkflowIds) },
      },
      select: {
        id: true,
        hubspotFlowId: true,
        name: true,
        status: true,
      },
    });

    const workflowLookup = new Map(
      workflows.map((w) => [w.hubspotFlowId, w])
    );

    // Enrich property data with workflow names
    const enriched = properties.map((prop) => ({
      propertyName: prop.propertyName,
      objectType: prop.objectType,
      readBy: prop.readByWorkflows
        .map((id) => workflowLookup.get(id))
        .filter(Boolean),
      writtenBy: prop.writtenByWorkflows
        .map((id) => workflowLookup.get(id))
        .filter(Boolean),
      totalReferences:
        prop.readByWorkflows.length + prop.writtenByWorkflows.length,
      hasMultipleWriters: prop.writtenByWorkflows.length > 1,
    }));

    return NextResponse.json({
      properties: enriched,
      total: enriched.length,
    });
  } catch (err) {
    console.error("Properties API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch properties" },
      { status: 500 }
    );
  }
}
