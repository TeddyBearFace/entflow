// POST /api/positions - Save node positions after dragging
// Body: { portalId, positions: [{ nodeId, positionX, positionY }] }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portalId, positions } = body;

    if (!portalId || !positions || !Array.isArray(positions)) {
      return NextResponse.json(
        { error: "portalId and positions array are required" },
        { status: 400 }
      );
    }

    // Upsert all positions in a transaction
    await prisma.$transaction(
      positions.map((pos: { nodeId: string; positionX: number; positionY: number }) =>
        prisma.nodePosition.upsert({
          where: {
            portalId_nodeId: { portalId, nodeId: pos.nodeId },
          },
          update: {
            positionX: pos.positionX,
            positionY: pos.positionY,
          },
          create: {
            portalId,
            nodeId: pos.nodeId,
            positionX: pos.positionX,
            positionY: pos.positionY,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save positions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save positions" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  if (!portalId) {
    return NextResponse.json({ error: "portalId is required" }, { status: 400 });
  }

  const positions = await prisma.nodePosition.findMany({
    where: { portalId },
  });

  // Return as a map for easy lookup
  const positionMap: Record<string, { x: number; y: number }> = {};
  for (const p of positions) {
    positionMap[p.nodeId] = { x: p.positionX, y: p.positionY };
  }

  return NextResponse.json({ positions: positionMap });
}
