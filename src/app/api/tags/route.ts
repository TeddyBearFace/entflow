import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tags?portalId=xxx — list all tags with workflow counts
export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  const tags = await prisma.tag.findMany({
    where: { portalId },
    include: { _count: { select: { workflowTags: true } } },
    orderBy: { name: "asc" },
  });

  // Also fetch all workflow-tag assignments for this portal
  const assignments = await prisma.workflowTag.findMany({
    where: { tag: { portalId } },
    select: { workflowId: true, tagId: true },
  });

  return NextResponse.json({ tags, assignments });
}

// POST /api/tags — create tag or assign tag to workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portalId, action } = body;
    if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

    // Create a new tag
    if (action === "create") {
      const { name, color } = body;
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

      const tag = await prisma.tag.upsert({
        where: { portalId_name: { portalId, name } },
        update: { color: color || undefined },
        create: { portalId, name, color: color || "#6366f1" },
      });
      return NextResponse.json(tag);
    }

    // Assign tag to workflow
    if (action === "assign") {
      const { workflowId, tagId } = body;
      if (!workflowId || !tagId) return NextResponse.json({ error: "workflowId and tagId required" }, { status: 400 });

      const assignment = await prisma.workflowTag.upsert({
        where: { workflowId_tagId: { workflowId, tagId } },
        update: {},
        create: { workflowId, tagId },
      });
      return NextResponse.json(assignment);
    }

    // Remove tag from workflow
    if (action === "unassign") {
      const { workflowId, tagId } = body;
      if (!workflowId || !tagId) return NextResponse.json({ error: "workflowId and tagId required" }, { status: 400 });

      await prisma.workflowTag.deleteMany({
        where: { workflowId, tagId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

// DELETE /api/tags?tagId=xxx — delete a tag entirely
export async function DELETE(request: NextRequest) {
  const tagId = request.nextUrl.searchParams.get("tagId");
  if (!tagId) return NextResponse.json({ error: "tagId required" }, { status: 400 });

  try {
    await prisma.workflowTag.deleteMany({ where: { tagId } });
    await prisma.tag.delete({ where: { id: tagId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
