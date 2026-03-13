// GET /api/portals - returns portals the current user has access to
// POST /api/portals/disconnect - disconnects a portal

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userPortals = await prisma.userPortal.findMany({
    where: { userId },
    include: {
      portal: {
        select: {
          id: true,
          hubspotPortalId: true,
          name: true,
          planTier: true,
          syncStatus: true,
          lastSyncedAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const portals = userPortals.map((up) => ({
    ...up.portal,
    role: up.role,
  }));

  return NextResponse.json({ portals });
}
