import Link from "next/link";

export default function PrivacyPolicyPage() {
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
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 40 }}>Last updated: {lastUpdated}</p>

        <div style={{ fontSize: 15, color: "#374151", lineHeight: 1.85 }}>

          <Section title="1. Introduction">
            <p>Entflow ("we", "us", "our") operates the workflow mapping service at entflow.app ("the Service"). This Privacy Policy explains what data we collect, how we use it, how we store it, and your rights regarding your data.</p>
            <p>By using the Service, you consent to the practices described in this policy.</p>
          </Section>

          <Section title="2. Data We Collect">

            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F1419", marginTop: 8, marginBottom: 4 }}>2.1 Data from HubSpot</h3>
            <p>When you connect your HubSpot portal, we request read-only access to:</p>
            <ul style={{ paddingLeft: 24, margin: "12px 0" }}>
              <li style={{ marginBottom: 6 }}>Workflow configurations — names, actions, enrollment criteria, status, and metadata</li>
              <li style={{ marginBottom: 6 }}>Property definitions — property names and types (not property values on CRM records)</li>
              <li style={{ marginBottom: 6 }}>Pipeline and stage metadata — pipeline names, stage labels, and display order</li>
              <li style={{ marginBottom: 6 }}>Marketing email metadata — email names and subject lines (not email content, analytics, or recipient data)</li>
              <li style={{ marginBottom: 6 }}>List metadata — list names and IDs (not list members or contact data)</li>
            </ul>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F1419", marginTop: 16, marginBottom: 4 }}>2.2 Data we do NOT collect</h3>
            <p>We do not access, collect, store, or process:</p>
            <ul style={{ paddingLeft: 24, margin: "12px 0" }}>
              <li style={{ marginBottom: 6 }}>CRM records (contacts, companies, deals, tickets)</li>
              <li style={{ marginBottom: 6 }}>Email content, templates, or analytics</li>
              <li style={{ marginBottom: 6 }}>Form submissions or activity data</li>
              <li style={{ marginBottom: 6 }}>HubSpot user accounts, passwords, or personal information of your team</li>
              <li style={{ marginBottom: 6 }}>Website tracking or analytics data</li>
              <li style={{ marginBottom: 6 }}>Any personally identifiable information (PII) of your contacts or customers</li>
            </ul>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F1419", marginTop: 16, marginBottom: 4 }}>2.3 Authentication data</h3>
            <p>We store OAuth access tokens and refresh tokens issued by HubSpot to maintain your portal connection. These tokens are encrypted at rest using AES-256-GCM encryption. We also store your HubSpot portal ID and portal name.</p>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F1419", marginTop: 16, marginBottom: 4 }}>2.4 Payment data</h3>
            <p>Payment processing is handled entirely by Stripe. We do not store credit card numbers, bank account details, or other payment credentials. We store only your Stripe customer ID and subscription ID to manage your plan.</p>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F1419", marginTop: 16, marginBottom: 4 }}>2.5 Usage data</h3>
            <p>We store data you create within the Service, including canvas elements (sections, shapes, sticky notes, text, connectors), workflow tags, node positions on the map, and custom edges. This data is associated with your portal ID.</p>

            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F1419", marginTop: 16, marginBottom: 4 }}>2.6 Session data</h3>
            <p>We use a single httpOnly cookie containing your portal ID to maintain your session. This cookie expires after 30 days. We do not use tracking cookies, analytics cookies, or any third-party cookies.</p>
          </Section>

          <Section title="3. How We Use Your Data">
            <p>We use the data we collect exclusively to provide and improve the Service:</p>
            <ul style={{ paddingLeft: 24, margin: "12px 0" }}>
              <li style={{ marginBottom: 6 }}>Syncing workflow configurations to build the dependency map</li>
              <li style={{ marginBottom: 6 }}>Detecting conflicts and property collisions between workflows</li>
              <li style={{ marginBottom: 6 }}>Generating changelog entries by comparing workflow snapshots between syncs</li>
              <li style={{ marginBottom: 6 }}>Rendering the visual map with your saved positions and canvas elements</li>
              <li style={{ marginBottom: 6 }}>Enforcing plan limits (workflow count, feature access)</li>
              <li style={{ marginBottom: 6 }}>Processing subscription payments through Stripe</li>
            </ul>
            <p>We do not sell, rent, or share your data with third parties for marketing or advertising purposes. We do not use your data for profiling, automated decision-making, or any purpose unrelated to the Service.</p>
          </Section>

          <Section title="4. Data Storage and Security">
            <p>Your data is stored in a PostgreSQL database hosted on Neon (neon.tech), a serverless database provider. The application is deployed on Vercel with automatic HTTPS encryption for all data in transit.</p>
            <p>Security measures include:</p>
            <ul style={{ paddingLeft: 24, margin: "12px 0" }}>
              <li style={{ marginBottom: 6 }}>OAuth tokens encrypted at rest using AES-256-GCM</li>
              <li style={{ marginBottom: 6 }}>HTTPS/TLS encryption for all data in transit</li>
              <li style={{ marginBottom: 6 }}>HttpOnly, secure, SameSite session cookies</li>
              <li style={{ marginBottom: 6 }}>No storage of payment credentials (handled by Stripe)</li>
              <li style={{ marginBottom: 6 }}>Database access restricted to the application layer</li>
            </ul>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your data for as long as your HubSpot portal is connected to the Service. Specifically:</p>
            <ul style={{ paddingLeft: 24, margin: "12px 0" }}>
              <li style={{ marginBottom: 6 }}>Workflow data is refreshed on each sync and reflects your current HubSpot configuration</li>
              <li style={{ marginBottom: 6 }}>Workflow snapshots and changelog entries are retained indefinitely to support the diff and changelog features</li>
              <li style={{ marginBottom: 6 }}>Canvas elements, tags, and positions are retained until you delete them or disconnect your portal</li>
              <li style={{ marginBottom: 6 }}>Sync logs are retained for operational monitoring</li>
            </ul>
            <p>When you disconnect your HubSpot portal through the Settings page, all data associated with your portal is permanently and immediately deleted from our database. This includes workflows, dependencies, conflicts, canvas elements, tags, positions, changelog entries, snapshots, sync logs, and OAuth tokens.</p>
          </Section>

          <Section title="6. Third-Party Services">
            <p>The Service integrates with the following third-party services:</p>
            <ul style={{ paddingLeft: 24, margin: "12px 0" }}>
              <li style={{ marginBottom: 6 }}><strong>HubSpot</strong> — OAuth authentication and workflow data access. Subject to <a href="https://legal.hubspot.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>HubSpot{"'"}s Privacy Policy</a>.</li>
              <li style={{ marginBottom: 6 }}><strong>Stripe</strong> — Payment processing. Subject to <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>Stripe{"'"}s Privacy Policy</a>.</li>
              <li style={{ marginBottom: 6 }}><strong>Vercel</strong> — Application hosting. Subject to <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>Vercel{"'"}s Privacy Policy</a>.</li>
              <li style={{ marginBottom: 6 }}><strong>Neon</strong> — Database hosting. Subject to <a href="https://neon.tech/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", textDecoration: "none" }}>Neon{"'"}s Privacy Policy</a>.</li>
            </ul>
            <p>We do not use any analytics, advertising, or tracking services.</p>
          </Section>

          <Section title="7. Your Rights">
            <p>You have the right to:</p>
            <ul style={{ paddingLeft: 24, margin: "12px 0" }}>
              <li style={{ marginBottom: 6 }}><strong>Access</strong> — View your synced data through the Service{"'"}s interface (dashboard, map, changelog, settings)</li>
              <li style={{ marginBottom: 6 }}><strong>Deletion</strong> — Delete all your data by disconnecting your portal in Settings. Deletion is immediate and permanent.</li>
              <li style={{ marginBottom: 6 }}><strong>Portability</strong> — Export your workflow map data using the Export feature (PNG, SVG, PDF, CSV)</li>
              <li style={{ marginBottom: 6 }}><strong>Revoke access</strong> — Disconnect the Entflow integration from your HubSpot portal at any time, either through Entflow{"'"}s Settings page or through HubSpot{"'"}s Connected Apps settings</li>
            </ul>
            <p>If you are located in the European Economic Area (EEA), you may also have additional rights under the General Data Protection Regulation (GDPR), including the right to lodge a complaint with your local data protection authority.</p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>The Service is not intended for use by anyone under the age of 18. We do not knowingly collect data from children. If you believe a child has used the Service, please contact us and we will delete their data.</p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify users of material changes by updating the "Last updated" date at the top of this page. Continued use of the Service after changes constitutes acceptance of the revised policy.</p>
          </Section>

          <Section title="10. Contact">
            <p>If you have questions about this Privacy Policy or how we handle your data, contact us at <a href="mailto:kirsten@entflow.app" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>kirsten@entflow.app</a>.</p>
          </Section>

        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #E2E8F0", display: "flex", gap: 24, fontSize: 13, color: "#94A3B8" }}>
          <Link href="/termsofservice" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>Terms of Service</Link>
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
