import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * Get the current user's ID from the session.
 * Returns null if not logged in.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id || null;
}

/**
 * Check if the current user has access to a portal.
 * Returns the UserPortal record if access is granted, null otherwise.
 */
export async function validatePortalAccess(portalId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  return prisma.userPortal.findUnique({
    where: { userId_portalId: { userId, portalId } },
  });
}

/**
 * Get all portal IDs the current user has access to.
 */
export async function getUserPortalIds(): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const userPortals = await prisma.userPortal.findMany({
    where: { userId },
    select: { portalId: true },
  });

  return userPortals.map((up) => up.portalId);
}

/**
 * Require portal access — returns portalId or throws a Response.
 * Use in API routes: const portalId = await requirePortalAccess(requestedPortalId);
 */
export async function requirePortalAccess(portalId: string): Promise<string> {
  const access = await validatePortalAccess(portalId);
  if (!access) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return portalId;
}
