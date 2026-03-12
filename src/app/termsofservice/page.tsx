import Link from "next/link";

export default function TermsOfServicePage() {
  const lastUpdated = "March 12, 2026";

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#FAFBFC", color: "#0F1419", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #E2E8F0", background: "white" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/landing" style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18, textDecoration: "none", color: "#0F1419" }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #2563EB, #1D4ED8)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
            </div>
            Entflow
          </Link>
          <Link href="/landing" style={{ textDecoration: "none", color: "#5B6471", fontSize: 14, fontWeight: 500 }}>← Back to home</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 120px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 40 }}>Last updated: {lastUpdated}</p>

        <div style={{ fontSize: 15, color: "#374151", lineHeight: 1.85 }}>

          <Section title="1. Agreement to Terms">
            <p>By accessing or using Entflow ("the Service"), operated at entflow.app, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>
            <p>The Service is operated by Entflow ("we", "us", "our"). We reserve the right to update these terms at any time. Continued use of the Service after changes constitutes acceptance of the revised terms.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>Entflow is a workflow mapping and dependency analysis tool for HubSpot. The Service connects to your HubSpot portal via OAuth, reads workflow configurations and related metadata, and provides visual mapping, conflict detection, changelog tracking, and canvas annotation features.</p>
            <p>The Service is provided "as is" and "as available". We do not guarantee uninterrupted access or that the Service will be error-free.</p>
          </Section>

          <Section title="3. Account and Access">
            <p>Access to the Service requires a HubSpot account. Authentication is handled entirely through HubSpot{"'"}s OAuth system. You are responsible for maintaining the security of your HubSpot account credentials.</p>
            <p>By connecting your HubSpot portal, you represent that you have the authority to grant the Service read-only access to your portal{"'"}s workflow configurations, property definitions, pipeline metadata, marketing email metadata, and list metadata.</p>
            <p>You may disconnect your HubSpot portal at any time through the Settings page, which will revoke the OAuth connection and permanently delete all data associated with your portal.</p>
          </Section>

          <Section title="4. Data Access and Permissions">
            <p>The Service requests read-only access to the following HubSpot data:</p>
            <ul style={{ paddingLeft: 24, margin: "12px 0" }}>
              <li style={{ marginBottom: 6 }}>Workflow configurations (actions, enrollment criteria, metadata)</li>
              <li style={{ marginBottom: 6 }}>Property definitions</li>
              <li style={{ marginBottom: 6 }}>Pipeline and stage metadata</li>
              <li style={{ marginBottom: 6 }}>Marketing email metadata (name, subject — not content or analytics)</li>
              <li style={{ marginBottom: 6 }}>List metadata (name, ID — not member data)</li>
            </ul>
            <p>The Service does not access, read, modify, or delete CRM records (contacts, companies, deals, tickets), email content or analytics, form submissions, activity data, user accounts, or portal settings.</p>
            <p>The Service never modifies any data in your HubSpot portal.</p>
          </Section>

          <Section title="5. Subscriptions and Billing">
            <p>The Service offers free and paid subscription tiers. Paid subscriptions are billed monthly through Stripe. By subscribing to a paid plan, you authorise recurring monthly charges to your payment method.</p>
            <p>You may upgrade, downgrade, or cancel your subscription at any time through the Settings page or Stripe billing portal. Cancellations take effect at the end of the current billing period. No refunds are provided for partial billing periods.</p>
            <p>We reserve the right to change pricing with 30 days{"'"} notice. Price changes will not affect your current billing period.</p>
          </Section>

          <Section title="6. Usage Limits">
            <p>Each subscription tier includes a workflow limit. If the number of workflows in your HubSpot portal exceeds your plan{"'"}s limit, the Service will sync workflows up to your limit. You may upgrade your plan to increase the limit.</p>
            <p>Free accounts are subject to a 2-hour cooldown between manual syncs. Paid accounts have unlimited manual sync access.</p>
            <p>We reserve the right to implement rate limits or usage restrictions to protect the stability of the Service.</p>
          </Section>

          <Section title="7. Acceptable Use">
            <p>You agree not to:</p>
            <ul style={{ paddingLeft: 24, margin: "12px 0" }}>
              <li style={{ marginBottom: 6 }}>Use the Service for any unlawful purpose</li>
              <li style={{ marginBottom: 6 }}>Attempt to gain unauthorised access to the Service or its infrastructure</li>
              <li style={{ marginBottom: 6 }}>Interfere with or disrupt the Service or servers connected to it</li>
              <li style={{ marginBottom: 6 }}>Reverse-engineer, decompile, or disassemble any part of the Service</li>
              <li style={{ marginBottom: 6 }}>Use automated tools to scrape or extract data from the Service</li>
              <li style={{ marginBottom: 6 }}>Share your account access with unauthorised third parties</li>
            </ul>
          </Section>

          <Section title="8. Intellectual Property">
            <p>The Service, including its design, code, features, and documentation, is owned by Entflow and protected by applicable intellectual property laws. Your subscription grants you a limited, non-exclusive, non-transferable licence to use the Service for its intended purpose.</p>
            <p>Your HubSpot data remains your property. We claim no ownership of any data synced from your HubSpot portal.</p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, Entflow shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising from your use of or inability to use the Service.</p>
            <p>Our total liability for any claim arising from the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
            <p>The Service provides informational analysis of your workflow configurations. We do not guarantee the accuracy, completeness, or reliability of conflict detection, dependency analysis, or any other analysis provided by the Service. You are responsible for verifying any findings before taking action on your HubSpot portal.</p>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <p>The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
            <p>We do not warrant that the Service will meet your requirements, operate without interruption, be timely or error-free, or that any defects will be corrected.</p>
          </Section>

          <Section title="11. Termination">
            <p>We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice. You may terminate your account at any time by disconnecting your HubSpot portal through the Settings page.</p>
            <p>Upon termination, your right to use the Service ceases immediately. All data associated with your portal will be permanently deleted.</p>
          </Section>

          <Section title="12. Governing Law">
            <p>These terms are governed by and construed in accordance with applicable law. Any disputes arising from these terms or the Service shall be resolved through good-faith negotiation before pursuing other remedies.</p>
          </Section>

          <Section title="13. Contact">
            <p>If you have questions about these Terms of Service, contact us at <a href="mailto:kirsten@entflow.app" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>kirsten@entflow.app</a>.</p>
          </Section>

        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #E2E8F0", display: "flex", gap: 24, fontSize: 13, color: "#94A3B8" }}>
          <Link href="/privacy" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>Privacy Policy</Link>
          <Link href="/landing" style={{ color: "#64748B", textDecoration: "none" }}>Home</Link>
          <Link href="/documentation" style={{ color: "#64748B", textDecoration: "none" }}>Documentation</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F1419", marginBottom: 12 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}
