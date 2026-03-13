// app/analyst/page.tsx
import WorkflowAnalyst from "@/components/analyst/WorkflowAnalyst";

export const metadata = {
  title: "AI Workflow Analyst · Entflow",
  description: "AI-powered audit and optimization for HubSpot workflows",
};

export default function AnalystPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6">
      <WorkflowAnalyst />
    </main>
  );
}
