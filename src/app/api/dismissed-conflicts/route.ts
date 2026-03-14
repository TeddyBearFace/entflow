import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

// GET — list dismissed conflicts for a portal
export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  const dismissed = await prisma.dismissedConflict.findMany({
    where: { portalId },
    select: { propertyKey: true, dismissedAt: true, dismissedBy: true },
  });

  return NextResponse.json({
    dismissed: dismissed.map(d => d.propertyKey),
    details: dismissed,
  });
}

// POST — dismiss a conflict
export async function POST(request: NextRequest) {
  const { portalId, propertyKey } = await request.json();
  if (!portalId || !propertyKey) {
    return NextResponse.json({ error: "portalId and propertyKey required" }, { status: 400 });
  }

  const userId = await getCurrentUserId();

  await prisma.dismissedConflict.upsert({
    where: { portalId_propertyKey: { portalId, propertyKey } },
    create: { portalId, propertyKey, dismissedBy: userId || undefined },
    update: { dismissedAt: new Date(), dismissedBy: userId || undefined },
  });

  return NextResponse.json({ success: true });
}

// DELETE — restore a dismissed conflict
export async function DELETE(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  const propertyKey = request.nextUrl.searchParams.get("propertyKey");

  if (!portalId || !propertyKey) {
    return NextResponse.json({ error: "portalId and propertyKey required" }, { status: 400 });
  }

  await prisma.dismissedConflict.deleteMany({
    where: { portalId, propertyKey },
  });

  return NextResponse.json({ success: true });
}
