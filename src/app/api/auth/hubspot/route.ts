// GET /api/auth/hubspot
// Redirects the user to HubSpot's OAuth authorization page.

import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/hubspot";

export async function GET() {
  const authUrl = getAuthUrl();
  return NextResponse.redirect(authUrl);
}
