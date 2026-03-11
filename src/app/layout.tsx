import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entflow — Visual Workflow Map for HubSpot",
  description:
    "See how your HubSpot workflows actually connect. Visual dependency map, property conflict detection, and a canvas for documenting your entire RevOps architecture.",
  openGraph: {
    title: "Entflow — Visual Workflow Map for HubSpot",
    description: "Visual dependency map, conflict detection, and RevOps canvas for HubSpot.",
    type: "website",
    url: "https://entflow.app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
