import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Only return portals that have successfully synced or are currently syncing
  const portals = await prisma.portal.findMany({
    where: {
      OR: [
        { syncStatus: "COMPLETED" },
        { syncStatus: "SYNCING" },
        { lastSyncedAt: { not: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      hubspotPortalId: true,
      name: true,
      syncStatus: true,
      lastSyncedAt: true,
      _count: { select: { workflows: true } },
    },
  });
  return NextResponse.json({ portals });
}

export async function DELETE(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  try {
    // Delete all related data first (cascade should handle most, but be explicit)
    await prisma.$transaction(async (tx) => {
      await tx.changelogEntry.deleteMany({ where: { workflow: { portalId } } });
      await tx.workflowSnapshot.deleteMany({ where: { workflow: { portalId } } });
      await tx.workflowTag.deleteMany({ where: { workflow: { portalId } } });
      await tx.nodePosition.deleteMany({ where: { portalId } });
      await tx.customEdge.deleteMany({ where: { portalId } });
      await tx.customNode.deleteMany({ where: { portalId } });
      await tx.conflictWorkflow.deleteMany({ where: { conflict: { portalId } } });
      await tx.conflict.deleteMany({ where: { portalId } });
      await tx.dependency.deleteMany({ where: { portalId } });
      await tx.propertyIndex.deleteMany({ where: { portalId } });
      await tx.syncLog.deleteMany({ where: { portalId } });
      await tx.pipelineStage.deleteMany({ where: { pipeline: { portalId } } });
      await tx.pipeline.deleteMany({ where: { portalId } });
      await tx.marketingEmail.deleteMany({ where: { portalId } });
      await tx.crmList.deleteMany({ where: { portalId } });
      await tx.tag.deleteMany({ where: { portalId } });
      await tx.workflow.deleteMany({ where: { portalId } });
      await tx.portal.delete({ where: { id: portalId } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to disconnect" }, { status: 500 });
  }
}
