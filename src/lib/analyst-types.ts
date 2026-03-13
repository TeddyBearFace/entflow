// lib/analyst-types.ts
// Entflow AI Workflow Analyst — Type Definitions

export interface WorkflowStep {
  id: string;
  type:
    | "trigger"
    | "action"
    | "condition"
    | "delay"
    | "branch"
    | "goto"
    | "enrollment";
  name: string;
  description?: string;
  config?: Record<string, unknown>;
  children?: string[]; // IDs of next steps
}

export interface WorkflowInput {
  name: string;
  description?: string;
  steps: WorkflowStep[];
  rawJson?: string; // paste-in option
  objectType?: string; // e.g. "contact", "deal", "company"
  enrollmentCriteria?: string;
}

export interface AnalysisIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  detail: string;
  stepId?: string;
  suggestion: string;
}

export interface AnalysisMetrics {
  totalSteps: number;
  branchDepth: number;
  estimatedRuntime: string;
  complexityScore: number; // 1-10
  enrollmentRisk: "low" | "medium" | "high";
}

export interface AnalysisResult {
  summary: string;
  metrics: AnalysisMetrics;
  issues: AnalysisIssue[];
  optimizations: string[];
  bestPractices: string[];
}

export type AnalystMode = "paste" | "structured";
