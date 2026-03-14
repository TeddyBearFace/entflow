import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { portalId, sequence } = await request.json();
  if (!portalId || !sequence) {
    return NextResponse.json({ error: "portalId and sequence required" }, { status: 400 });
  }

  await prisma.portal.update({
    where: { id: portalId },
    data: {
      flowTimeline: sequence,
      flowTimelineAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  if (!portalId) {
    return NextResponse.json({ error: "portalId required" }, { status: 400 });
  }

  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: { flowTimeline: true, flowTimelineAt: true },
  });

  if (!portal?.flowTimeline) {
    return NextResponse.json({ sequence: null });
  }

  return NextResponse.json({
    sequence: portal.flowTimeline,
    generatedAt: portal.flowTimelineAt,
  });
}