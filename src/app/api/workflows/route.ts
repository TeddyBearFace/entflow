// GET /api/workflows?portalId=xxx
// Returns all workflows for a portal.
// GET /api/workflows?portalId=xxx&workflowId=yyy
// Returns details for a specific workflow.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const portalId = params.get("portalId");
  const workflowId = params.get("workflowId");

  if (!portalId) {
    return NextResponse.json(
      { error: "portalId is required" },
      { status: 400 }
    );
  }

  try {
    // Single workflow detail
    if (workflowId) {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          sourceDependencies: {
            include: {
              targetWorkflow: {
                select: { id: true, name: true, status: true },
              },
            },
          },
          targetDependencies: {
            include: {
              sourceWorkflow: {
                select: { id: true, name: true, status: true },
              },
            },
          },
          conflictWorkflows: {
            include: {
              conflict: true,
            },
          },
        },
      });

      if (!workflow || workflow.portalId !== portalId) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }

      // Get HubSpot portal ID for the workflow link
      const portal = await prisma.portal.findUnique({
        where: { id: portalId },
        select: { hubspotPortalId: true },
      });

      return NextResponse.json({
        ...workflow,
        hubspotPortalId: portal?.hubspotPortalId,
      });
    }

    // All workflows list
    const workflows = await prisma.workflow.findMany({
      where: { portalId },
      select: {
        id: true,
        hubspotFlowId: true,
        name: true,
        objectType: true,
        status: true,
        actionCount: true,
        hubspotUpdatedAt: true,
        _count: {
          select: {
            sourceDependencies: true,
            targetDependencies: true,
            conflictWorkflows: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ workflows });
  } catch (err) {
    console.error("Workflows API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}
