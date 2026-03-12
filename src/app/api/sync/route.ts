// POST /api/sync
// Triggers a manual sync for a portal.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPortal } from "@/lib/sync";

export async function POST(request: NextRequest) {
  try {
    const { portalId } = await request.json();

    if (!portalId) {
      return NextResponse.json(
        { error: "portalId is required" },
        { status: 400 }
      );
    }

    // Verify portal exists
    const portal = await prisma.portal.findUnique({
      where: { id: portalId },
    });

    if (!portal) {
      return NextResponse.json(
        { error: "Portal not found" },
        { status: 404 }
      );
    }

    // Don't allow concurrent syncs (but unstick stale ones after 5 min)
    if (portal.syncStatus === "SYNCING") {
      const staleMinutes = (Date.now() - new Date(portal.updatedAt).getTime()) / 60000;
      if (staleMinutes < 5) {
        return NextResponse.json(
          { error: "Sync already in progress" },
          { status: 409 }
        );
      }
      // Stale sync — reset and allow new one
      console.log(`[Sync] Portal ${portalId} stuck in SYNCING for ${Math.round(staleMinutes)}min, resetting`);
      await prisma.portal.update({
        where: { id: portalId },
        data: { syncStatus: "FAILED", syncMessage: "Previous sync timed out" },
      });
    }

    // Trigger sync (non-blocking - return immediately, let client poll for progress)
    syncPortal(portalId).catch(err =>
      console.error(`Sync failed for portal ${portalId}:`, err)
    );

    return NextResponse.json({ started: true, portalId });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

// GET /api/sync?portalId=xxx
// Get sync status and history for a portal.
export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");

  if (!portalId) {
    return NextResponse.json(
      { error: "portalId is required" },
      { status: 400 }
    );
  }

  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: {
      syncStatus: true,
      lastSyncedAt: true,
    },
  });

  if (!portal) {
    return NextResponse.json(
      { error: "Portal not found" },
      { status: 404 }
    );
  }

  const recentLogs = await prisma.syncLog.findMany({
    where: { portalId },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    status: portal.syncStatus,
    lastSyncedAt: portal.lastSyncedAt,
    history: recentLogs,
  });
}
