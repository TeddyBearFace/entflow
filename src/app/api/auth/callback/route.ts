// GET /api/auth/callback
// HubSpot redirects here after the user grants access.
// Exchanges the auth code for tokens, saves the portal, sets session, triggers first sync.

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
    syncPortal(portalId).catch((err) =>
      console.error(`Background sync failed for portal ${portalId}:`, err)
    );

    // Redirect to dashboard with session cookie
    const response = NextResponse.redirect(
      `${appUrl}/dashboard?portal=${portalId}&connected=true`
    );

    // Set session cookie
    response.cookies.set("entflow_portal", portalId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to connect to HubSpot";
    return NextResponse.redirect(
      `${appUrl}/connect?error=${encodeURIComponent(message)}`
    );
  }
}
