// ===========================================
// Graph Layout Engine
// ===========================================
// Converts database records into React Flow-compatible
// graph data (nodes + edges) with automatic layout.

import type {
  GraphData,
  GraphNode,
  GraphEdge,
  WorkflowNodeData,
  MapFilters,
} from "@/types";

interface WorkflowRecord {
  id: string;
  hubspotFlowId: string;
  name: string;
  objectType: string;
  status: string;
  actionCount: number;
  enrollmentCount?: number | null;
  hubspotUpdatedAt?: Date | null;
  _count?: {
    sourceDependencies: number;
    targetDependencies: number;
    conflictWorkflows: number;
  };
}

interface DependencyRecord {
  id: string;
  sourceWorkflowId: string;
  targetWorkflowId: string | null;
  type: string;
  severity: string;
  description: string | null;
  detail: any;
}

// --- Edge colors by dependency type ---
const EDGE_COLORS: Record<string, string> = {
  PROPERTY_WRITE: "#2E75B6",   // Blue
  PROPERTY_READ: "#2E75B6",    // Blue
  CROSS_ENROLLMENT: "#E67E22",  // Orange
  LIST_REFERENCE: "#8E44AD",    // Purple
  EMAIL_SEND: "#E74C3C",        // Red
  DELAY_CHAIN: "#95A5A6",       // Gray
  WEBHOOK: "#27AE60",           // Green
};

// --- Edge dash patterns ---
const EDGE_STYLES: Record<string, string> = {
  PROPERTY_WRITE: "default",
  CROSS_ENROLLMENT: "default",
  LIST_REFERENCE: "default",
  EMAIL_SEND: "default",
  PROPERTY_READ: "dashed",
  DELAY_CHAIN: "dashed",
};

/**
 * Build React Flow graph data from workflow and dependency records.
 */
export function buildGraphData(
  workflows: WorkflowRecord[],
  dependencies: DependencyRecord[],
  filters?: MapFilters
): GraphData {
  // Apply filters
  let filteredWorkflows = workflows;
  let filteredDeps = dependencies;

  if (filters) {
    filteredWorkflows = applyFilters(workflows, filters);
    const visibleIds = new Set(filteredWorkflows.map((w) => w.id));

    filteredDeps = dependencies.filter(
      (d) =>
        visibleIds.has(d.sourceWorkflowId) &&
        (d.targetWorkflowId === null || visibleIds.has(d.targetWorkflowId))
    );

    // Also filter by dependency type if specified
    if (filters.dependencyTypes.length > 0) {
      filteredDeps = filteredDeps.filter((d) =>
        filters.dependencyTypes.includes(d.type)
      );
    }
  }

  // Build nodes
  const nodes: GraphNode[] = filteredWorkflows.map((wf, index) => {
    const position = calculatePosition(index, filteredWorkflows.length);
    const depCount =
      (wf._count?.sourceDependencies || 0) +
      (wf._count?.targetDependencies || 0);

    return {
      id: wf.id,
      type: "workflow",
      position,
      data: {
        workflowId: wf.id,
        hubspotFlowId: wf.hubspotFlowId,
        name: wf.name,
        objectType: wf.objectType,
        status: wf.status as "ACTIVE" | "INACTIVE" | "ERRORING",
        actionCount: wf.actionCount,
        enrollmentCount: wf.enrollmentCount ?? undefined,
        hasConflicts: (wf._count?.conflictWorkflows || 0) > 0,
        conflictCount: wf._count?.conflictWorkflows || 0,
        dependencyCount: depCount,
        hubspotUpdatedAt: wf.hubspotUpdatedAt?.toISOString(),
      },
    };
  });

  // Build edges
  const edges: GraphEdge[] = filteredDeps
    .filter((d) => d.targetWorkflowId !== null)
    .map((d) => ({
      id: d.id,
      source: d.sourceWorkflowId,
      target: d.targetWorkflowId!,
      type: "smoothstep" as const,
      animated: d.type === "CROSS_ENROLLMENT",
      data: {
        dependencyId: d.id,
        type: d.type,
        severity: d.severity,
        description: d.description ?? undefined,
        detail: d.detail || {},
      },
      style: {
        stroke: EDGE_COLORS[d.type] || "#95A5A6",
        strokeWidth: d.severity === "CRITICAL" ? 3 : d.severity === "WARNING" ? 2 : 1,
        strokeDasharray:
          EDGE_STYLES[d.type] === "dashed" ? "5 5" : undefined,
      },
      markerEnd: {
        type: "arrowclosed" as any,
        color: EDGE_COLORS[d.type] || "#95A5A6",
      },
    }));

  return { nodes, edges };
}

/**
 * Apply filters to the workflow list.
 */
function applyFilters(
  workflows: WorkflowRecord[],
  filters: MapFilters
): WorkflowRecord[] {
  let result = workflows;

  // Status filter
  if (filters.status.length > 0) {
    result = result.filter((w) =>
      filters.status.includes(w.status as any)
    );
  }

  // Object type filter
  if (filters.objectTypes.length > 0) {
    result = result.filter((w) =>
      filters.objectTypes.includes(w.objectType)
    );
  }

  // Search query
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase().trim();
    result = result.filter((w) =>
      w.name.toLowerCase().includes(query)
    );
  }

  return result;
}

/**
 * Calculate node position using a force-directed-like layout.
 * This is a simple grid/circular layout for initial positioning.
 * React Flow's fitView + user dragging handles the rest.
 *
 * For a production app, you'd want to use a proper graph layout
 * algorithm (dagre, elkjs) based on the edge structure.
 */
function calculatePosition(
  index: number,
  total: number
): { x: number; y: number } {
  if (total <= 10) {
    // Small graph: two columns
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      x: col * 350 + 50,
      y: row * 200 + 50,
    };
  }

  if (total <= 30) {
    // Medium graph: three columns
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: col * 350 + 50,
      y: row * 180 + 50,
    };
  }

  // Large graph: circular layout
  const radius = Math.max(400, total * 15);
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius + radius + 100,
    y: Math.sin(angle) * radius + radius + 100,
  };
}

/**
 * Highlight nodes matching a property search.
 * Returns a Set of workflow IDs that should be highlighted.
 */
export function findWorkflowsByProperty(
  propertyName: string,
  propertyIndex: Array<{
    propertyName: string;
    readByWorkflows: string[];
    writtenByWorkflows: string[];
  }>,
  workflowHubspotIdToId: Map<string, string>
): Set<string> {
  const highlighted = new Set<string>();
  const query = propertyName.toLowerCase();

  for (const prop of propertyIndex) {
    if (prop.propertyName.toLowerCase().includes(query)) {
      for (const hubspotId of [
        ...prop.readByWorkflows,
        ...prop.writtenByWorkflows,
      ]) {
        const internalId = workflowHubspotIdToId.get(hubspotId);
        if (internalId) highlighted.add(internalId);
      }
    }
  }

  return highlighted;
}
