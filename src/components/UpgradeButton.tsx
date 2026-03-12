"use client";

export default function UpgradeButton({ portalId, className, children }: { portalId: string; className?: string; children: React.ReactNode }) {
  const handleClick = () => {
    window.location.href = `/pricing?portal=${portalId}`;
  };

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
