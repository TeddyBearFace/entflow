"use client";

import { useState } from "react";

export default function UpgradeButton({ portalId, className, children }: { portalId: string; className?: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Loading..." : children}
    </button>
  );
}
