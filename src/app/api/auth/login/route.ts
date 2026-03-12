// POST /api/auth/login
// Sets the session cookie for an existing portal.
// Used when switching portals or returning to a previously connected portal.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { portalId } = await request.json();
  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  // Verify portal exists
  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: { id: true },
  });

  if (!portal) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  const response = NextResponse.json({ success: true, portalId: portal.id });

  response.cookies.set("entflow_portal", portal.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return response;
}
