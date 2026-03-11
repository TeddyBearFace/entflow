import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const portal = await prisma.portal.findFirst({
    where: {
      OR: [
        { syncStatus: "COMPLETED" },
        { syncStatus: "SYNCING" },
        { lastSyncedAt: { not: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (portal) {
    redirect(`/dashboard?portal=${portal.id}`);
  }

  redirect("/landing");
}
