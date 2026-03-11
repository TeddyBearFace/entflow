import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPortal } from "@/lib/sync";

// POST: Toggle auto-sync or trigger scheduled sync
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { portalId, action, interval } = body;

  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  // Toggle auto-sync
  if (action === "toggle") {
    const portal = await prisma.portal.findUnique({ where: { id: portalId } });
    if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

    const updated = await prisma.portal.update({
      where: { id: portalId },
      data: {
        autoSyncEnabled: !portal.autoSyncEnabled,
        ...(interval ? { autoSyncInterval: interval } : {}),
      },
    });

    return NextResponse.json({
      autoSyncEnabled: updated.autoSyncEnabled,
      autoSyncInterval: updated.autoSyncInterval,
    });
  }

  // Update interval
  if (action === "setInterval" && interval) {
    await prisma.portal.update({
      where: { id: portalId },
      data: { autoSyncInterval: interval },
    });
    return NextResponse.json({ success: true, interval });
  }

  // Trigger auto-sync for all eligible portals (called by cron)
  if (action === "cron") {
    const now = new Date();
    const portals = await prisma.portal.findMany({
      where: {
        autoSyncEnabled: true,
        syncStatus: { not: "IN_PROGRESS" },
      },
    });

    const results = [];
    for (const portal of portals) {
      const intervalMs = (portal.autoSyncInterval || 360) * 60 * 1000;
      const lastSync = portal.lastSyncedAt?.getTime() || 0;

      if (now.getTime() - lastSync >= intervalMs) {
        try {
          const result = await syncPortal(portal.id);
          results.push({ portalId: portal.id, name: portal.name, ...result });
        } catch (err: any) {
          results.push({ portalId: portal.id, name: portal.name, error: err.message });
        }
      }
    }

    return NextResponse.json({ synced: results.length, results });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// GET: Get auto-sync status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const portalId = searchParams.get("portalId");

  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: { autoSyncEnabled: true, autoSyncInterval: true, lastSyncedAt: true, syncStatus: true },
  });

  if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  return NextResponse.json(portal);
}
