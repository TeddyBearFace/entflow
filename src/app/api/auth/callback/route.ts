// GET /api/auth/hubspot/callback
// HubSpot redirects here after the user grants access.
// Exchanges the auth code for tokens, saves the portal, links to user, triggers first sync.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { exchangeCodeForTokens, savePortalConnection } from "@/lib/hubspot";
import { syncPortal } from "@/lib/sync";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Must be logged in to connect a portal
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.redirect(
      `${appUrl}/login?callbackUrl=${encodeURIComponent("/api/auth/hubspot")}`
    );
  }

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

    // Link portal to user (upsert so reconnecting doesn't fail)
    await prisma.userPortal.upsert({
      where: { userId_portalId: { userId, portalId } },
      update: { role: "owner" },
      create: { userId, portalId, role: "owner" },
    });

    // Trigger first sync (non-blocking)
    syncPortal(portalId).catch((err) =>
      console.error(`Background sync failed for portal ${portalId}:`, err)
    );

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
