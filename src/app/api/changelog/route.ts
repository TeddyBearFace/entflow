import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const portalId = searchParams.get("portalId");
  const workflowId = searchParams.get("workflowId");
  const changeType = searchParams.get("changeType");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  const where: any = { portalId };
  if (workflowId) where.workflowId = workflowId;
  if (changeType) where.changeType = changeType;

  const [entries, total] = await Promise.all([
    prisma.changelogEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.changelogEntry.count({ where }),
  ]);

  // Get unique change types for filter
  const changeTypes = await prisma.changelogEntry.groupBy({
    by: ["changeType"],
    where: { portalId },
    _count: true,
  });

  return NextResponse.json({ entries, total, changeTypes, limit, offset });
}
