import Link from "next/link";

interface FeatureSection {
  title: string;
  desc: string;
  bullets?: string[];
}

interface FeaturePageProps {
  badge: string;
  badgeColor: string;
  badgeBg: string;
  title: string;
  subtitle: string;
  sections: FeatureSection[];
  relatedPages: { title: string; href: string; desc: string }[];
  ctaTitle?: string;
  ctaDesc?: string;
}

export default function FeaturePageLayout({
  badge, badgeColor, badgeBg, title, subtitle, sections, relatedPages,
  ctaTitle = "Ready to see your workflows clearly?",
  ctaDesc = "Connect HubSpot in 30 seconds. Free up to 10 workflows.",
}: FeaturePageProps) {
  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: "#FAFBFC", color: "#0F1419", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(250,251,252,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/landing" style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18, textDecoration: "none", color: "#0F1419" }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #2563EB, #1D4ED8)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
            </div>
            Entflow
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Link href="/landing#features" style={{ textDecoration: "none", color: "#5B6471", fontSize: 14, fontWeight: 500 }}>Features</Link>
            <Link href="/pricing" style={{ textDecoration: "none", color: "#5B6471", fontSize: 14, fontWeight: 500 }}>Pricing</Link>
            <Link href="/documentation" style={{ textDecoration: "none", color: "#5B6471", fontSize: 14, fontWeight: 500 }}>Docs</Link>
            <Link href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, background: "#FF7A59", color: "white", textDecoration: "none" }}>
              Connect HubSpot →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 60, textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", background: badgeBg, borderRadius: 100, fontSize: 13, fontWeight: 600, color: badgeColor, marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: badgeColor }} />
            {badge}
          </div>
          <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 16 }}>{title}</h1>
          <p style={{ fontSize: 18, color: "#5B6471", lineHeight: 1.7, maxWidth: 640, margin: "0 auto 32px" }}>{subtitle}</p>
          <Link href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, fontWeight: 600, fontSize: 15, background: "#FF7A59", color: "white", textDecoration: "none", boxShadow: "0 2px 12px rgba(255,122,89,0.3)" }}>
            Try It Free →
          </Link>
        </div>
      </section>

      {/* Content sections */}
      <section style={{ padding: "40px 0 80px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          {sections.map((section, i) => (
            <div key={i} style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.01em" }}>{section.title}</h2>
              <p style={{ fontSize: 16, color: "#374151", lineHeight: 1.8, marginBottom: section.bullets ? 16 : 0 }}>{section.desc}</p>
              {section.bullets && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                  {section.bullets.map((b) => (
                    <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#374151" }}>
                      <span style={{ color: "#2563EB", fontWeight: 700, flexShrink: 0 }}>✓</span> {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Related pages */}
      <section style={{ padding: "60px 0", background: "#F8FAFC" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: "center" }}>Related features</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {relatedPages.map((p) => (
              <Link key={p.href} href={p.href} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, height: "100%" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{p.title}</h3>
                  <p style={{ fontSize: 13, color: "#5B6471", lineHeight: 1.5 }}>{p.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", borderRadius: 24, padding: 48, textAlign: "center", color: "white" }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>{ctaTitle}</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 24, fontSize: 16 }}>{ctaDesc}</p>
            <Link href="/connect" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 10, fontWeight: 600, fontSize: 15, background: "#FF7A59", color: "white", textDecoration: "none", boxShadow: "0 4px 20px rgba(255,122,89,0.4)" }}>
              Connect HubSpot — Free →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 0", borderTop: "1px solid #E2E8F0", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 12 }}>
          <Link href="/landing" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Home</Link>
          <Link href="/pricing" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Pricing</Link>
          <Link href="/documentation" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Docs</Link>
          <Link href="/termsofservice" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Terms</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: "#5B6471", textDecoration: "none" }}>Privacy</Link>
        </div>
        <p style={{ fontSize: 13, color: "#94A3B8" }}>© 2025 Entflow for HubSpot</p>
      </footer>
    </div>
  );
}
