import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: {
      syncStatus: true,
      syncProgress: true,
      syncTotal: true,
      syncMessage: true,
      lastSyncedAt: true,
      updatedAt: true,
    },
  });

  if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  // Auto-detect stale SYNCING (stuck for >5 min)
  let status = portal.syncStatus;
  let message = portal.syncMessage;
  if (status === "SYNCING") {
    const staleMinutes = (Date.now() - new Date(portal.updatedAt).getTime()) / 60000;
    if (staleMinutes > 5) {
      await prisma.portal.update({
        where: { id: portalId },
        data: { syncStatus: "FAILED", syncMessage: "Sync timed out — please try again or reconnect HubSpot" },
      });
      status = "FAILED";
      message = "Sync timed out — please try again or reconnect HubSpot";
    }
  }

  return NextResponse.json({
    status,
    progress: portal.syncProgress,
    total: portal.syncTotal,
    message,
    lastSyncedAt: portal.lastSyncedAt,
    percent: portal.syncTotal > 0 ? Math.round((portal.syncProgress / portal.syncTotal) * 100) : 0,
  });
}