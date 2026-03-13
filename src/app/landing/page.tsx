import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#FAFBFC", color: "#0F1419", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(250,251,252,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #2563EB, #1D4ED8)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
            </div>
            Entflow
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <a href="#features" style={{ textDecoration: "none", color: "#5B6471", fontSize: 14, fontWeight: 500 }}>Features</a>
            <a href="#ai-analyst" style={{ textDecoration: "none", color: "#5B6471", fontSize: 14, fontWeight: 500 }}>AI Analyst</a>
            <a href="#pricing" style={{ textDecoration: "none", color: "#5B6471", fontSize: 14, fontWeight: 500 }}>Pricing</a>
            <Link href="/documentation" style={{ textDecoration: "none", color: "#5B6471", fontSize: 14, fontWeight: 500 }}>Docs</Link>
            <Link href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, background: "#FF7A59", color: "white", textDecoration: "none" }}>
              Connect HubSpot →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 140, paddingBottom: 80, textAlign: "center" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "#EFF6FF", borderRadius: 100, fontSize: 13, fontWeight: 600, color: "#2563EB", marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563EB" }} />
            Built for HubSpot Admins & RevOps Teams
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.03em", maxWidth: 780, margin: "0 auto 20px" }}>
            See how your workflows{" "}
            <span style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              actually connect
            </span>
          </h1>
          <p style={{ fontSize: 18, color: "#5B6471", maxWidth: 600, margin: "0 auto 36px", lineHeight: 1.7 }}>
            Visual dependency map, AI-powered workflow analysis, property conflict detection, and a FigJam-style canvas for documenting your entire RevOps architecture.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, fontWeight: 600, fontSize: 15, background: "#FF7A59", color: "white", textDecoration: "none", boxShadow: "0 2px 12px rgba(255,122,89,0.3)" }}>
              Connect HubSpot — Free
            </Link>
            <a href="#features" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, fontWeight: 600, fontSize: 15, background: "white", color: "#0F1419", textDecoration: "none", border: "1.5px solid #E2E8F0" }}>
              See Features
            </a>
          </div>

          {/* Hero mockup */}
          <div style={{ marginTop: 60, maxWidth: 1000, marginLeft: "auto", marginRight: "auto" }}>
            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.08)", overflow: "hidden", aspectRatio: "16/9" }}>
              <div style={{ height: 40, background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", padding: "0 16px", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28CA41" }} />
              </div>
              <div style={{ padding: 20, display: "flex", gap: 16, height: "calc(100% - 40px)" }}>
                <div style={{ width: 180, flexShrink: 0, background: "#F8FAFC", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 10 }}>Filters</div>
                  {["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"].map((c, i) => (
                    <div key={i} style={{ height: 8, borderRadius: 4, marginBottom: 8, opacity: 0.5, background: c, width: `${65 + i * 5}%` }} />
                  ))}
                </div>
                <div style={{ flex: 1, borderRadius: 8, background: "#FAFBFC", border: "1px dashed #E2E8F0", position: "relative", overflow: "hidden" }}>
                  {[
                    { top: "12%", left: "8%", bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE", label: "Lead Scoring" },
                    { top: "10%", left: "40%", bg: "#ECFDF5", color: "#059669", border: "#A7F3D0", label: "Deal Update" },
                    { top: "14%", left: "70%", bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA", label: "Ticket Router" },
                    { top: "48%", left: "5%", bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE", label: "Enrichment" },
                    { top: "45%", left: "38%", bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE", label: "Nurture Flow" },
                    { top: "50%", left: "68%", bg: "#ECFDF5", color: "#059669", border: "#A7F3D0", label: "Close Won" },
                    { top: "80%", left: "22%", bg: "#FEF3C7", color: "#D97706", border: "#FDE68A", label: "Lifecycle Sync" },
                    { top: "78%", left: "56%", bg: "#FFF1F2", color: "#E11D48", border: "#FECDD3", label: "CONFLICT" },
                  ].map((n, i) => (
                    <div key={i} style={{ position: "absolute", top: n.top, left: n.left, borderRadius: 8, padding: "6px 10px", fontSize: 9, fontWeight: 600, border: `1.5px solid ${n.border}`, background: n.bg, color: n.color, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                      {n.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section style={{ padding: "40px 0", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0", background: "white" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { num: "30s", label: "Setup time" },
            { num: "Read-only", label: "HubSpot access" },
            { num: "0", label: "Config needed" },
            { num: "A-F", label: "AI health grades" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#2563EB" }}>{s.num}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12 }}>Everything you need to manage HubSpot workflows</h2>
            <p style={{ fontSize: 17, color: "#5B6471", maxWidth: 560, margin: "0 auto" }}>From visual mapping to AI analysis to a full RevOps canvas.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
            {[
              { icon: "🗺️", bg: "#EFF6FF", title: "Visual Dependency Map", desc: "See every workflow and how they connect through shared properties, cross-enrollments, and list references.", link: "/features/workflow-mapping" },
              { icon: "⚡", bg: "#FEF2F2", title: "Conflict Detection", desc: "Catch property write collisions, circular dependencies, and orphaned enrollments automatically.", link: "/features/conflict-detection" },
              { icon: "🎯", bg: "#ECFDF5", title: "Property Impact Analysis", desc: "See which workflows read or write lifecycle stage, deal stage, and every other critical field.", link: "/features/workflow-mapping" },
              { icon: "🎨", bg: "#FFF7ED", title: "FigJam-Style Canvas", desc: "Sections, shapes, sticky notes, text labels, and connectors. Document your entire flow visually.", link: "/features/revops-documentation" },
              { icon: "📋", bg: "#F5F3FF", title: "Workflow Changelog", desc: "Track every change between syncs - actions added, properties changed, workflows paused.", link: "/features/workflow-audit" },
              { icon: "📤", bg: "#FEF3C7", title: "Export & Share", desc: "Export as PDF, PNG, SVG, or CSV. Perfect for client handoffs, audits, and documentation.", link: "/features/agencies" },
            ].map(f => (
              <Link key={f.title} href={f.link} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 16, padding: 32, transition: "all 0.3s", height: "100%" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: "#5B6471", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI Analyst Section */}
      <section id="ai-analyst" style={{ padding: "80px 0", background: "linear-gradient(180deg, #F5F3FF 0%, #FAFBFC 100%)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "#F3E8FF", borderRadius: 100, fontSize: 13, fontWeight: 600, color: "#7C3AED", marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED" }} />
              New - AI Powered
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12 }}>AI Workflow Analyst</h2>
            <p style={{ fontSize: 17, color: "#5B6471", maxWidth: 600, margin: "0 auto" }}>
              Instant health scores, deep analysis, and lifecycle mapping - powered by AI that understands HubSpot inside out.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 48 }}>
            {[
              { icon: "📊", border: "#DDD6FE", title: "Health Scores", badge: "Free", badgeBg: "#059669", desc: "Every workflow gets an instant A-F grade. The local scoring engine checks for missing suppression lists, deep nesting, emails without delays, and more. Free on all plans." },
              { icon: "🔬", border: "#DDD6FE", title: "Deep Analysis", badge: "Paid", badgeBg: "#7C3AED", desc: "AI audits your workflow step-by-step for compliance gaps, GDPR issues, logic errors, deliverability risks, and infinite loop potential. Every issue comes with a specific fix." },
              { icon: "🔗", border: "#FBCFE8", title: "Trigger Ordering", badge: "Paid", badgeBg: "#7C3AED", desc: "AI maps how your workflows chain together through the customer lifecycle - from lead capture to nurture to sales handoff to onboarding. See the full flow at a glance." },
            ].map((f) => (
              <div key={f.title} style={{ background: "white", border: `1.5px solid ${f.border}`, borderRadius: 16, padding: 32, position: "relative" }}>
                <div style={{ position: "absolute", top: 16, right: 16, background: f.badgeBg, color: "white", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{f.badge}</div>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #EDE9FE, #F3E8FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#5B6471", lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* AI Dashboard Mockup */}
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ background: "white", border: "1.5px solid #DDD6FE", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(124,58,237,0.08)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F0FB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #7C3AED, #DB2777)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Workflow Health</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Worst first", "Best first", "Trigger order"].map((l, i) => (
                    <span key={l} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 100, fontWeight: 600, background: i === 2 ? "linear-gradient(135deg, #EDE9FE, #FCE7F3)" : "#F1F5F9", color: i === 2 ? "#7C3AED" : "#64748B" }}>{l}</span>
                  ))}
                </div>
              </div>
              <div style={{ padding: 16 }}>
                {[
                  { grade: "A", color: "#059669", bg: "#ECFDF5", name: "GDPR Re-Engagement", score: 92, stage: "Retention" },
                  { grade: "B", color: "#2563EB", bg: "#EFF6FF", name: "MQL Lead Nurture", score: 78, stage: "Nurture" },
                  { grade: "C", color: "#D97706", bg: "#FEF3C7", name: "Enterprise Onboarding", score: 62, stage: "Onboarding" },
                  { grade: "D", color: "#EA580C", bg: "#FFF7ED", name: "Deal Notification Blast", score: 38, stage: "Notification" },
                ].map((w) => (
                  <div key={w.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, marginBottom: 4, border: "1px solid #F1F5F9" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: w.bg, color: w.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{w.grade}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>{w.stage}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: w.color }}>{w.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Link href="/features/workflow-audit" style={{ fontSize: 14, fontWeight: 600, color: "#7C3AED", textDecoration: "none" }}>
              Learn more about AI Workflow Analysis →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: "80px 0", background: "#F8FAFC" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>Up and running in 30 seconds</h2>
            <p style={{ fontSize: 17, color: "#5B6471" }}>No configuration. No setup wizard. Connect and see your map.</p>
          </div>
          <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { num: "1", title: "Connect HubSpot", desc: "One-click OAuth. Read-only access. We never modify your portal." },
              { num: "2", title: "Auto-Sync Workflows", desc: "We pull every workflow, parse actions, and build the map. Real-time progress for large portals." },
              { num: "3", title: "Map, Analyze, Document", desc: "Explore the visual map, get AI health scores, find conflicts, and export for your team." },
            ].map(s => (
              <div key={s.num} style={{ flex: "1 1 260px", maxWidth: 300, textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#2563EB", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, margin: "0 auto 16px" }}>{s.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "#5B6471" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>Built for the people who build the ops</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[
              { icon: "🏢", title: "In-House RevOps Teams", desc: "Understand the full picture of your automation stack. Onboard new team members faster. Catch conflicts before they hit production.", link: "/features/revops-documentation" },
              { icon: "🏗️", title: "HubSpot Agencies", desc: "Audit client portals in minutes. Deliver documented architecture as a billable deliverable. Scale your ops practice.", link: "/features/agencies" },
              { icon: "💻", title: "Freelance Consultants", desc: "Instantly understand a new client setup. Export professional documentation for handoffs. Stand out from other consultants.", link: "/features/agencies" },
            ].map(u => (
              <Link key={u.title} href={u.link} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 16, padding: 28, display: "flex", gap: 16, height: "100%" }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{u.icon}</div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{u.title}</h3>
                    <p style={{ fontSize: 13, color: "#5B6471", lineHeight: 1.6 }}>{u.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Deep product breakdown */}
      <section style={{ padding: "80px 0", background: "#F8FAFC" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>How Entflow works under the hood</h2>
            <p style={{ fontSize: 17, color: "#5B6471", maxWidth: 600, margin: "0 auto" }}>A deeper look at the tools that make HubSpot workflow management painless.</p>
          </div>

          {[
            { title: "Dependency mapping that actually makes sense", desc: "Entflow parses every workflow in your portal and traces the connections - shared properties, cross-enrollment triggers, list memberships, and form submissions. The result is an interactive visual map where you can see exactly which workflows depend on each other. Click any node to see its full action chain, or filter by property to find every workflow that touches lifecycle stage.", bullets: ["Cross-enrollment detection", "Shared property tracing", "List and form reference mapping", "Interactive node filtering"], gradient: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", link: "/features/workflow-mapping" },
            { title: "Catch conflicts before they break your CRM", desc: "When two workflows write to the same property, things break silently. Entflow scans every write action across all your workflows and flags collisions - property write conflicts, circular dependencies, competing lifecycle stage updates, and orphaned enrollments that never fire.", bullets: ["Property write collision detection", "Circular dependency warnings", "Lifecycle stage conflict alerts", "Orphaned enrollment detection"], gradient: "linear-gradient(135deg, #FEF2F2, #FECACA)", link: "/features/conflict-detection" },
            { title: "AI that speaks HubSpot", desc: "The AI Workflow Analyst checks for GDPR consent before email sends, flags nurture sequences without suppression lists, detects property updates that could trigger infinite re-enrollment loops, and warns about emails firing without delays. Every issue comes with a severity level and a specific fix suggestion.", bullets: ["GDPR/consent compliance checks", "Infinite loop detection", "Deliverability risk analysis", "Specific fix suggestions per issue"], gradient: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", link: "/features/workflow-audit" },
          ].map((row, i) => (
            <div key={row.title} style={{ display: "flex", flexDirection: i % 2 === 0 ? "row" : "row-reverse", gap: 48, alignItems: "center", marginBottom: 64, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 400px" }}>
                <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{row.title}</h3>
                <p style={{ fontSize: 15, color: "#5B6471", lineHeight: 1.7, marginBottom: 20 }}>{row.desc}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                  {row.bullets.map((b) => (
                    <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
                      <span style={{ color: "#2563EB", fontWeight: 700 }}>✓</span> {b}
                    </div>
                  ))}
                </div>
                <Link href={row.link} style={{ fontSize: 14, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>Learn more →</Link>
              </div>
              <div style={{ flex: "1 1 340px", minHeight: 240, background: row.gradient, borderRadius: 16, border: "1px solid #E2E8F0" }} />
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 17, color: "#5B6471" }}>Start free. Upgrade when you need more. Every plan includes AI health scores.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, maxWidth: 1100, margin: "0 auto" }}>
            {/* Free */}
            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 16, padding: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Free</h3>
              <div style={{ fontSize: 32, fontWeight: 700, margin: "12px 0 4px" }}>$0<span style={{ fontSize: 14, fontWeight: 500, color: "#5B6471" }}>/mo</span></div>
              <p style={{ fontSize: 12, color: "#5B6471", marginBottom: 20 }}>Get started in seconds</p>
              <ul style={{ listStyle: "none", marginBottom: 20, padding: 0 }}>
                {["10 workflows", "Dependency map", "Conflict detection", "Changelog + diffs", "Sync every 2 hours"].map(f => (
                  <li key={f} style={{ fontSize: 13, padding: "5px 0", display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#059669", fontWeight: 700, fontSize: 12 }}>✓</span> {f}
                  </li>
                ))}
                <li style={{ fontSize: 13, padding: "5px 0", display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ color: "#7C3AED", fontWeight: 700, fontSize: 12 }}>✦</span> <span style={{ color: "#6D28D9", fontWeight: 500 }}>AI health scores</span>
                </li>
              </ul>
              <Link href="/connect" style={{ display: "block", width: "100%", textAlign: "center", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", background: "white", color: "#0F1419", border: "1.5px solid #E2E8F0" }}>Get Started</Link>
            </div>

            {/* Starter */}
            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 16, padding: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Starter</h3>
              <div style={{ fontSize: 32, fontWeight: 700, margin: "12px 0 4px" }}>$9<span style={{ fontSize: 14, fontWeight: 500, color: "#5B6471" }}>/mo</span></div>
              <p style={{ fontSize: 12, color: "#5B6471", marginBottom: 20 }}>For growing portals</p>
              <ul style={{ listStyle: "none", marginBottom: 20, padding: 0 }}>
                {["25 workflows", "Everything in Free", "Unlimited manual sync", "Workflow tagging", "Property impact (view)", "PNG + CSV export"].map(f => (
                  <li key={f} style={{ fontSize: 13, padding: "5px 0", display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#059669", fontWeight: 700, fontSize: 12 }}>✓</span> {f}
                  </li>
                ))}
                {["AI deep analysis (10/mo)", "AI trigger ordering"].map(f => (
                  <li key={f} style={{ fontSize: 13, padding: "5px 0", display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#7C3AED", fontWeight: 700, fontSize: 12 }}>✦</span> <span style={{ color: "#6D28D9", fontWeight: 500 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/connect" style={{ display: "block", width: "100%", textAlign: "center", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", background: "white", color: "#0F1419", border: "1.5px solid #E2E8F0" }}>Start Starter</Link>
            </div>

            {/* Growth */}
            <div style={{ background: "white", border: "2px solid #2563EB", borderRadius: 16, padding: 28, position: "relative" }}>
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#2563EB", color: "white", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 100, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Most Popular</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Growth</h3>
              <div style={{ fontSize: 32, fontWeight: 700, margin: "12px 0 4px" }}>$19<span style={{ fontSize: 14, fontWeight: 500, color: "#5B6471" }}>/mo</span></div>
              <p style={{ fontSize: 12, color: "#5B6471", marginBottom: 20 }}>For active RevOps teams</p>
              <ul style={{ listStyle: "none", marginBottom: 20, padding: 0 }}>
                {["100 workflows", "Everything in Starter", "Property conflict detail", "Canvas: sections + stickies", "PNG + CSV export"].map(f => (
                  <li key={f} style={{ fontSize: 13, padding: "5px 0", display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#059669", fontWeight: 700, fontSize: 12 }}>✓</span> {f}
                  </li>
                ))}
                {["AI deep analysis (50/mo)", "AI trigger ordering"].map(f => (
                  <li key={f} style={{ fontSize: 13, padding: "5px 0", display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#7C3AED", fontWeight: 700, fontSize: 12 }}>✦</span> <span style={{ color: "#6D28D9", fontWeight: 500 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/connect" style={{ display: "block", width: "100%", textAlign: "center", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", background: "#FF7A59", color: "white" }}>Start Growth</Link>
            </div>

            {/* Pro */}
            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 16, padding: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Pro</h3>
              <div style={{ fontSize: 32, fontWeight: 700, margin: "12px 0 4px" }}>$29<span style={{ fontSize: 14, fontWeight: 500, color: "#5B6471" }}>/mo</span></div>
              <p style={{ fontSize: 12, color: "#5B6471", marginBottom: 20 }}>Full toolkit, zero limits</p>
              <ul style={{ listStyle: "none", marginBottom: 20, padding: 0 }}>
                {["300 workflows", "Everything in Growth", "Full canvas toolkit", "SVG + PDF export", "Auto-sync", "Priority support"].map(f => (
                  <li key={f} style={{ fontSize: 13, padding: "5px 0", display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#059669", fontWeight: 700, fontSize: 12 }}>✓</span> {f}
                  </li>
                ))}
                {["Unlimited AI analysis", "AI trigger ordering"].map(f => (
                  <li key={f} style={{ fontSize: 13, padding: "5px 0", display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#7C3AED", fontWeight: 700, fontSize: 12 }}>✦</span> <span style={{ color: "#6D28D9", fontWeight: 500 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/connect" style={{ display: "block", width: "100%", textAlign: "center", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", background: "white", color: "#0F1419", border: "1.5px solid #E2E8F0" }}>Start Pro</Link>
            </div>
          </div>

          {/* Enterprise */}
          <div style={{ maxWidth: 1100, margin: "16px auto 0" }}>
            <div style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", borderRadius: 16, padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "white" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Enterprise</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Unlimited workflows, unlimited AI analysis, multi-portal, white-label, dedicated support.</p>
              </div>
              <a href="https://meetings-eu1.hubspot.com/kbredekamp1" target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>Book a Call →</a>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Link href="/pricing" style={{ fontSize: 14, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>Compare all features →</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", borderRadius: 24, padding: 60, textAlign: "center", color: "white" }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Stop guessing how your workflows connect</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 32, fontSize: 17 }}>Join RevOps teams who map and analyse their HubSpot automation in minutes.</p>
            <Link href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 10, fontWeight: 600, fontSize: 17, background: "#FF7A59", color: "white", textDecoration: "none", boxShadow: "0 4px 20px rgba(255,122,89,0.4)" }}>
              Connect HubSpot - It{"'"}s Free →
            </Link>
            <p style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Free up to 10 workflows. AI health scores included. No credit card required.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 0", borderTop: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #2563EB, #1D4ED8)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
                </div>
                Entflow
              </div>
              <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6, maxWidth: 280 }}>Visual workflow mapping and AI-powered analysis for HubSpot. Built for RevOps teams, agencies, and consultants.</p>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12 }}>Product</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href="/features/workflow-mapping" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Workflow Mapping</Link>
                <Link href="/features/workflow-audit" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>AI Workflow Audit</Link>
                <Link href="/features/conflict-detection" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Conflict Detection</Link>
                <Link href="/features/revops-documentation" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>RevOps Documentation</Link>
                <Link href="/pricing" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Pricing</Link>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12 }}>Use Cases</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href="/features/agencies" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Agencies & Consultants</Link>
                <Link href="/features/revops-documentation" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>RevOps Teams</Link>
                <Link href="/features/workflow-audit" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Portal Audits</Link>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12 }}>Resources</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href="/documentation" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Documentation</Link>
                <Link href="/termsofservice" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Terms of Service</Link>
                <Link href="/privacy" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Privacy Policy</Link>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 20, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#94A3B8" }}>© 2025 Entflow for HubSpot · Built for RevOps teams</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
