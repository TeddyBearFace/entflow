// components/analyst/WorkflowHealthBadge.tsx
"use client";

import type { LocalScore } from "@/lib/local-scorer";

interface Props {
  score: LocalScore;
  size?: "sm" | "md" | "lg";
  showFlags?: boolean;
}

export default function WorkflowHealthBadge({
  score,
  size = "md",
  showFlags = true,
}: Props) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };

  const flagLimit = size === "sm" ? 1 : size === "md" ? 2 : 4;

  return (
    <div className="flex items-center gap-2">
      {/* Grade circle */}
      <div
        className={`${sizeClasses[size]} ${score.bgColor} ${score.color} rounded-full flex items-center justify-center font-bold shrink-0 ring-1 ring-inset ring-black/5 dark:ring-white/10`}
        title={`Health score: ${score.overall}/100`}
      >
        {score.grade}
      </div>

      {/* Flags */}
      {showFlags && score.flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {score.flags.slice(0, flagLimit).map((flag, i) => (
            <span
              key={i}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 whitespace-nowrap"
            >
              {flag}
            </span>
          ))}
          {score.flags.length > flagLimit && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              +{score.flags.length - flagLimit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
