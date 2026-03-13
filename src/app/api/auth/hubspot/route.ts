// GET /api/auth/hubspot
// Redirects the user to HubSpot's OAuth consent screen.
import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/hubspot";

export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}