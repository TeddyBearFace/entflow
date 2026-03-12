"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const SECTIONS = [
  { id: "getting-started", label: "Getting Started", icon: "🚀" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "workflow-map", label: "Workflow Map", icon: "🗺️" },
  { id: "canvas-tools", label: "Canvas Tools", icon: "🎨" },
  { id: "filters-search", label: "Filters & Search", icon: "🔍" },
  { id: "property-impact", label: "Property Impact", icon: "🎯" },
  { id: "conflict-detection", label: "Conflict Detection", icon: "⚡" },
  { id: "changelog", label: "Changelog & Diffs", icon: "📋" },
  { id: "tags", label: "Tags", icon: "🏷️" },
  { id: "export", label: "Export", icon: "📤" },
  { id: "sync", label: "Syncing", icon: "🔄" },
  { id: "keyboard-shortcuts", label: "Keyboard Shortcuts", icon: "⌨️" },
  { id: "plans", label: "Plans & Pricing", icon: "💰" },
  { id: "privacy", label: "Privacy & Security", icon: "🔒" },
  { id: "faq", label: "FAQ", icon: "❓" },
];

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track active section on scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileNavOpen(false);
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#FAFBFC", color: "#0F1419", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(250,251,252,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18, textDecoration: "none", color: "#0F1419" }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #2563EB, #1D4ED8)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
              </div>
              Entflow
            </Link>
            <span style={{ color: "#CBD5E1", margin: "0 4px" }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#64748B" }}>Documentation</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/landing" style={{ textDecoration: "none", color: "#5B6471", fontSize: 14, fontWeight: 500 }}>Home</Link>
            <Link href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, background: "#FF7A59", color: "white", textDecoration: "none" }}>
              Connect HubSpot →
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile nav toggle */}
      <button
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        style={{
          display: "none", position: "fixed", bottom: 20, right: 20, zIndex: 200,
          width: 48, height: 48, borderRadius: 12, background: "#2563EB", color: "white",
          border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
          fontSize: 20,
        }}
        className="mobile-nav-toggle"
      >
        {mobileNavOpen ? "✕" : "☰"}
      </button>

      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", paddingTop: 64 }}>
        {/* Sidebar */}
        <aside style={{
          width: 240, flexShrink: 0, position: "sticky", top: 64, height: "calc(100vh - 64px)",
          overflowY: "auto", padding: "24px 0 24px 24px", borderRight: "1px solid #E2E8F0",
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12, paddingLeft: 12 }}>
              Documentation
            </div>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: activeSection === s.id ? 600 : 400, textAlign: "left",
                  background: activeSection === s.id ? "#EFF6FF" : "transparent",
                  color: activeSection === s.id ? "#2563EB" : "#5B6471",
                  transition: "all 0.15s ease",
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "16px 12px", background: "#F8FAFC", borderRadius: 12, marginRight: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#0F1419", marginBottom: 4 }}>Need help?</p>
            <p style={{ fontSize: 11, color: "#5B6471", lineHeight: 1.5, marginBottom: 8 }}>Can{"'"}t find what you{"'"}re looking for?</p>
            <a href="mailto:kirsten@entflow.app" style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>
              kirsten@entflow.app
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, padding: "32px 48px 120px" }}>

          {/* Getting Started */}
          <Section id="getting-started" title="Getting Started" subtitle="Connect your HubSpot portal and map your workflows in under a minute.">
            <H3>1. Connect HubSpot</H3>
            <P>
              Click <strong>Connect HubSpot</strong> on the <A href="/connect">connect page</A> to start the OAuth flow. Entflow requests read-only access to your workflow configurations, properties, pipelines, email metadata, and list metadata. We never access your CRM records and never modify your portal.
            </P>

            <H3>2. First Sync</H3>
            <P>
              Once connected, Entflow automatically runs your first sync. This fetches all workflows from HubSpot, parses their actions and enrollment criteria, builds a dependency graph, and detects conflicts. You{"'"}ll see a live progress bar as it runs. Most portals complete in under 30 seconds.
            </P>

            <H3>3. Explore the Map</H3>
            <P>
              After syncing, head to the <strong>Workflow Map</strong> to see your automations visualised. Workflows appear as cards, connected by dependency edges. Click any workflow to see its full detail panel with actions, enrollment criteria, and connections.
            </P>

            <Callout type="info">
              Free accounts are limited to 10 workflows. <A href="#plans">Upgrade to Pro</A> for up to 500 workflows with full canvas tools, tagging, export, and more.
            </Callout>
          </Section>

          {/* Dashboard */}
          <Section id="dashboard" title="Dashboard" subtitle="A summary of your portal's workflow health at a glance.">
            <P>
              The dashboard shows four key metrics: total workflows (with active/inactive breakdown), cross-workflow dependencies, detected conflicts (with severity), and last sync time. Below the stats you{"'"}ll find quick-action links to the map, property impact, changelog, and conflict views.
            </P>

            <H3>Most Connected Workflows</H3>
            <P>
              The table at the bottom ranks workflows by dependency count — these are the ones that impact the most other automations if changed. Each row shows status, object type, action count, dependencies, and conflict count.
            </P>

            <H3>Recent Changes</H3>
            <P>
              The last five changelog entries appear on the dashboard, showing what changed in your most recent sync. Click <strong>View all →</strong> to see the full changelog.
            </P>

            <H3>Syncing from the Dashboard</H3>
            <P>
              Click <strong>Sync Now</strong> to pull the latest workflow data from HubSpot. The progress bar appears inline and persists even if you navigate between pages — you{"'"}ll see it on both the dashboard and the map.
            </P>
          </Section>

          {/* Workflow Map */}
          <Section id="workflow-map" title="Workflow Map" subtitle="The core of Entflow — a visual dependency graph of every automation in your portal.">
            <H3>Workflow Nodes</H3>
            <P>
              Each workflow appears as a card showing its name, object type, status (active/inactive), action count, and any conflict indicators. Active workflows have a green status badge, inactive ones are grey.
            </P>

            <H3>Dependency Edges</H3>
            <P>
              Connections between workflows are colour-coded by type:
            </P>
            <Table headers={["Colour", "Type", "Description"]}>
              <TR cells={["🟠 Orange", "Cross-enrollment", "Workflow A enrolls contacts into Workflow B"]} />
              <TR cells={["🔵 Blue", "Property dependency", "Both workflows read or write the same property"]} />
              <TR cells={["🟣 Purple", "Shared list", "Both workflows reference the same list"]} />
              <TR cells={["🔴 Red", "Email overlap", "Similar audience with overlapping email sends"]} />
            </Table>

            <H3>Node Positioning</H3>
            <P>
              Drag any workflow card to reposition it. Positions are automatically saved to the database and persist between sessions. New workflows are placed in open space to avoid overlapping existing nodes.
            </P>

            <H3>Smart Guides</H3>
            <P>
              When dragging nodes, blue alignment guides appear to help you snap to the edges or centers of nearby elements. Toggle grid snap with the <Code>G</Code> key for precise 20px alignment.
            </P>

            <H3>Detail Panel</H3>
            <P>
              Click any workflow node to open the detail side panel. This shows the full action list, enrollment criteria, dependencies (both incoming and outgoing), associated conflicts, and tags. You can also open the workflow directly in HubSpot from here.
            </P>
          </Section>

          {/* Canvas Tools */}
          <Section id="canvas-tools" title="Canvas Tools" subtitle="A FigJam-style toolkit for annotating and documenting your workflow architecture." badge="Pro">
            <P>
              The bottom toolbar lets you add visual elements to the canvas alongside your workflow nodes. These are saved to the database and persist between sessions.
            </P>

            <Table headers={["Tool", "Shortcut", "Description"]}>
              <TR cells={["Select", "V / 1", "Default mode. Click to select, drag to move."]} />
              <TR cells={["Section", "S / 2", "Large background containers for grouping workflows. Renders behind everything."]} />
              <TR cells={["Rectangle", "R / 3", "Rectangle shape for process steps or labels."]} />
              <TR cells={["Diamond", "D / 4", "Diamond shape for decision points."]} />
              <TR cells={["Circle", "O / 5", "Circle shape for start/end points."]} />
              <TR cells={["Connector", "C / 6", "Draw lines between any two nodes. Drag from one node's handle to another."]} />
              <TR cells={["Sticky Note", "N / 7", "Yellow sticky note with editable text content."]} />
              <TR cells={["Text", "T / 8", "Free-form text label. Supports font size, weight, and alignment."]} />
            </Table>

            <H3>Editing Elements</H3>
            <P>
              Select any canvas element to see the edit toolbar at the bottom of the screen. From here you can change colour, font size, weight, style, and text alignment. You can also duplicate (<Code>Ctrl+D</Code>), copy (<Code>Ctrl+C</Code>), paste (<Code>Ctrl+V</Code>), or delete (<Code>Delete</Code>) elements.
            </P>

            <H3>Connectors</H3>
            <P>
              Custom connectors support solid, dashed, and dotted line styles, custom colours, animated flow, and optional labels. Select a connector to see the style toolbar with all options.
            </P>
          </Section>

          {/* Filters & Search */}
          <Section id="filters-search" title="Filters & Search" subtitle="Narrow down the map to exactly what you need.">
            <H3>Sidebar Filters</H3>
            <P>
              The left sidebar on the map lets you filter workflows by status (active/inactive), object type (contact, deal, company, ticket), dependency type, and tags. Filters apply immediately and fade non-matching workflows to 15% opacity so you keep spatial context.
            </P>

            <H3>Global Search</H3>
            <P>
              Press <Code>Ctrl+K</Code> (or click the search button) to open the search modal. This searches across workflow names, actions, properties, email sends, and list references. Click a result to jump to that workflow{"'"}s detail panel.
            </P>
          </Section>

          {/* Property Impact */}
          <Section id="property-impact" title="Property Impact Analysis" subtitle="See exactly which workflows interact with each property." badge="Pro">
            <P>
              In the left sidebar under <strong>Property Impact</strong>, you{"'"}ll see every property that{"'"}s read or written by workflows in your portal. Click any property to highlight the workflows that interact with it.
            </P>

            <H3>How It Works</H3>
            <P>
              During sync, Entflow parses every action and enrollment filter across all workflows to build a property index. For each property, it tracks which workflows <strong>read</strong> it (in enrollment criteria or branch conditions) and which <strong>write</strong> to it (via set property, copy property, or clear property actions).
            </P>

            <Callout type="warning">
              Properties written by multiple workflows are potential conflict points. If two workflows both set <Code>lifecyclestage</Code>, they could overwrite each other{"'"}s values. Entflow flags these as <strong>Property Write Collisions</strong>.
            </Callout>
          </Section>

          {/* Conflict Detection */}
          <Section id="conflict-detection" title="Conflict Detection" subtitle="Automatically catch issues before they cause problems.">
            <P>
              Each sync analyses your workflows for five types of conflicts:
            </P>

            <Table headers={["Type", "Severity", "What It Means"]}>
              <TR cells={["Property Write Collision", "⚠️ Warning / 🔴 Critical", "Two or more workflows write to the same property. Critical if both are active."]} />
              <TR cells={["Circular Dependency", "🔴 Critical", "Workflow A enrolls into B, and B enrolls back into A (directly or via chain)."]} />
              <TR cells={["Inactive Reference", "⚠️ Warning", "An active workflow enrolls contacts into an inactive workflow."]} />
              <TR cells={["Email Overlap", "ℹ️ Info", "Multiple workflows send emails to overlapping audiences."]} />
              <TR cells={["Orphaned Enrollment", "⚠️ Warning", "A workflow tries to enroll into a workflow that no longer exists."]} />
            </Table>

            <P>
              Conflicts appear as badges on workflow nodes in the map, on the dashboard stats, and in the dedicated conflicts view. The detail panel for each workflow lists all conflicts it{"'"}s involved in.
            </P>
          </Section>

          {/* Changelog */}
          <Section id="changelog" title="Changelog & Diff View" subtitle="Track every change to your workflows between syncs.">
            <H3>Changelog</H3>
            <P>
              Available at <Code>/changelog</Code>, this view shows a chronological feed of all workflow changes detected during syncs. Changes are grouped by date and include: workflow created, status change (activated/deactivated), renamed, actions added/removed/modified, actions reordered, and enrollment criteria changed.
            </P>
            <P>
              Expand any entry to see raw field-level detail. Each entry includes a <strong>diff</strong> link that takes you to the full diff view for that workflow.
            </P>

            <H3>Diff View</H3>
            <P>
              The diff view at <Code>/changelog/diff</Code> lets you compare any two snapshots of a workflow side-by-side. It shows:
            </P>
            <UL>
              <LI>A summary bar with counts of added, removed, and modified actions</LI>
              <LI>Metadata changes (name, status)</LI>
              <LI>Enrollment criteria before/after comparison</LI>
              <LI>A per-action diff with expandable field-level change tables</LI>
              <LI>A snapshot timeline for selecting any two versions to compare</LI>
            </UL>

            <Callout type="info">
              Snapshots are created automatically during each sync. A new snapshot is only stored when something actually changes (action hash, enrollment hash, status, or name), so unchanged workflows don{"'"}t accumulate duplicates.
            </Callout>
          </Section>

          {/* Tags */}
          <Section id="tags" title="Tags" subtitle="Organise workflows with custom labels and colours." badge="Pro">
            <P>
              Tags let you group workflows by team, function, campaign, or any category that makes sense for your portal. Create tags from the workflow detail panel or the filter sidebar. Each tag has a custom name and colour.
            </P>
            <P>
              Once tagged, you can filter the map by tag to focus on specific groups. Non-matching workflows fade to 15% opacity, keeping spatial context while highlighting the ones you care about.
            </P>
          </Section>

          {/* Export */}
          <Section id="export" title="Export" subtitle="Share your workflow map as a document or image." badge="Pro">
            <P>
              Click the <strong>Export</strong> button in the top-right toolbar on the map. Available formats:
            </P>
            <UL>
              <LI><strong>PNG</strong> — High-resolution raster image of the full canvas</LI>
              <LI><strong>SVG</strong> — Scalable vector, ideal for print or large-format displays</LI>
              <LI><strong>PDF</strong> — Multi-page document with map overview and workflow index</LI>
            </UL>
            <P>
              Exports include all canvas elements (sections, shapes, sticky notes, connectors) alongside workflow nodes and dependency edges.
            </P>
          </Section>

          {/* Sync */}
          <Section id="sync" title="Syncing" subtitle="How Entflow keeps your data in sync with HubSpot.">
            <H3>First Sync</H3>
            <P>
              Triggered automatically when you first connect a HubSpot portal. Entflow discovers all workflows, fetches their full configurations, parses actions and enrollment criteria, builds the dependency graph, detects conflicts, fetches pipeline/stage data, resolves email and list metadata, and stores everything.
            </P>

            <H3>Manual Sync</H3>
            <P>
              Click <strong>Sync Now</strong> on the dashboard or the map toolbar. The progress bar shows real-time status: discovering workflows → fetching details → parsing actions → detecting conflicts → saving to database → generating changelog. Manual sync is a <Badge>Pro</Badge> feature.
            </P>

            <H3>Auto-Sync</H3>
            <P>
              Pro users can enable auto-sync from the map toolbar. When enabled, Entflow periodically re-syncs your portal in the background (default: every 6 hours). The interval is configurable.
            </P>

            <H3>Sync Progress Across Pages</H3>
            <P>
              Sync progress is tracked server-side. If you start a sync on the dashboard and navigate to the map (or vice versa), the progress bar picks up where it left off. No progress is lost.
            </P>

            <Callout type="warning">
              If a sync appears stuck for more than 5 minutes, it{"'"}s automatically marked as failed. You can retry from the dashboard or reconnect your HubSpot portal.
            </Callout>
          </Section>

          {/* Keyboard Shortcuts */}
          <Section id="keyboard-shortcuts" title="Keyboard Shortcuts" subtitle="Speed up your workflow in the map view.">
            <Table headers={["Shortcut", "Action"]}>
              <TR cells={["V / 1", "Select tool"]} />
              <TR cells={["S / 2", "Section tool"]} />
              <TR cells={["R / 3", "Rectangle tool"]} />
              <TR cells={["D / 4", "Diamond tool"]} />
              <TR cells={["O / 5", "Circle tool"]} />
              <TR cells={["C / 6", "Connector tool"]} />
              <TR cells={["N / 7", "Sticky note tool"]} />
              <TR cells={["T / 8", "Text tool"]} />
              <TR cells={["G", "Toggle grid snap"]} />
              <TR cells={["Ctrl+K", "Open search"]} />
              <TR cells={["Ctrl+D", "Duplicate selected element"]} />
              <TR cells={["Ctrl+C", "Copy selected element"]} />
              <TR cells={["Ctrl+V", "Paste copied element"]} />
              <TR cells={["Delete / Backspace", "Delete selected element or connector"]} />
              <TR cells={["Escape", "Deselect / close search / exit tool"]} />
            </Table>
          </Section>

          {/* Plans */}
          <Section id="plans" title="Plans & Pricing" subtitle="Start free, upgrade when you need more.">
            <Table headers={["Feature", "Free", "Pro ($29/mo)", "Enterprise"]}>
              <TR cells={["Workflows", "Up to 10", "Up to 500", "Unlimited"]} />
              <TR cells={["Visual dependency map", "✓", "✓", "✓"]} />
              <TR cells={["Conflict detection", "✓", "✓", "✓"]} />
              <TR cells={["Changelog", "✓", "✓", "✓"]} />
              <TR cells={["Diff view", "✓", "✓", "✓"]} />
              <TR cells={["Canvas tools", "✗", "✓", "✓"]} />
              <TR cells={["Tagging", "✗", "✓", "✓"]} />
              <TR cells={["Property impact", "✗", "✓", "✓"]} />
              <TR cells={["Export (PNG/SVG/PDF)", "✗", "✓", "✓"]} />
              <TR cells={["Manual sync", "✗", "✓", "✓"]} />
              <TR cells={["Auto-sync", "✗", "✓", "✓"]} />
              <TR cells={["Multi-portal", "✗", "✗", "✓"]} />
              <TR cells={["Priority support", "✗", "✓", "✓"]} />
            </Table>
          </Section>

          {/* Privacy */}
          <Section id="privacy" title="Privacy & Security" subtitle="Your data stays safe.">
            <H3>What We Access</H3>
            <P>
              Entflow requests <strong>read-only</strong> access to: workflow configurations, property definitions, pipeline and stage metadata, marketing email metadata, and list metadata. That{"'"}s it.
            </P>

            <H3>What We Never Access</H3>
            <UL>
              <LI>CRM records (contacts, deals, companies, tickets)</LI>
              <LI>Email content or analytics</LI>
              <LI>Form submissions or activity data</LI>
              <LI>User accounts or permissions</LI>
            </UL>

            <H3>Data Storage</H3>
            <P>
              OAuth tokens are stored encrypted at rest. Workflow data is stored in a PostgreSQL database hosted on Neon (serverless Postgres). The application is deployed on Vercel with automatic HTTPS.
            </P>

            <H3>Disconnecting</H3>
            <P>
              You can disconnect your HubSpot portal at any time from the dashboard. This revokes the OAuth connection and deletes all synced data, custom nodes, tags, positions, changelog entries, and snapshots associated with that portal.
            </P>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="FAQ" subtitle="Common questions answered.">
            <FAQ q="Does Entflow change anything in my HubSpot portal?">
              No. Entflow is completely read-only. We fetch workflow configurations but never create, modify, or delete anything in your portal.
            </FAQ>

            <FAQ q="How often does my data sync?">
              Free accounts sync on initial connection. Pro accounts can trigger manual syncs at any time and enable auto-sync (default: every 6 hours). Enterprise accounts have configurable sync intervals.
            </FAQ>

            <FAQ q="What happens if I delete a workflow in HubSpot?">
              On the next sync, Entflow detects the missing workflow and removes it from the map. Any dependencies pointing to the deleted workflow are cleaned up. This appears in the changelog as a deletion event.
            </FAQ>

            <FAQ q="Can multiple people use the same portal?">
              Yes. Anyone with the portal{"'"}s dashboard URL can view it. There{"'"}s currently no per-user authentication — access is at the portal level.
            </FAQ>

            <FAQ q="How do I cancel my subscription?">
              Go to <strong>Dashboard → Manage Subscription</strong> (or click the upgrade button and select "Manage"). This opens the Stripe customer portal where you can cancel, update payment info, or download invoices.
            </FAQ>

            <FAQ q="Which HubSpot plans does Entflow work with?">
              Entflow works with any HubSpot plan that has workflows enabled, including Professional and Enterprise tiers of Marketing Hub, Sales Hub, Service Hub, and Operations Hub.
            </FAQ>

            <FAQ q="Is there an API?">
              Not currently, but it{"'"}s on the roadmap. If you need programmatic access to your workflow data, reach out and we{"'"}ll prioritise it.
            </FAQ>
          </Section>

        </main>
      </div>

      {/* Inline styles for responsive sidebar */}
      <style>{`
        @media (max-width: 768px) {
          aside { display: none !important; }
          main { padding: 24px 20px 120px !important; }
          .mobile-nav-toggle { display: flex !important; align-items: center; justify-content: center; }
        }
      `}</style>
    </div>
  );
}

/* ─── Reusable components ─── */

function Section({ id, title, subtitle, badge, children }: { id: string; title: string; subtitle: string; badge?: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 56, scrollMarginTop: 80 }}>
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "#0F1419" }}>{title}</h2>
          {badge && <Badge>{badge}</Badge>}
        </div>
        <p style={{ fontSize: 15, color: "#5B6471", marginTop: 4 }}>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0F1419", marginTop: 28, marginBottom: 8 }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.8, marginBottom: 12, maxWidth: 680 }}>{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ul>;
}

function LI({ children }: { children: React.ReactNode }) {
  return <li style={{ fontSize: 14, color: "#374151", lineHeight: 1.8, marginBottom: 4 }}>{children}</li>;
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} style={{ color: "#2563EB", fontWeight: 500, textDecoration: "none" }}>{children}</Link>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: "'DM Mono', monospace", fontSize: 12, background: "#F1F5F9",
      padding: "2px 6px", borderRadius: 4, color: "#0F172A", border: "1px solid #E2E8F0",
    }}>
      {children}
    </code>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
      background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white",
      textTransform: "uppercase" as const, letterSpacing: "0.06em",
    }}>
      {children}
    </span>
  );
}

function Callout({ type, children }: { type: "info" | "warning"; children: React.ReactNode }) {
  const styles = {
    info: { bg: "#EFF6FF", border: "#BFDBFE", icon: "💡", accent: "#2563EB" },
    warning: { bg: "#FFFBEB", border: "#FDE68A", icon: "⚠️", accent: "#D97706" },
  };
  const s = styles[type];
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`,
      marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start", maxWidth: 680,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 16, maxWidth: 720 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                textAlign: "left", padding: "10px 14px", fontWeight: 700, fontSize: 11,
                color: "#64748B", textTransform: "uppercase" as const, letterSpacing: "0.06em",
                borderBottom: "2px solid #E2E8F0", background: "#F8FAFC",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TR({ cells }: { cells: string[] }) {
  return (
    <tr>
      {cells.map((c, i) => (
        <td key={i} style={{
          padding: "10px 14px", borderBottom: "1px solid #F1F5F9", color: "#374151",
          fontWeight: i === 0 ? 500 : 400,
        }}>
          {c}
        </td>
      ))}
    </tr>
  );
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #E2E8F0", maxWidth: 680 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", textAlign: "left", padding: "16px 0", border: "none",
        background: "none", cursor: "pointer", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 12,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0F1419" }}>{q}</span>
        <svg width="16" height="16" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24"
          style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div style={{ paddingBottom: 16, fontSize: 14, color: "#5B6471", lineHeight: 1.7 }}>
          {children}
        </div>
      )}
    </div>
  );
}
