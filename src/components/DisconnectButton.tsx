"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DisconnectButton({ portalId, portalName }: { portalId: string; portalName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const disconnect = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portals?portalId=${portalId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Disconnect failed:", err);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-red-600">Remove {portalName}?</span>
        <button onClick={disconnect} disabled={loading}
          className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded transition-colors disabled:opacity-50">
          {loading ? "..." : "Yes"}
        </button>
        <button onClick={() => setConfirming(false)}
          className="text-[10px] font-medium text-gray-500 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors">
          No
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors">
      Disconnect
    </button>
  );
}
