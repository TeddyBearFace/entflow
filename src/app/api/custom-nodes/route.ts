import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  if (!portalId) return NextResponse.json({ error: "portalId is required" }, { status: 400 });

  const nodes = await prisma.customNode.findMany({
    where: { portalId },
    orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ nodes });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portalId, label, nodeType, color, icon, description, positionX, positionY, width, height, textContent, fontSize, fontWeight, fontStyle, textAlign, zIndex } = body;

    if (!portalId || !label) return NextResponse.json({ error: "portalId and label are required" }, { status: 400 });

    const node = await prisma.customNode.create({
      data: {
        portalId,
        label,
        nodeType: nodeType || "stage",
        color: color || "#6366f1",
        icon: icon || null,
        description: description || null,
        textContent: textContent || null,
        fontSize: fontSize || null,
        fontWeight: fontWeight || null,
        fontStyle: fontStyle || null,
        textAlign: textAlign || null,
        zIndex: zIndex ?? 0,
        positionX: positionX || 0,
        positionY: positionY || 0,
        width: width || null,
        height: height || null,
      },
    });
    return NextResponse.json(node);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create node" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const node = await prisma.customNode.update({ where: { id }, data: updates });
    return NextResponse.json(node);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update node" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, ...updates } = body;
    if (!nodeId) return NextResponse.json({ error: "nodeId is required" }, { status: 400 });
    const node = await prisma.customNode.update({ where: { id: nodeId }, data: updates });
    return NextResponse.json(node);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update node" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const nodeId = request.nextUrl.searchParams.get("nodeId");
    if (nodeId) {
      await prisma.customNode.delete({ where: { id: nodeId } });
      return NextResponse.json({ success: true });
    }
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await prisma.customNode.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete node" }, { status: 500 });
  }
}
