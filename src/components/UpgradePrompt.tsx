"use client";

import { useState } from "react";

interface UpgradePromptProps {
  portalId: string;
  feature: string;
  inline?: boolean; // Small inline badge vs full overlay
}

export default function UpgradePrompt({ portalId, feature, inline = false }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
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
      console.error("Upgrade failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (inline) {
    return (
      <button onClick={handleUpgrade} disabled={loading}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-50">
        {loading ? "..." : <>🔒 Pro</>}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3">
        <span className="text-lg">🔒</span>
      </div>
      <h4 className="text-sm font-bold text-gray-900 mb-1">{feature} is a Pro feature</h4>
      <p className="text-xs text-gray-500 mb-4">Upgrade to unlock {feature.toLowerCase()} and more.</p>
      <button onClick={handleUpgrade} disabled={loading}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-md disabled:opacity-50"
        style={{ backgroundColor: "#FF7A59" }}>
        {loading ? "Loading..." : "Upgrade to Pro — $29/mo"}
      </button>
    </div>
  );
}
