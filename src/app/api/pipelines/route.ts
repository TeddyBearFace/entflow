// GET /api/pipelines?portalId=xxx
// Returns all pipelines and their stages for a portal.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");

  if (!portalId) {
    return NextResponse.json({ error: "portalId is required" }, { status: 400 });
  }

  try {
    const pipelines = await prisma.pipeline.findMany({
      where: { portalId },
      include: {
        stages: {
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    // Build a flat lookup map: stageId -> label (across all pipelines)
    const stageLookup: Record<string, string> = {};
    const pipelineLookup: Record<string, string> = {};
    const stageOrderLookup: Record<string, string> = {}; // displayOrder -> label

    for (const pipeline of pipelines) {
      pipelineLookup[pipeline.hubspotPipelineId] = pipeline.label;
      for (const stage of pipeline.stages) {
        stageLookup[stage.hubspotStageId] = stage.label;
        // Also map by display order number (some workflows use these)
        stageOrderLookup[String(stage.displayOrder)] = stage.label;
      }
    }

    // Build email lookup
    const emails = await prisma.marketingEmail.findMany({
      where: { portalId },
    });
    const emailLookup: Record<string, { name: string; subject: string; fromName: string; fromEmail: string; replyTo: string; previewText: string }> = {};
    for (const email of emails) {
      emailLookup[email.hubspotEmailId] = {
        name: email.name,
        subject: email.subject || "",
        fromName: email.fromName || "",
        fromEmail: email.fromEmail || "",
        replyTo: email.replyTo || "",
        previewText: email.previewText || "",
      };
    }

    // Build list lookup
    const lists = await prisma.crmList.findMany({
      where: { portalId },
    });
    const listLookup: Record<string, string> = {};
    for (const list of lists) {
      listLookup[list.hubspotListId] = list.name;
    }

    return NextResponse.json({ pipelines, stageLookup, pipelineLookup, stageOrderLookup, emailLookup, listLookup });
  } catch (err) {
    console.error("Pipelines API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch pipelines" },
      { status: 500 }
    );
  }
}
