// GET /api/dashboard?portalId=xxx (defined in the layout)
// This file provides the dashboard page with the stats it needs.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // For now, this is a simple redirect to the dashboard page.
  // The actual data fetching happens in server components.
  return NextResponse.json({ message: "Use /dashboard page instead" });
}
