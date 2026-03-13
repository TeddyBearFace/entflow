import { Metadata } from "next";
import FeaturePageLayout from "@/components/FeaturePageLayout";

export const metadata: Metadata = {
  title: "HubSpot RevOps Documentation — Visual Canvas & Export | Entflow",
  description: "Document your HubSpot RevOps architecture visually. FigJam-style canvas with sections, stickies, connectors, and export to PDF, PNG, and SVG.",
  openGraph: { title: "HubSpot RevOps Documentation Tool | Entflow", description: "Visual canvas for documenting your entire HubSpot automation architecture." },
};

export default function Page() {
  return (
    <FeaturePageLayout
      badge="Documentation"
      badgeColor="#EA580C"
      badgeBg="#FFF7ED"
      title="Document your RevOps architecture visually"
      subtitle="Your automation stack lives in people's heads until it's documented. Entflow gives you a FigJam-style canvas layered on top of your real workflow map — add sections, sticky notes, labels, and connectors to create living documentation that stays in sync with your actual HubSpot setup."
      sections={[
        { title: "A canvas built for RevOps", desc: "Unlike generic diagramming tools, the Entflow canvas sits directly on top of your live workflow map. You're annotating real workflows, not recreating them from memory. Add sections to group workflows by team or function, drop sticky notes to document decisions and ownership, and draw connectors to show relationships that aren't captured in HubSpot's native metadata.", bullets: ["Layered on live workflow data", "Sections for team grouping", "Sticky notes for decisions", "Custom connectors and labels"] },
        { title: "Changelog tracks everything", desc: "Every time you sync your portal, Entflow diffs the current state against the previous sync. You'll see which workflows were added, modified, paused, or deleted — and exactly what changed. Actions added or removed, properties changed, enrollment criteria updated. This gives your team a running audit log of your automation stack without any manual effort.", bullets: ["Automatic sync diffs", "Action-level change tracking", "Property change detection", "Enrollment criteria monitoring"] },
        { title: "Export for stakeholders", desc: "Export your documented canvas as PNG for quick sharing, SVG for scalable diagrams, PDF for formal documentation, or CSV for spreadsheet-based reviews. Every export includes the canvas annotations you've added, so stakeholders see the full context — not just a raw workflow list.", bullets: ["PNG for quick sharing", "SVG for scalable diagrams", "PDF for formal docs", "CSV for spreadsheet review"] },
        { title: "Onboard new team members in minutes", desc: "When a new ops hire joins, they need to understand the automation stack before they can contribute. Instead of scheduling a 2-hour walkthrough, share the Entflow canvas. It shows every workflow, how they connect, where the conflicts are, which team owns what, and what decisions were made along the way. New team members get context in minutes, not weeks." },
        { title: "Keep documentation in sync automatically", desc: "The biggest problem with static documentation is that it goes stale the day after it's created. Because Entflow's canvas is layered on live data, it updates every time you sync. New workflows appear on the map automatically. Deleted workflows disappear. Your annotations stay attached, so the documentation evolves with your portal instead of rotting in a Google Doc." },
      ]}
      relatedPages={[
        { title: "Workflow Mapping", href: "/features/workflow-mapping", desc: "The visual dependency map that powers the documentation canvas." },
        { title: "For Agencies", href: "/features/agencies", desc: "Use documented architecture as a billable deliverable for clients." },
        { title: "AI Workflow Audit", href: "/features/workflow-audit", desc: "Add AI health scores and analysis to your documentation." },
      ]}
      ctaTitle="Make your automation stack self-documenting"
      ctaDesc="Connect HubSpot and build your RevOps architecture diagram in minutes."
    />
  );
}
