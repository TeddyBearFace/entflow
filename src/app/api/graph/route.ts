// GET /api/graph?portalId=xxx
// Returns React Flow-compatible graph data with full action details.
// Supports optional query params for filtering.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildJourneyGraph } from "@/lib/journey";
import type { MapFilters } from "@/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const portalId = params.get("portalId");

  if (!portalId) {
    return NextResponse.json(
      { error: "portalId is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch workflows with full action data for expanded nodes
    const workflows = await prisma.workflow.findMany({
      where: { portalId },
      include: {
        _count: {
          select: {
            sourceDependencies: true,
            targetDependencies: true,
            conflictWorkflows: true,
          },
        },
        workflowTags: {
          include: { tag: true },
        },
      },
    });

    // Fetch all dependencies for this portal
    const dependencies = await prisma.dependency.findMany({
      where: { portalId },
    });

    // Build hubspotFlowId -> name lookup for cross-enrollment labels
    const workflowIdToName = new Map<string, string>();
    for (const wf of workflows) {
      workflowIdToName.set(wf.hubspotFlowId, wf.name);
    }

    // Fetch pipeline data for resolving stage names
    const pipelines = await prisma.pipeline.findMany({
      where: { portalId },
      include: { stages: { orderBy: { displayOrder: "asc" } } },
    });

    const stageLookup: Record<string, string> = {};
    const stageOrderLookup: Record<string, string> = {};
    const pipelineLookup: Record<string, string> = {};
    for (const pipeline of pipelines) {
      pipelineLookup[pipeline.hubspotPipelineId] = pipeline.label;
      for (const stage of pipeline.stages) {
        stageLookup[stage.hubspotStageId] = stage.label;
        stageOrderLookup[String(stage.displayOrder)] = stage.label;
      }
    }

    // Fetch email metadata for resolving email names
    const emails = await prisma.marketingEmail.findMany({
      where: { portalId },
    });
    const emailLookup: Record<string, string> = {};
    for (const email of emails) {
      emailLookup[email.hubspotEmailId] = email.name;
    }

    // Fetch list metadata for resolving list names
    const lists = await prisma.crmList.findMany({
      where: { portalId },
    });
    const listLookup: Record<string, string> = {};
    for (const list of lists) {
      listLookup[list.hubspotListId] = list.name;
    }

    // Parse filter params
    const filters: MapFilters = {
      status: params.get("status")
        ? (params.get("status")!.split(",") as MapFilters["status"])
        : [],
      objectTypes: params.get("objectTypes")
        ? params.get("objectTypes")!.split(",")
        : [],
      dependencyTypes: params.get("dependencyTypes")
        ? params.get("dependencyTypes")!.split(",")
        : [],
      searchQuery: params.get("search") || "",
      properties: params.get("properties")
        ? params.get("properties")!.split(",")
        : [],
    };

    // Build journey graph
    const { nodes, edges, stages } = buildJourneyGraph(
      workflows,
      dependencies,
      workflowIdToName,
      filters,
      { stageLookup, stageOrderLookup, pipelineLookup, emailLookup, listLookup }
    );

    // Summary stats for the filter sidebar
    const stats = {
      totalWorkflows: workflows.length,
      activeCount: workflows.filter((w) => w.status === "ACTIVE").length,
      inactiveCount: workflows.filter((w) => w.status === "INACTIVE").length,
      totalDependencies: dependencies.length,
      objectTypes: [...new Set(workflows.map((w) => w.objectType))],
      dependencyTypes: [...new Set(dependencies.map((d) => d.type))],
    };

    return NextResponse.json({ nodes, edges, stages, stats });
  } catch (err) {
    console.error("Graph data error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build graph" },
      { status: 500 }
    );
  }
}
