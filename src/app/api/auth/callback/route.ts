// GET /api/auth/callback
// HubSpot redirects here after the user grants access.
// Exchanges the auth code for tokens, saves the portal, and triggers first sync.

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, savePortalConnection } from "@/lib/hubspot";
import { syncPortal } from "@/lib/sync";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle OAuth errors
  if (error) {
    console.error("HubSpot OAuth error:", error);
    return NextResponse.redirect(
      `${appUrl}/connect?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/connect?error=${encodeURIComponent("No authorization code received")}`
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(code);

    // Save the portal connection
    const portalId = await savePortalConnection(tokenResponse);

    // Trigger first sync (non-blocking)
    // We don't await this - it runs in the background
    syncPortal(portalId).catch((err) =>
      console.error(`Background sync failed for portal ${portalId}:`, err)
    );

    // Redirect to dashboard with success
    return NextResponse.redirect(
      `${appUrl}/dashboard?portal=${portalId}&connected=true`
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to connect to HubSpot";
    return NextResponse.redirect(
      `${appUrl}/connect?error=${encodeURIComponent(message)}`
    );
  }
}
