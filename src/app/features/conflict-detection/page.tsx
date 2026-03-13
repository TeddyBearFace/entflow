import { Metadata } from "next";
import FeaturePageLayout from "@/components/FeaturePageLayout";

export const metadata: Metadata = {
  title: "HubSpot Workflow Conflict Detection — Property Collisions | Entflow",
  description: "Detect property write conflicts, circular dependencies, and orphaned enrollments across your HubSpot workflows automatically. Stop silent CRM data issues.",
  openGraph: { title: "HubSpot Workflow Conflict Detection | Entflow", description: "Catch property write collisions and circular dependencies before they break your CRM." },
};

export default function Page() {
  return (
    <FeaturePageLayout
      badge="Core Feature"
      badgeColor="#E11D48"
      badgeBg="#FFF1F2"
      title="Catch workflow conflicts before they break your CRM"
      subtitle="When two HubSpot workflows write to the same property, data gets overwritten silently. Entflow scans every workflow in your portal and flags collisions, circular dependencies, and orphaned enrollments — so you can fix them before they cause damage."
      sections={[
        { title: "Property write collision detection", desc: "Entflow traces every property write action across all your workflows. When two or more workflows write to the same property — lifecycle stage, lead score, deal stage, owner assignment — it flags the collision with both workflow names, the specific steps involved, and the potential data impact. No more guessing why a contact's lifecycle stage keeps flipping back.", bullets: ["Scans all write actions", "Shows both conflicting workflows", "Identifies exact steps", "Flags overwrite risk level"] },
        { title: "Circular dependency warnings", desc: "Workflow A changes a property that enrolls contacts into Workflow B, which changes a property that enrolls contacts back into A. These loops are nearly impossible to spot in HubSpot's native UI, especially when the chain goes through three or more workflows. Entflow traces these chains automatically and warns you before they cause infinite enrollment loops.", bullets: ["Multi-workflow chain tracing", "Re-enrollment loop detection", "Visual chain display", "Loop-break suggestions"] },
        { title: "Lifecycle stage conflicts", desc: "Lifecycle stage is the most commonly conflicted property in HubSpot. Multiple workflows often try to set it — lead scoring sets it to MQL, a form submission sets it to SQL, and an onboarding workflow sets it to Customer. Entflow shows you every workflow that touches lifecycle stage and the order they fire in, so you can establish a clear owner for each stage transition." },
        { title: "Orphaned enrollment detection", desc: "Some workflows depend on other workflows to set properties or create list memberships that serve as their enrollment trigger. If the upstream workflow is paused, deleted, or modified, the downstream workflow stops enrolling — silently. Entflow detects these broken chains and alerts you when a workflow's enrollment criteria depends on an action that no longer exists." },
      ]}
      relatedPages={[
        { title: "Workflow Mapping", href: "/features/workflow-mapping", desc: "Interactive visual map of all workflow dependencies in your portal." },
        { title: "AI Workflow Audit", href: "/features/workflow-audit", desc: "AI analysis that goes beyond conflicts to check compliance, logic, and deliverability." },
        { title: "RevOps Documentation", href: "/features/revops-documentation", desc: "Document your conflict resolutions and ownership decisions on a visual canvas." },
      ]}
      ctaTitle="Stop silent data conflicts"
      ctaDesc="Connect HubSpot and see every property collision in your portal. Free to start."
    />
  );
}
