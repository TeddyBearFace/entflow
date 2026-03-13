import { Metadata } from "next";
import FeaturePageLayout from "@/components/FeaturePageLayout";

export const metadata: Metadata = {
  title: "HubSpot Agency Tools — Workflow Audit & Documentation | Entflow",
  description: "Audit HubSpot client portals in minutes. Visual workflow mapping, AI-powered analysis, and exportable documentation for agencies, consultants, and freelancers.",
  openGraph: { title: "HubSpot Agency & Consultant Tools | Entflow", description: "Audit client portals, deliver documented architecture, and scale your ops practice." },
};

export default function Page() {
  return (
    <FeaturePageLayout
      badge="For Agencies"
      badgeColor="#059669"
      badgeBg="#ECFDF5"
      title="Audit client portals. Deliver real documentation."
      subtitle="You get hired to fix a HubSpot portal, but first you need to understand it. Entflow connects in 30 seconds, maps every workflow, flags every conflict, and generates AI health scores — so you can walk into the first client meeting with a full architecture review."
      sections={[
        { title: "Understand any portal in minutes", desc: "Connect via OAuth (read-only — clients love that), wait for the sync, and you have a complete visual map of every workflow in the portal. No more spending the first two days clicking through workflows one by one trying to piece together how things connect. The dependency map shows you the full picture immediately — cross-enrollments, shared properties, lifecycle stage chains, everything.", bullets: ["30-second OAuth connection", "Read-only access (never modifies)", "Full dependency map on first sync", "Works with any HubSpot tier"] },
        { title: "AI audit as a deliverable", desc: "Run the AI analyst across the client's workflows and export the results. Every workflow gets a health grade (A–F), the AI flags specific issues with severity levels, and each issue comes with a fix suggestion. Package this into your audit report and you've turned a tool into a billable deliverable. Clients see concrete, actionable findings — not vague recommendations.", bullets: ["A–F health grades per workflow", "Severity-rated issue list", "Fix suggestions per issue", "Exportable audit report"] },
        { title: "Architecture documentation clients can keep", desc: "Use the canvas to annotate the workflow map with ownership notes, decision history, and team assignments. Export as PDF or PNG and include it in your deliverable. The client gets a visual architecture document they can reference long after your engagement ends — and when things break six months later, they call you back because you're the one who documented it." },
        { title: "Scale your ops practice", desc: "Most HubSpot agencies spend 40–60% of an engagement just understanding the existing setup. Entflow compresses that to under an hour. That means you can take on more clients, quote fixed-price audits confidently, and deliver faster. The AI analysis handles the tedious compliance and logic checking, so your senior ops people can focus on strategy and architecture decisions." },
        { title: "Multi-portal ready", desc: "If you manage multiple client portals, Entflow handles each one independently. Connect a new portal, get a fresh map and analysis. Disconnect when the engagement ends. Enterprise plans support multi-portal management with a single account and dedicated support." },
        { title: "Freelance consultants welcome", desc: "You don't need to be a 50-person agency to benefit. Solo HubSpot consultants use Entflow to punch above their weight — delivering the same quality of architecture review that a full agency team would, in a fraction of the time. The AI analyst is like having a senior RevOps engineer reviewing your work before you present to the client." },
      ]}
      relatedPages={[
        { title: "Workflow Mapping", href: "/features/workflow-mapping", desc: "Interactive visual map of all workflow dependencies." },
        { title: "AI Workflow Audit", href: "/features/workflow-audit", desc: "Deep AI analysis with health scores and fix suggestions." },
        { title: "RevOps Documentation", href: "/features/revops-documentation", desc: "FigJam-style canvas for creating client-facing architecture docs." },
      ]}
      ctaTitle="Deliver better audits, faster"
      ctaDesc="Connect a client portal and have a full architecture review in under an hour."
    />
  );
}
