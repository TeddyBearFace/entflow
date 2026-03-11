import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  const edges = await prisma.customEdge.findMany({ where: { portalId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(edges);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { portalId, sourceNodeId, targetNodeId, label, color, edgeType, animated } = body;
  if (!portalId || !sourceNodeId || !targetNodeId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const edge = await prisma.customEdge.create({
    data: { portalId, sourceNodeId, targetNodeId, label: label || null, color: color || "#6366f1", edgeType: edgeType || "default", animated: animated || false },
  });
  return NextResponse.json(edge);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const edgeId = searchParams.get("edgeId");
  if (!edgeId) return NextResponse.json({ error: "edgeId required" }, { status: 400 });

  await prisma.customEdge.delete({ where: { id: edgeId } });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { edgeId, ...updates } = body;
  if (!edgeId) return NextResponse.json({ error: "edgeId required" }, { status: 400 });

  const edge = await prisma.customEdge.update({
    where: { id: edgeId },
    data: updates,
  });
  return NextResponse.json(edge);
}
