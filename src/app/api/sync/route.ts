// POST /api/sync
// Triggers a manual sync for a portal.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPortal } from "@/lib/sync";
import { waitUntil } from "@vercel/functions"; // ← CHANGE 1: add import

export const maxDuration = 300; // ← CHANGE 2: add 5min timeout

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

    // Enforce 2-hour cooldown for free tier
    if (portal.planTier === "FREE" && portal.lastSyncedAt) {
      const elapsedMs = Date.now() - new Date(portal.lastSyncedAt).getTime();
      const cooldownMs = 2 * 60 * 60 * 1000; // 2 hours
      if (elapsedMs < cooldownMs) {
        const remainingMin = Math.ceil((cooldownMs - elapsedMs) / 60000);
        return NextResponse.json(
          { error: `Free plan: sync available in ${remainingMin} minutes. Upgrade to Pro for unlimited syncs.` },
          { status: 429 }
        );
      }
    }

    // Mark as syncing immediately so UI picks it up
    await prisma.portal.update({ where: { id: portalId }, data: { syncStatus: "SYNCING", syncMessage: "Starting sync..." } });

    // ← CHANGE 3: replace fire-and-forget with waitUntil
    waitUntil(
      syncPortal(portalId).catch(async (err) => {
        console.error(`[Sync] Failed for portal ${portalId}:`, err);
        await prisma.portal.update({
          where: { id: portalId },
          data: {
            syncStatus: "FAILED",
            syncMessage: err instanceof Error ? err.message : "Sync failed unexpectedly",
          },
        });
      })
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