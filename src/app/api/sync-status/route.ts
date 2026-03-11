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
    },
  });

  if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  return NextResponse.json({
    status: portal.syncStatus,
    progress: portal.syncProgress,
    total: portal.syncTotal,
    message: portal.syncMessage,
    lastSyncedAt: portal.lastSyncedAt,
    percent: portal.syncTotal > 0 ? Math.round((portal.syncProgress / portal.syncTotal) * 100) : 0,
  });
}
