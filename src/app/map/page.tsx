import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WorkflowMap from "@/components/map/WorkflowMap";
import NavBar from "@/components/NavBar";

interface MapPageProps {
  searchParams: { portal?: string };
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const portalId = searchParams.portal;

  if (!portalId) {
    redirect("/connect");
  }

  // Verify portal exists
  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: { id: true, name: true, syncStatus: true, lastSyncedAt: true },
  });

  if (!portal) {
    redirect("/connect");
  }

  return (
    <div className="h-screen flex flex-col">
      <NavBar portalId={portalId} portalName={portal.name || undefined} />

      {/* Map takes remaining height */}
      <main className="flex-1 overflow-hidden">
        <WorkflowMap portalId={portalId} portalName={portal.name || undefined} />
      </main>
    </div>
  );
}
