// ===========================================
// Conflict Detector
// ===========================================
// Analyzes parsed workflows and dependency data to detect
// potential issues that could cause problems in production.

import type {
  ParsedWorkflow,
  DetectedConflict,
  PropertyIndexEntry,
} from "@/types";
import type { DependencyEdge } from "./parser";

/**
 * Run all conflict detection rules against the parsed workflow data.
 * Returns an array of detected conflicts sorted by severity.
 */
export function detectConflicts(
  parsedWorkflows: ParsedWorkflow[],
  edges: DependencyEdge[],
  propertyIndex: PropertyIndexEntry[]
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  // Build lookup maps
  const workflowMap = new Map(
    parsedWorkflows.map((wf) => [wf.hubspotFlowId, wf])
  );
  const activeWorkflowIds = new Set(
    parsedWorkflows
      .filter((wf) => wf.status === "ACTIVE")
      .map((wf) => wf.hubspotFlowId)
  );

  // Run each detection rule
  conflicts.push(
    ...detectPropertyWriteCollisions(parsedWorkflows, propertyIndex, workflowMap)
  );
  conflicts.push(
    ...detectCircularDependencies(edges, workflowMap)
  );
  conflicts.push(
    ...detectInactiveReferences(edges, activeWorkflowIds, workflowMap)
  );
  conflicts.push(
    ...detectEmailOverlaps(parsedWorkflows, workflowMap)
  );
  conflicts.push(
    ...detectOrphanedEnrollments(edges, workflowMap)
  );

  // Sort by severity (CRITICAL first)
  return conflicts.sort(
    (a, b) => severityOrder(b.severity) - severityOrder(a.severity)
  );
}

function severityOrder(s: string): number {
  switch (s) {
    case "CRITICAL": return 3;
    case "WARNING": return 2;
    case "INFO": return 1;
    default: return 0;
  }
}

// ===========================================
// Rule 1: Property Write Collisions
// ===========================================
// Two or more ACTIVE workflows writing to the same property.
// This can cause race conditions where the final value depends
// on which workflow executes last.

function detectPropertyWriteCollisions(
  parsedWorkflows: ParsedWorkflow[],
  propertyIndex: PropertyIndexEntry[],
  workflowMap: Map<string, ParsedWorkflow>
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  for (const prop of propertyIndex) {
    // Only care about properties with multiple active writers
    const activeWriters = prop.writtenByWorkflows.filter((id) => {
      const wf = workflowMap.get(id);
      return wf && wf.status === "ACTIVE";
    });

    if (activeWriters.length < 2) continue;

    const writerNames = activeWriters.map(
      (id) => workflowMap.get(id)?.name || id
    );

    conflicts.push({
      type: "PROPERTY_WRITE_COLLISION",
      severity: "CRITICAL",
      description: `${activeWriters.length} active workflows write to "${prop.propertyName}": ${writerNames.join(", ")}. This can cause race conditions.`,
      involvedWorkflowIds: activeWriters,
      detail: {
        propertyName: prop.propertyName,
        objectType: prop.objectType,
        writerCount: activeWriters.length,
        writerNames,
      },
    });
  }

  return conflicts;
}

// ===========================================
// Rule 2: Circular Dependencies
// ===========================================
// Workflow A enrolls into B, and B enrolls into A (directly or through a chain).
// This can cause infinite loops if enrollment criteria overlap.

function detectCircularDependencies(
  edges: DependencyEdge[],
  workflowMap: Map<string, ParsedWorkflow>
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  // Build adjacency list from cross-enrollment edges only
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.type !== "CROSS_ENROLLMENT") continue;
    if (!adjacency.has(edge.sourceFlowId)) {
      adjacency.set(edge.sourceFlowId, new Set());
    }
    adjacency.get(edge.sourceFlowId)!.add(edge.targetFlowId);
  }

  // DFS cycle detection
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      // Found a cycle - extract it from the path
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    const neighbors = adjacency.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path]);
      }
    }

    inStack.delete(node);
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  // Deduplicate cycles (same nodes in different order)
  const seenCycles = new Set<string>();
  for (const cycle of cycles) {
    const key = [...cycle].sort().join(",");
    if (seenCycles.has(key)) continue;
    seenCycles.add(key);

    const names = cycle.map((id) => workflowMap.get(id)?.name || id);
    conflicts.push({
      type: "CIRCULAR_DEPENDENCY",
      severity: "CRITICAL",
      description: `Circular enrollment chain detected: ${names.join(" → ")} → ${names[0]}. This can cause infinite loops.`,
      involvedWorkflowIds: cycle,
      detail: {
        chain: cycle,
        chainNames: names,
      },
    });
  }

  return conflicts;
}

// ===========================================
// Rule 3: Inactive References
// ===========================================
// An active workflow enrolls contacts into an inactive workflow.
// The enrollment will silently do nothing.

function detectInactiveReferences(
  edges: DependencyEdge[],
  activeWorkflowIds: Set<string>,
  workflowMap: Map<string, ParsedWorkflow>
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  for (const edge of edges) {
    if (edge.type !== "CROSS_ENROLLMENT") continue;

    const source = workflowMap.get(edge.sourceFlowId);
    const target = workflowMap.get(edge.targetFlowId);

    // Active workflow enrolling into an inactive one
    if (
      source &&
      source.status === "ACTIVE" &&
      target &&
      target.status === "INACTIVE"
    ) {
      conflicts.push({
        type: "INACTIVE_REFERENCE",
        severity: "WARNING",
        description: `Active workflow "${source.name}" enrolls contacts into inactive workflow "${target.name}". Enrollments will silently fail.`,
        involvedWorkflowIds: [edge.sourceFlowId, edge.targetFlowId],
        detail: {
          sourceWorkflow: source.name,
          targetWorkflow: target.name,
          sourceStatus: source.status,
          targetStatus: target.status,
        },
      });
    }
  }

  return conflicts;
}

// ===========================================
// Rule 4: Email Overlaps
// ===========================================
// Multiple active workflows sending the same email.
// Contacts could receive duplicate emails.

function detectEmailOverlaps(
  parsedWorkflows: ParsedWorkflow[],
  workflowMap: Map<string, ParsedWorkflow>
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  // Build email -> active workflows map
  const emailToWorkflows = new Map<string, string[]>();
  for (const wf of parsedWorkflows) {
    if (wf.status !== "ACTIVE") continue;
    for (const email of wf.emailSends) {
      if (!emailToWorkflows.has(email.emailId)) {
        emailToWorkflows.set(email.emailId, []);
      }
      emailToWorkflows.get(email.emailId)!.push(wf.hubspotFlowId);
    }
  }

  for (const [emailId, workflowIds] of emailToWorkflows) {
    if (workflowIds.length < 2) continue;

    const names = workflowIds.map(
      (id) => workflowMap.get(id)?.name || id
    );

    conflicts.push({
      type: "EMAIL_OVERLAP",
      severity: "WARNING",
      description: `Email ${emailId} is sent by ${workflowIds.length} active workflows: ${names.join(", ")}. Contacts may receive duplicate emails.`,
      involvedWorkflowIds: workflowIds,
      detail: {
        emailId,
        workflowCount: workflowIds.length,
        workflowNames: names,
      },
    });
  }

  return conflicts;
}

// ===========================================
// Rule 5: Orphaned Enrollments
// ===========================================
// A workflow enrolls contacts into a workflow that doesn't exist
// in the current portal (deleted or wrong ID).

function detectOrphanedEnrollments(
  edges: DependencyEdge[],
  workflowMap: Map<string, ParsedWorkflow>
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  for (const edge of edges) {
    if (edge.type !== "CROSS_ENROLLMENT") continue;

    const source = workflowMap.get(edge.sourceFlowId);
    const target = workflowMap.get(edge.targetFlowId);

    if (source && !target) {
      conflicts.push({
        type: "ORPHANED_ENROLLMENT",
        severity: "WARNING",
        description: `"${source.name}" enrolls contacts into workflow ${edge.targetFlowId} which doesn't exist or has been deleted.`,
        involvedWorkflowIds: [edge.sourceFlowId],
        detail: {
          sourceWorkflow: source.name,
          missingTargetFlowId: edge.targetFlowId,
        },
      });
    }
  }

  return conflicts;
}
