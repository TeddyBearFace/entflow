// GET /api/conflicts?portalId=xxx
// Returns all detected conflicts for a portal.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");

  if (!portalId) {
    return NextResponse.json(
      { error: "portalId is required" },
      { status: 400 }
    );
  }

  try {
    const conflicts = await prisma.conflict.findMany({
      where: { portalId },
      include: {
        workflows: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
                status: true,
                objectType: true,
              },
            },
          },
        },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });

    // Transform for the frontend
    const formatted = conflicts.map((c) => ({
      id: c.id,
      type: c.type,
      severity: c.severity,
      description: c.description,
      detail: c.detail,
      resolvedAt: c.resolvedAt,
      createdAt: c.createdAt,
      workflows: c.workflows.map((cw) => cw.workflow),
    }));

    const stats = {
      total: conflicts.length,
      critical: conflicts.filter((c) => c.severity === "CRITICAL").length,
      warning: conflicts.filter((c) => c.severity === "WARNING").length,
      info: conflicts.filter((c) => c.severity === "INFO").length,
    };

    return NextResponse.json({ conflicts: formatted, stats });
  } catch (err) {
    console.error("Conflicts API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch conflicts" },
      { status: 500 }
    );
  }
}
