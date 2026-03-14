// POST /api/webhooks/hubspot
// HubSpot sends a webhook when a user uninstalls the app from their portal.
// Docs: https://developers.hubspot.com/docs/api/webhooks
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/analytics";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const events = JSON.parse(rawBody);

    // Verify the webhook signature if HUBSPOT_CLIENT_SECRET is set
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    if (clientSecret) {
      const signature = request.headers.get("x-hubspot-signature-v3");
      const timestamp = request.headers.get("x-hubspot-request-timestamp");

      if (signature && timestamp) {
        const uri = `${process.env.NEXT_PUBLIC_APP_URL || "https://entflow.app"}/api/webhooks/hubspot`;
        const sourceString = `POST${uri}${rawBody}${timestamp}`;
        const hash = crypto
          .createHmac("sha256", clientSecret)
          .update(sourceString)
          .digest("base64");

        if (hash !== signature) {
          console.error("[webhook] Invalid HubSpot signature");
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
      }
    }

    if (!Array.isArray(events)) {
      console.log("[webhook] Non-array payload:", rawBody.slice(0, 200));
      return NextResponse.json({ received: true });
    }

    for (const event of events) {
      const { subscriptionType, portalId: hsPortalId, appId } = event;

      console.log(`[webhook] Event: ${subscriptionType} for portal ${hsPortalId}`);

      // Handle app uninstall
      if (subscriptionType === "application.deauthorized") {
        const portal = await prisma.portal.findUnique({
          where: { hubspotPortalId: String(hsPortalId) },
          select: {
            id: true,
            name: true,
            planTier: true,
            hubspotPortalId: true,
            _count: { select: { workflows: true, userPortals: true } },
          },
        });

        if (portal) {
          // Track the uninstall
          trackEvent("portal_disconnect", {
            portalId: portal.id,
            metadata: {
              source: "hubspot_uninstall",
              portalName: portal.name,
              hubspotPortalId: portal.hubspotPortalId,
              planTier: portal.planTier,
              workflowCount: portal._count.workflows,
              userCount: portal._count.userPortals,
            },
          });

          // Mark the portal as disconnected (update sync status)
          await prisma.portal.update({
            where: { id: portal.id },
            data: {
              syncStatus: "FAILED",
              syncMessage: "HubSpot app was uninstalled by portal admin",
              accessToken: "revoked",
              refreshToken: "revoked",
            },
          });

          console.log(`[webhook] Portal ${portal.hubspotPortalId} (${portal.name}) marked as disconnected`);
        } else {
          console.log(`[webhook] No portal found for HubSpot ID ${hsPortalId}`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Error processing HubSpot webhook:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// HubSpot also sends GET requests to verify the webhook URL
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
