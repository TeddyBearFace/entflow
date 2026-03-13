// lib/local-scorer.ts
// Entflow Local Workflow Scoring Engine
// Runs entirely client-side or server-side — zero API cost

export interface LocalIssue {
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  detail: string;
  stepId?: string;
}

export interface LocalScore {
  overall: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  color: string; // tailwind text color
  bgColor: string; // tailwind bg color
  totalSteps: number;
  branchDepth: number;
  hasDelay: boolean;
  hasCondition: boolean;
  hasSuppression: boolean;
  hasUnenrollment: boolean;
  issues: LocalIssue[];
  flags: string[]; // short labels like "No suppression", "Deep nesting"
}

// ── Helpers ───────────────────────────────────────────────────────

function computeBranchDepth(steps: any[]): number {
  let maxDepth = 0;

  function walk(stepId: string, depth: number, visited: Set<string>) {
    if (visited.has(stepId)) return;
    visited.add(stepId);
    maxDepth = Math.max(maxDepth, depth);

    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    // Check branches (if/then)
    if (step.branches) {
      const branchKeys = Object.keys(step.branches);
      for (const key of branchKeys) {
        const targets = step.branches[key];
        if (Array.isArray(targets)) {
          for (const t of targets) {
            walk(t, depth + 1, new Set(visited));
          }
        }
      }
    }

    // Check children (linear next steps)
    if (step.children && Array.isArray(step.children)) {
      for (const c of step.children) {
        walk(c, depth, new Set(visited));
      }
    }
  }

  // Start from first step or trigger
  const starts = steps.filter(
    (s) =>
      s.type === "trigger" ||
      s.type === "enrollment" ||
      !steps.some(
        (other) =>
          other.children?.includes(s.id) ||
          Object.values(other.branches || {}).some(
            (b: any) => Array.isArray(b) && b.includes(s.id)
          )
      )
  );

  for (const start of starts.length > 0 ? starts : [steps[0]]) {
    if (start) walk(start.id, 0, new Set());
  }

  return maxDepth;
}

function extractSteps(workflow: any): any[] {
  // Handle both { steps: [...] } and raw array
  if (Array.isArray(workflow)) return workflow;
  if (workflow?.steps && Array.isArray(workflow.steps)) return workflow.steps;
  if (workflow?.actions && Array.isArray(workflow.actions)) return workflow.actions;
  return [];
}

function looksLikeEmail(step: any): boolean {
  const name = (step.name || "").toLowerCase();
  const type = (step.type || "").toLowerCase();
  const configType = (step.config?.type || "").toLowerCase();
  return (
    name.includes("email") ||
    name.includes("send") ||
    type === "email" ||
    type === "send_email" ||
    configType.includes("email")
  );
}

function looksLikeDelay(step: any): boolean {
  const type = (step.type || "").toLowerCase();
  const name = (step.name || "").toLowerCase();
  return type === "delay" || type === "wait" || name.includes("wait") || name.includes("delay");
}

function looksLikeCondition(step: any): boolean {
  const type = (step.type || "").toLowerCase();
  return type === "condition" || type === "branch" || type === "if" || type === "if/then";
}

function looksLikePropertyUpdate(step: any): boolean {
  const name = (step.name || "").toLowerCase();
  const type = (step.type || "").toLowerCase();
  return (
    name.includes("set property") ||
    name.includes("update") ||
    name.includes("copy property") ||
    type === "property_update" ||
    type === "set_property" ||
    (step.config?.property && step.config?.value !== undefined)
  );
}

// ── Main scorer ──────────────────────────────────────────────────

export function scoreWorkflow(workflowInput: any): LocalScore {
  const issues: LocalIssue[] = [];
  const flags: string[] = [];

  let steps: any[];
  try {
    const parsed =
      typeof workflowInput === "string"
        ? JSON.parse(workflowInput)
        : workflowInput;
    steps = extractSteps(parsed);
  } catch {
    return {
      overall: 0,
      grade: "F",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-950/40",
      totalSteps: 0,
      branchDepth: 0,
      hasDelay: false,
      hasCondition: false,
      hasSuppression: false,
      hasUnenrollment: false,
      issues: [
        {
          severity: "critical",
          category: "Parse Error",
          title: "Could not parse workflow",
          detail: "The workflow definition could not be parsed as JSON.",
        },
      ],
      flags: ["Parse error"],
    };
  }

  if (steps.length === 0) {
    return {
      overall: 0,
      grade: "F",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-950/40",
      totalSteps: 0,
      branchDepth: 0,
      hasDelay: false,
      hasCondition: false,
      hasSuppression: false,
      hasUnenrollment: false,
      issues: [
        {
          severity: "critical",
          category: "Structure",
          title: "Empty workflow",
          detail: "No steps found in this workflow.",
        },
      ],
      flags: ["Empty"],
    };
  }

  // ── Metrics ─────────────────────────────────────────────────

  const totalSteps = steps.length;
  const branchDepth = computeBranchDepth(steps);
  const emailSteps = steps.filter(looksLikeEmail);
  const delaySteps = steps.filter(looksLikeDelay);
  const conditionSteps = steps.filter(looksLikeCondition);
  const propertySteps = steps.filter(looksLikePropertyUpdate);

  const hasDelay = delaySteps.length > 0;
  const hasCondition = conditionSteps.length > 0;

  // ── Suppression / unenrollment detection ────────────────────

  const fullText = JSON.stringify(workflowInput).toLowerCase();
  const hasSuppression =
    fullText.includes("suppression") ||
    fullText.includes("suppress") ||
    fullText.includes("exclusion") ||
    fullText.includes("exclude");
  const hasUnenrollment =
    fullText.includes("unenroll") ||
    fullText.includes("unenrol") ||
    fullText.includes("goal") ||
    fullText.includes("removal");
  const hasConsent =
    fullText.includes("consent") ||
    fullText.includes("gdpr") ||
    fullText.includes("opt-in") ||
    fullText.includes("optin") ||
    fullText.includes("subscription") ||
    fullText.includes("unsubscribe");

  // ── Score calculation (start at 100, deduct) ────────────────

  let score = 100;

  // --- Critical checks ---

  // No suppression list
  if (emailSteps.length > 0 && !hasSuppression) {
    score -= 15;
    issues.push({
      severity: "critical",
      category: "Compliance",
      title: "No suppression list detected",
      detail:
        "Workflows with email sends should use suppression lists to prevent sending to unsubscribed or opted-out contacts.",
    });
    flags.push("No suppression");
  }

  // No GDPR/consent check before emails
  if (emailSteps.length > 0 && !hasConsent) {
    score -= 10;
    issues.push({
      severity: "critical",
      category: "Compliance",
      title: "No consent/GDPR check detected",
      detail:
        "Email sends should check for marketing consent or subscription status before sending.",
    });
    flags.push("No consent check");
  }

  // No unenrollment/goal criteria
  if (!hasUnenrollment && totalSteps > 3) {
    score -= 10;
    issues.push({
      severity: "warning",
      category: "Logic",
      title: "No unenrollment criteria detected",
      detail:
        "Without goal criteria or unenrollment triggers, contacts may complete the full workflow even if they've already converted.",
    });
    flags.push("No unenrollment");
  }

  // --- Structural checks ---

  // Too many steps
  if (totalSteps > 30) {
    score -= 10;
    issues.push({
      severity: "warning",
      category: "Scalability",
      title: "Very long workflow",
      detail: `This workflow has ${totalSteps} steps. Consider splitting into multiple smaller workflows for maintainability.`,
    });
    flags.push("Very long");
  } else if (totalSteps > 15) {
    score -= 5;
    issues.push({
      severity: "info",
      category: "Scalability",
      title: "Long workflow",
      detail: `This workflow has ${totalSteps} steps. Keep an eye on complexity as it grows.`,
    });
  }

  // Deep nesting
  if (branchDepth > 5) {
    score -= 15;
    issues.push({
      severity: "critical",
      category: "Complexity",
      title: "Deeply nested branches",
      detail: `Branch depth of ${branchDepth} is very high. This makes the workflow hard to debug and maintain.`,
    });
    flags.push("Deep nesting");
  } else if (branchDepth > 3) {
    score -= 8;
    issues.push({
      severity: "warning",
      category: "Complexity",
      title: "Moderate branch nesting",
      detail: `Branch depth of ${branchDepth}. Consider flattening with separate workflows or go-to actions.`,
    });
    flags.push("Nested branches");
  }

  // Many emails without delays
  if (emailSteps.length > 2 && delaySteps.length === 0) {
    score -= 12;
    issues.push({
      severity: "critical",
      category: "Deliverability",
      title: "Multiple emails with no delays",
      detail: `${emailSteps.length} email sends with no delay steps. This will fire all emails at once, harming deliverability and UX.`,
    });
    flags.push("No delays between emails");
  }

  // Email to delay ratio
  if (emailSteps.length > 0 && delaySteps.length > 0) {
    const ratio = emailSteps.length / delaySteps.length;
    if (ratio > 2) {
      score -= 5;
      issues.push({
        severity: "warning",
        category: "Deliverability",
        title: "Low delay-to-email ratio",
        detail:
          "Consider adding delays between email sends to avoid overwhelming contacts.",
      });
    }
  }

  // Property updates that could loop
  if (propertySteps.length > 0) {
    // Check if any property being set matches enrollment criteria keywords
    for (const step of propertySteps) {
      const propName = (
        step.config?.property ||
        step.name ||
        ""
      ).toLowerCase();
      if (
        propName.includes("lifecycle") ||
        propName.includes("status") ||
        propName.includes("stage")
      ) {
        score -= 8;
        issues.push({
          severity: "warning",
          category: "Logic",
          title: "Lifecycle/status property update in workflow",
          detail: `Step "${step.name}" updates a lifecycle or status property. If this property is also an enrollment trigger, it could cause re-enrollment loops.`,
          stepId: step.id,
        });
        flags.push("Loop risk");
        break; // only flag once
      }
    }
  }

  // Conditions without fallback branches
  for (const step of conditionSteps) {
    if (step.branches) {
      const branchKeys = Object.keys(step.branches);
      const hasNoBranch =
        !branchKeys.includes("no") &&
        !branchKeys.includes("false") &&
        !branchKeys.includes("else") &&
        !branchKeys.includes("default") &&
        !branchKeys.includes("none");
      if (hasNoBranch && branchKeys.length === 1) {
        score -= 5;
        issues.push({
          severity: "warning",
          category: "Logic",
          title: "Condition without fallback branch",
          detail: `Step "${step.name}" only has one branch. Contacts that don't match will silently exit the workflow.`,
          stepId: step.id,
        });
      }
    }
  }

  // No conditions at all (for workflows with 5+ steps)
  if (conditionSteps.length === 0 && totalSteps > 5) {
    score -= 5;
    issues.push({
      severity: "info",
      category: "Logic",
      title: "No conditional logic",
      detail:
        "This workflow has no if/then branches. All enrolled contacts follow the same path regardless of behavior.",
    });
    flags.push("Linear only");
  }

  // --- Positive bonuses (cap at 100) ---

  // Has both delays and conditions — well structured
  if (hasDelay && hasCondition && emailSteps.length > 0) {
    score += 5;
  }

  // Has suppression and consent — compliance-aware
  if (hasSuppression && hasConsent) {
    score += 5;
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // ── Grade ───────────────────────────────────────────────────

  let grade: LocalScore["grade"];
  let color: string;
  let bgColor: string;

  if (score >= 90) {
    grade = "A";
    color = "text-emerald-600 dark:text-emerald-400";
    bgColor = "bg-emerald-100 dark:bg-emerald-950/40";
  } else if (score >= 75) {
    grade = "B";
    color = "text-sky-600 dark:text-sky-400";
    bgColor = "bg-sky-100 dark:bg-sky-950/40";
  } else if (score >= 60) {
    grade = "C";
    color = "text-amber-600 dark:text-amber-400";
    bgColor = "bg-amber-100 dark:bg-amber-950/40";
  } else if (score >= 40) {
    grade = "D";
    color = "text-orange-600 dark:text-orange-400";
    bgColor = "bg-orange-100 dark:bg-orange-950/40";
  } else {
    grade = "F";
    color = "text-red-600 dark:text-red-400";
    bgColor = "bg-red-100 dark:bg-red-950/40";
  }

  return {
    overall: score,
    grade,
    color,
    bgColor,
    totalSteps,
    branchDepth,
    hasDelay,
    hasCondition,
    hasSuppression,
    hasUnenrollment,
    issues,
    flags,
  };
}
