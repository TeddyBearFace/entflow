// components/analyst/UpgradePrompt.tsx
"use client";

interface Props {
  message: string;
  currentTier: string;
}

export default function UpgradePrompt({ message, currentTier }: Props) {
  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
            AI Deep Analysis
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300">
              Paid plans
            </span>
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {message}
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 hover:brightness-110 transition-all"
          >
            View Plans
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
