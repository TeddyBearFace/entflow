import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const portalId = cookies().get("entflow_portal")?.value;

  // Always show the landing page — logged-in users get a dashboard link in the nav
  redirect(portalId ? `/landing?portal=${portalId}` : "/landing");
}