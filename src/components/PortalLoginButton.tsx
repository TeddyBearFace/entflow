"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PortalLoginButton({ portalId, href, children, className }: {
  portalId: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalId }),
      });
      router.push(href);
    } catch {
      // Fallback: navigate anyway
      router.push(href);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "..." : children}
    </button>
  );
}
