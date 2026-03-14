import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { portalId } = await request.json();
  if (!portalId) {
    return NextResponse.json({ error: "portalId required" }, { status: 400 });
  }

  // Verify user owns this portal
  const access = await prisma.userPortal.findUnique({
    where: { userId_portalId: { userId, portalId } },
  });
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get portal info for tracking before we delete
  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: { hubspotPortalId: true, name: true, planTier: true, _count: { select: { workflows: true } } },
  });

  // Track the disconnect event
  trackEvent("portal_disconnect", {
    portalId,
    userId,
    metadata: {
      source: "entflow_ui",
      portalName: portal?.name,
      hubspotPortalId: portal?.hubspotPortalId,
      planTier: portal?.planTier,
      workflowCount: portal?._count.workflows,
    },
  });

  // Remove user-portal link (keeps portal data intact for other users)
  await prisma.userPortal.delete({
    where: { userId_portalId: { userId, portalId } },
  });

  // If no users left on this portal, delete everything
  const remainingUsers = await prisma.userPortal.count({
    where: { portalId },
  });

  if (remainingUsers === 0) {
    await prisma.portal.delete({ where: { id: portalId } });
  }

  return NextResponse.json({ success: true });
}
