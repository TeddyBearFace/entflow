import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const portalId = cookies().get("entflow_portal")?.value;

  if (portalId) {
    redirect(`/dashboard?portal=${portalId}`);
  }

  redirect("/landing");
}
