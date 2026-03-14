import { prisma } from "@/lib/prisma";

/**
 * Track an analytics event. Fire-and-forget — never blocks the caller.
 */
export function trackEvent(
  event: string,
  opts?: { portalId?: string; userId?: string; metadata?: Record<string, any> }
) {
  prisma.analyticsEvent
    .create({
      data: {
        event,
        portalId: opts?.portalId,
        userId: opts?.userId,
        metadata: opts?.metadata || undefined,
      },
    })
    .catch((err) => {
      console.error("[Analytics] Failed to track event:", err);
    });
}
