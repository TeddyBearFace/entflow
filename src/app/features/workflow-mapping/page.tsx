import { Metadata } from "next";
import FeaturePageLayout from "@/components/FeaturePageLayout";

export const metadata: Metadata = {
  title: "HubSpot Workflow Mapping Tool — Visual Dependency Map | Entflow",
  description: "Map every HubSpot workflow visually. See cross-enrollments, shared properties, and dependency chains in an interactive canvas. Free to start.",
  openGraph: { title: "HubSpot Workflow Mapping Tool | Entflow", description: "Visual dependency map for HubSpot workflows. See how your automations actually connect." },
};

export default function Page() {
  return (
    <FeaturePageLayout
      badge="Core Feature"
      badgeColor="#2563EB"
      badgeBg="#EFF6FF"
      title="Visual workflow mapping for HubSpot"
      subtitle="Stop scrolling through a flat list of workflows. Entflow builds an interactive dependency map that shows exactly how your automations connect — through shared properties, cross-enrollments, list memberships, and form submissions."
      sections={[
        { title: "See the full picture in seconds", desc: "Every workflow in your portal is automatically parsed and plotted on an interactive canvas. Connections between workflows are drawn based on real data — not guesswork. You can see which workflows share properties, which ones cross-enroll contacts into each other, and which form submissions or list changes trigger downstream automations.", bullets: ["Auto-parsed from HubSpot API", "Interactive zoom and pan", "Click any node for full detail", "Filter by property, type, or status"] },
        { title: "Property tracing across your entire portal", desc: "Pick any HubSpot property — lifecycle stage, lead score, deal stage — and instantly see every workflow that reads or writes it. This is critical for understanding side effects before making changes. If you update a lifecycle stage workflow, you need to know which other workflows depend on that stage change as their enrollment trigger.", bullets: ["Property read/write mapping", "Side-effect visibility", "Lifecycle stage chain tracking", "Deal stage dependency tracing"] },
        { title: "Cross-enrollment visualization", desc: "HubSpot workflows can enroll contacts into other workflows. But when these chains get complex — workflow A enrolls into B, which sets a property that triggers C — it becomes nearly impossible to trace manually. Entflow draws these chains automatically, so you can follow the path from any trigger to every downstream effect." },
        { title: "Built for real portal sizes", desc: "Whether you have 15 workflows or 500, the map renders smoothly. Entflow uses progressive loading with real-time sync progress for large portals. Filter, group, and tag workflows to focus on what matters. Export the map as PNG, SVG, or PDF for stakeholder reviews and client deliverables.", bullets: ["Handles 500+ workflows", "Progressive sync with status", "Tag and group workflows", "Export as PNG, SVG, PDF"] },
      ]}
      relatedPages={[
        { title: "Conflict Detection", href: "/features/conflict-detection", desc: "Automatically catch property write collisions and circular dependencies." },
        { title: "AI Workflow Audit", href: "/features/workflow-audit", desc: "AI-powered analysis with health scores, issue detection, and fix suggestions." },
        { title: "RevOps Documentation", href: "/features/revops-documentation", desc: "FigJam-style canvas for documenting your automation architecture." },
      ]}
    />
  );
}
