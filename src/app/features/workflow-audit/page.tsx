import { Metadata } from "next";
import FeaturePageLayout from "@/components/FeaturePageLayout";

export const metadata: Metadata = {
  title: "HubSpot Workflow Audit Tool — AI-Powered Analysis | Entflow",
  description: "Audit your HubSpot workflows with AI. Get health scores, compliance checks, deliverability analysis, and specific fix suggestions for every issue found.",
  openGraph: { title: "HubSpot Workflow Audit Tool | Entflow", description: "AI-powered workflow audit for HubSpot. Health scores, issue detection, and fix suggestions." },
};

export default function Page() {
  return (
    <FeaturePageLayout
      badge="AI Powered"
      badgeColor="#7C3AED"
      badgeBg="#F3E8FF"
      title="AI-powered HubSpot workflow audit"
      subtitle="Every workflow gets an instant health score. Paid plans unlock deep AI analysis that checks for compliance gaps, logic errors, deliverability risks, and gives you specific fix suggestions — not vague best practices."
      sections={[
        { title: "Instant health scores on every workflow", desc: "The local scoring engine runs in your browser with zero API calls. It checks every workflow against a rule set built from real HubSpot best practices: missing suppression lists, emails without delays, deep branch nesting, no unenrollment criteria, property updates that could trigger infinite loops, and more. Every workflow gets an A–F grade with a 0–100 score.", bullets: ["A–F grading system", "0–100 numeric score", "Runs locally, no API cost", "Free on all plans"] },
        { title: "Deep AI analysis goes further", desc: "The AI analyst doesn't just count steps — it understands HubSpot patterns. It reads your entire workflow definition and checks for GDPR consent before email actions, flags nurture sequences without engagement branching, detects lifecycle stage changes that could cause re-enrollment loops, and identifies emails that fire without proper delay spacing. Every issue comes with a severity level (critical, warning, info) and a concrete fix suggestion.", bullets: ["GDPR/consent compliance checks", "Infinite re-enrollment loop detection", "Deliverability risk analysis", "Specific fix per issue"] },
        { title: "AI trigger ordering shows the full lifecycle", desc: "When you have 20+ workflows, understanding the order they fire in is almost impossible from inside HubSpot. The AI trigger ordering feature analyzes all your workflows together and maps them to lifecycle stages — lead capture, nurture, qualification, sales handoff, onboarding, retention. It shows which workflows trigger which, and draws the causal chain between them.", bullets: ["Lifecycle stage mapping", "Causal chain detection", "Cross-workflow trigger tracing", "Visual flow overview"] },
        { title: "Built for HubSpot, not generic automation", desc: "Unlike generic workflow analysis tools, the Entflow AI analyst is trained specifically on HubSpot patterns. It understands HubSpot object types (contacts, companies, deals, tickets), HubSpot-specific enrollment triggers, suppression lists, marketing vs transactional email distinctions, and HubSpot's re-enrollment behavior. The analysis it produces is actionable inside HubSpot, not generic advice." },
        { title: "Tiered for every team size", desc: "Free plans get local health scores on every workflow — no credit card needed. Starter plans ($9/month) get 10 AI deep analyses per month. Growth plans ($19/month) get 50. Pro plans ($29/month) get unlimited. Every paid plan includes AI trigger ordering." },
      ]}
      relatedPages={[
        { title: "Workflow Mapping", href: "/features/workflow-mapping", desc: "Visual dependency map showing how workflows connect through shared properties." },
        { title: "Conflict Detection", href: "/features/conflict-detection", desc: "Automatic detection of property write collisions and circular dependencies." },
        { title: "For Agencies", href: "/features/agencies", desc: "Use AI audits as a deliverable for client portal reviews." },
      ]}
      ctaTitle="Audit your HubSpot workflows in minutes"
      ctaDesc="Connect HubSpot and get instant health scores. Free up to 10 workflows."
    />
  );
}
