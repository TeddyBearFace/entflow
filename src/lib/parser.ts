// ===========================================
// Workflow Parser
// ===========================================
// Two-pass parser that extracts structured dependency information
// from raw HubSpot workflow JSON.
//
// Pass 1 (parseWorkflow): Parse each workflow individually, extracting
//   property reads/writes, cross-enrollments, list references, etc.
//
// Pass 2 (buildDependencyGraph): Compare parsed workflows against each
//   other to generate dependency edges and a property index.

import type {
  HubSpotFlowDetail,
  HubSpotAction,
  HubSpotBranch,
  HubSpotEnrollmentCriteria,
  HubSpotFilter,
  HubSpotFilterBranch,
  HubSpotFilterGroup,
  ParsedWorkflow,
  PropertyReference,
  CrossEnrollmentReference,
  ListReference,
  EmailReference,
  WebhookReference,
  DelayReference,
  PropertyIndexEntry,
  GraphEdge,
} from "@/types";
import { resolveObjectType } from "@/types";

// --- Action type constants ---
// HubSpot action types we care about for dependency detection.
// This list covers the most common types; unknown types are logged and skipped.

const ACTION_TYPES = {
  SET_PROPERTY: "SET_CONTACT_PROPERTY", // Also: SET_COMPANY_PROPERTY, SET_DEAL_PROPERTY, etc.
  COPY_PROPERTY: "COPY_PROPERTY",
  CLEAR_PROPERTY: "CLEAR_CONTACT_PROPERTY",
  ENROLL_IN_WORKFLOW: "ENROLL_IN_WORKFLOW",
  UNENROLL_FROM_WORKFLOW: "UNENROLL_FROM_WORKFLOW",
  SEND_EMAIL: "SEND_EMAIL",
  SEND_MARKETING_EMAIL: "EMAIL",
  WEBHOOK: "WEBHOOK",
  DELAY: "DELAY",
  IF_BRANCH: "IF",
  BRANCH: "BRANCH",
  ADD_TO_LIST: "ADD_TO_LIST",
  REMOVE_FROM_LIST: "REMOVE_FROM_LIST",
  CREATE_RECORD: "CREATE_RECORD",
  CUSTOM_CODE: "CUSTOM_CODE",
} as const;

// Property-setting action prefixes (HubSpot uses different action types per object)
const SET_PROPERTY_PREFIXES = [
  "SET_CONTACT_PROPERTY",
  "SET_COMPANY_PROPERTY",
  "SET_DEAL_PROPERTY",
  "SET_TICKET_PROPERTY",
  "SET_PROPERTY",
  "MANAGE_CONTACT_PROPERTY",
];

const CLEAR_PROPERTY_PREFIXES = [
  "CLEAR_CONTACT_PROPERTY",
  "CLEAR_COMPANY_PROPERTY",
  "CLEAR_DEAL_PROPERTY",
  "CLEAR_PROPERTY",
];

// ===========================================
// PASS 1: Parse Individual Workflows
// ===========================================

/**
 * Parse a single HubSpot workflow into a structured representation
 * of all its dependencies.
 */
export function parseWorkflow(flow: HubSpotFlowDetail): ParsedWorkflow {
  const objectType = resolveObjectType(flow.objectTypeId);
  const propertiesRead: PropertyReference[] = [];
  const propertiesWritten: PropertyReference[] = [];
  const crossEnrollments: CrossEnrollmentReference[] = [];
  const listReferences: ListReference[] = [];
  const emailSends: EmailReference[] = [];
  const webhooks: WebhookReference[] = [];
  const delays: DelayReference[] = [];

  // Parse enrollment criteria for property reads and list references
  if (flow.enrollmentCriteria) {
    parseEnrollmentCriteria(
      flow.enrollmentCriteria,
      objectType,
      propertiesRead,
      listReferences
    );
  }

  // Parse all actions recursively (handles branches, nested actions)
  let actionCount = 0;
  if (flow.actions) {
    actionCount = parseActions(
      flow.actions,
      objectType,
      propertiesRead,
      propertiesWritten,
      crossEnrollments,
      listReferences,
      emailSends,
      webhooks,
      delays
    );
  }

  return {
    hubspotFlowId: flow.id,
    name: flow.name || `Unnamed Workflow ${flow.id}`,
    objectType,
    status: flow.isEnabled ? "ACTIVE" : "INACTIVE",
    flowType: flow.type || "UNKNOWN",
    actionCount,
    propertiesRead: deduplicateProperties(propertiesRead),
    propertiesWritten: deduplicateProperties(propertiesWritten),
    crossEnrollments,
    listReferences: deduplicateLists(listReferences),
    emailSends,
    webhooks,
    delays,
  };
}

// --- Enrollment Criteria Parsing ---

function parseEnrollmentCriteria(
  criteria: HubSpotEnrollmentCriteria,
  objectType: string,
  propertiesRead: PropertyReference[],
  listReferences: ListReference[]
): void {
  // List-based enrollment
  if (criteria.listId) {
    listReferences.push({
      listId: criteria.listId.toString(),
      context: "enrollment",
    });
  }

  // Filter-based enrollment
  if (criteria.filterBranches) {
    for (const branch of criteria.filterBranches) {
      parseFilterBranch(branch, objectType, propertiesRead, listReferences);
    }
  }
}

function parseFilterBranch(
  branch: HubSpotFilterBranch,
  objectType: string,
  propertiesRead: PropertyReference[],
  listReferences: ListReference[]
): void {
  if (branch.filterGroups) {
    for (const group of branch.filterGroups) {
      parseFilterGroup(group, objectType, propertiesRead, listReferences);
    }
  }
  if (branch.filters) {
    for (const filter of branch.filters) {
      parseFilter(filter, objectType, propertiesRead, listReferences);
    }
  }
}

function parseFilterGroup(
  group: HubSpotFilterGroup,
  objectType: string,
  propertiesRead: PropertyReference[],
  listReferences: ListReference[]
): void {
  if (group.filters) {
    for (const filter of group.filters) {
      parseFilter(filter, objectType, propertiesRead, listReferences);
    }
  }
}

function parseFilter(
  filter: HubSpotFilter,
  objectType: string,
  propertiesRead: PropertyReference[],
  listReferences: ListReference[]
): void {
  // Property-based filter
  if (filter.property) {
    propertiesRead.push({
      propertyName: filter.property,
      objectType: filter.propertyObjectType || objectType,
      context: "enrollment",
    });
  }

  // List membership filter
  if (filter.filterType === "IN_LIST" || filter.type === "IN_LIST") {
    const listId = (filter as any).listId || (filter as any).list;
    if (listId) {
      listReferences.push({
        listId: listId.toString(),
        context: "enrollment",
      });
    }
  }
}

// --- Action Parsing (Recursive) ---

/**
 * Recursively parse all actions in a workflow.
 * Returns the total number of action nodes found.
 */
function parseActions(
  actions: HubSpotAction[],
  objectType: string,
  propertiesRead: PropertyReference[],
  propertiesWritten: PropertyReference[],
  crossEnrollments: CrossEnrollmentReference[],
  listReferences: ListReference[],
  emailSends: EmailReference[],
  webhooks: WebhookReference[],
  delays: DelayReference[]
): number {
  let count = 0;

  for (const action of actions) {
    count++;
    const actionType = (action.type || "").toUpperCase();

    // --- Property writes ---
    if (isSetPropertyAction(actionType)) {
      const propName = action.propertyName || (action as any).property;
      if (propName) {
        propertiesWritten.push({
          propertyName: propName,
          objectType: inferObjectTypeFromAction(actionType, objectType),
          context: "action",
        });
      }
    }

    // --- Property clears (also a write) ---
    if (isClearPropertyAction(actionType)) {
      const propName = action.propertyName || (action as any).property;
      if (propName) {
        propertiesWritten.push({
          propertyName: propName,
          objectType: inferObjectTypeFromAction(actionType, objectType),
          context: "action",
        });
      }
    }

    // --- Copy property (reads source, writes target) ---
    if (actionType === "COPY_PROPERTY") {
      const sourceProperty = (action as any).sourceProperty;
      const targetProperty = (action as any).targetProperty || action.propertyName;
      if (sourceProperty) {
        propertiesRead.push({
          propertyName: sourceProperty,
          objectType,
          context: "action",
        });
      }
      if (targetProperty) {
        propertiesWritten.push({
          propertyName: targetProperty,
          objectType,
          context: "action",
        });
      }
    }

    // --- Cross-enrollment ---
    if (
      actionType === "ENROLL_IN_WORKFLOW" ||
      actionType === "UNENROLL_FROM_WORKFLOW"
    ) {
      const targetFlowId =
        action.flowId || action.workflowId || (action as any).targetFlowId;
      if (targetFlowId) {
        crossEnrollments.push({
          targetFlowId: targetFlowId.toString(),
          context: actionType === "ENROLL_IN_WORKFLOW" ? "enroll" : "unenroll",
        });
      }
    }

    // --- Email sends ---
    if (
      actionType === "SEND_EMAIL" ||
      actionType === "EMAIL" ||
      actionType.includes("EMAIL")
    ) {
      const emailId =
        action.emailId || (action as any).contentId || (action as any).templateId;
      if (emailId) {
        emailSends.push({
          emailId: emailId.toString(),
          context: actionType,
        });
      }
    }

    // --- List actions ---
    if (actionType === "ADD_TO_LIST" || actionType === "REMOVE_FROM_LIST") {
      const listId = (action as any).listId || (action as any).staticListId;
      if (listId) {
        listReferences.push({
          listId: listId.toString(),
          context: "action",
        });
      }
    }

    // --- Webhooks ---
    if (actionType === "WEBHOOK" || actionType === "CUSTOM_CODE") {
      const url = action.url || (action as any).webhookUrl;
      if (url) {
        webhooks.push({
          url,
          method: action.method || "POST",
        });
      }
    }

    // --- Delays ---
    if (actionType === "DELAY") {
      const delayMs =
        action.delayMillis || (action as any).delayMs || (action as any).delay;
      if (delayMs) {
        delays.push({
          delayMs: typeof delayMs === "number" ? delayMs : parseInt(delayMs, 10),
          afterAction: action.actionId || "unknown",
        });
      }
    }

    // --- Branches (recurse into branch actions) ---
    if (action.branches) {
      for (const branch of action.branches) {
        // Branch conditions can also reference properties
        if (branch.filterGroups) {
          for (const group of branch.filterGroups) {
            parseFilterGroup(group, objectType, propertiesRead, listReferences);
          }
        }
        if (branch.filters) {
          for (const filter of branch.filters) {
            parseFilter(filter, objectType, propertiesRead, listReferences);
          }
        }
        // Recurse into branch actions
        if (branch.actions) {
          count += parseActions(
            branch.actions,
            objectType,
            propertiesRead,
            propertiesWritten,
            crossEnrollments,
            listReferences,
            emailSends,
            webhooks,
            delays
          );
        }
      }
    }

    // --- Nested actions (some action types have sub-actions) ---
    if (action.actions) {
      count += parseActions(
        action.actions,
        objectType,
        propertiesRead,
        propertiesWritten,
        crossEnrollments,
        listReferences,
        emailSends,
        webhooks,
        delays
      );
    }
  }

  return count;
}

// --- Helper Functions ---

function isSetPropertyAction(actionType: string): boolean {
  return SET_PROPERTY_PREFIXES.some(
    (prefix) => actionType === prefix || actionType.startsWith(prefix)
  );
}

function isClearPropertyAction(actionType: string): boolean {
  return CLEAR_PROPERTY_PREFIXES.some(
    (prefix) => actionType === prefix || actionType.startsWith(prefix)
  );
}

function inferObjectTypeFromAction(
  actionType: string,
  defaultObjectType: string
): string {
  if (actionType.includes("CONTACT")) return "CONTACT";
  if (actionType.includes("COMPANY")) return "COMPANY";
  if (actionType.includes("DEAL")) return "DEAL";
  if (actionType.includes("TICKET")) return "TICKET";
  return defaultObjectType;
}

function deduplicateProperties(
  properties: PropertyReference[]
): PropertyReference[] {
  const seen = new Set<string>();
  return properties.filter((p) => {
    const key = `${p.objectType}:${p.propertyName}:${p.context}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateLists(lists: ListReference[]): ListReference[] {
  const seen = new Set<string>();
  return lists.filter((l) => {
    const key = `${l.listId}:${l.context}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ===========================================
// PASS 2: Build Dependency Graph
// ===========================================

export interface DependencyEdge {
  sourceFlowId: string;
  targetFlowId: string;
  type:
    | "PROPERTY_READ"
    | "PROPERTY_WRITE"
    | "CROSS_ENROLLMENT"
    | "LIST_REFERENCE"
    | "EMAIL_SEND"
    | "DELAY_CHAIN";
  severity: "INFO" | "WARNING" | "CRITICAL";
  description: string;
  detail: Record<string, unknown>;
}

export interface DependencyGraphResult {
  edges: DependencyEdge[];
  propertyIndex: PropertyIndexEntry[];
}

/**
 * Build the full dependency graph from an array of parsed workflows.
 * This is Pass 2: compare all workflows against each other to find relationships.
 */
export function buildDependencyGraph(
  parsedWorkflows: ParsedWorkflow[]
): DependencyGraphResult {
  const edges: DependencyEdge[] = [];

  // --- Build indexes ---

  // Property index: propertyName -> { readers, writers }
  const propertyMap = new Map<
    string,
    { readers: Set<string>; writers: Set<string>; objectType: string }
  >();

  // List index: listId -> workflows that reference it
  const listMap = new Map<string, Set<string>>();

  // Email index: emailId -> workflows that send it
  const emailMap = new Map<string, Set<string>>();

  // Workflow ID lookup
  const workflowMap = new Map<string, ParsedWorkflow>();

  for (const wf of parsedWorkflows) {
    workflowMap.set(wf.hubspotFlowId, wf);

    // Index property reads
    for (const prop of wf.propertiesRead) {
      const key = `${prop.objectType}:${prop.propertyName}`;
      if (!propertyMap.has(key)) {
        propertyMap.set(key, {
          readers: new Set(),
          writers: new Set(),
          objectType: prop.objectType,
        });
      }
      propertyMap.get(key)!.readers.add(wf.hubspotFlowId);
    }

    // Index property writes
    for (const prop of wf.propertiesWritten) {
      const key = `${prop.objectType}:${prop.propertyName}`;
      if (!propertyMap.has(key)) {
        propertyMap.set(key, {
          readers: new Set(),
          writers: new Set(),
          objectType: prop.objectType,
        });
      }
      propertyMap.get(key)!.writers.add(wf.hubspotFlowId);
    }

    // Index list references
    for (const list of wf.listReferences) {
      if (!listMap.has(list.listId)) {
        listMap.set(list.listId, new Set());
      }
      listMap.get(list.listId)!.add(wf.hubspotFlowId);
    }

    // Index email sends
    for (const email of wf.emailSends) {
      if (!emailMap.has(email.emailId)) {
        emailMap.set(email.emailId, new Set());
      }
      emailMap.get(email.emailId)!.add(wf.hubspotFlowId);
    }
  }

  // --- Generate edges ---

  // 1. Cross-enrollment edges (direct dependencies)
  for (const wf of parsedWorkflows) {
    for (const enrollment of wf.crossEnrollments) {
      const targetExists = workflowMap.has(enrollment.targetFlowId);
      edges.push({
        sourceFlowId: wf.hubspotFlowId,
        targetFlowId: enrollment.targetFlowId,
        type: "CROSS_ENROLLMENT",
        severity: targetExists ? "INFO" : "WARNING",
        description: targetExists
          ? `"${wf.name}" enrolls contacts into "${workflowMap.get(enrollment.targetFlowId)?.name || enrollment.targetFlowId}"`
          : `"${wf.name}" enrolls into workflow ${enrollment.targetFlowId} which was not found`,
        detail: {
          context: enrollment.context,
          targetExists,
        },
      });
    }
  }

  // 2. Property-based edges (writer -> reader dependencies)
  for (const [key, data] of propertyMap) {
    const propertyName = key.split(":")[1];

    // For each writer, create edges to all readers (excluding self)
    for (const writerId of data.writers) {
      for (const readerId of data.readers) {
        if (writerId === readerId) continue;

        const writerWf = workflowMap.get(writerId);
        const readerWf = workflowMap.get(readerId);

        edges.push({
          sourceFlowId: writerId,
          targetFlowId: readerId,
          type: "PROPERTY_WRITE",
          severity: "INFO",
          description: `"${writerWf?.name}" writes "${propertyName}" which "${readerWf?.name}" reads`,
          detail: {
            propertyName,
            objectType: data.objectType,
          },
        });
      }
    }
  }

  // 3. List-based edges (workflows sharing the same list)
  for (const [listId, workflowIds] of listMap) {
    const wfArray = Array.from(workflowIds);
    if (wfArray.length < 2) continue;

    // Create edges between all pairs that share a list
    for (let i = 0; i < wfArray.length; i++) {
      for (let j = i + 1; j < wfArray.length; j++) {
        edges.push({
          sourceFlowId: wfArray[i],
          targetFlowId: wfArray[j],
          type: "LIST_REFERENCE",
          severity: "INFO",
          description: `Both "${workflowMap.get(wfArray[i])?.name}" and "${workflowMap.get(wfArray[j])?.name}" reference list ${listId}`,
          detail: { listId },
        });
      }
    }
  }

  // 4. Email overlap edges (workflows sending the same email)
  for (const [emailId, workflowIds] of emailMap) {
    const wfArray = Array.from(workflowIds);
    if (wfArray.length < 2) continue;

    for (let i = 0; i < wfArray.length; i++) {
      for (let j = i + 1; j < wfArray.length; j++) {
        edges.push({
          sourceFlowId: wfArray[i],
          targetFlowId: wfArray[j],
          type: "EMAIL_SEND",
          severity: "WARNING",
          description: `Both "${workflowMap.get(wfArray[i])?.name}" and "${workflowMap.get(wfArray[j])?.name}" send email ${emailId}`,
          detail: { emailId },
        });
      }
    }
  }

  // --- Build property index ---
  const propertyIndex: PropertyIndexEntry[] = [];
  for (const [key, data] of propertyMap) {
    const [objectType, propertyName] = key.split(":");
    propertyIndex.push({
      propertyName,
      objectType: data.objectType,
      readByWorkflows: Array.from(data.readers),
      writtenByWorkflows: Array.from(data.writers),
    });
  }

  // Deduplicate edges (same source+target+type = one edge)
  const deduped = deduplicateEdges(edges);

  return { edges: deduped, propertyIndex };
}

function deduplicateEdges(edges: DependencyEdge[]): DependencyEdge[] {
  const seen = new Map<string, DependencyEdge>();

  for (const edge of edges) {
    // Normalize key (for undirected deps like list sharing, sort the IDs)
    const isDirected = edge.type === "CROSS_ENROLLMENT" || edge.type === "PROPERTY_WRITE";
    const key = isDirected
      ? `${edge.sourceFlowId}->${edge.targetFlowId}:${edge.type}`
      : `${[edge.sourceFlowId, edge.targetFlowId].sort().join("<->")
        }:${edge.type}`;

    if (!seen.has(key)) {
      seen.set(key, edge);
    } else {
      // Keep the higher severity
      const existing = seen.get(key)!;
      if (severityRank(edge.severity) > severityRank(existing.severity)) {
        seen.set(key, edge);
      }
    }
  }

  return Array.from(seen.values());
}

function severityRank(severity: string): number {
  switch (severity) {
    case "CRITICAL": return 3;
    case "WARNING": return 2;
    case "INFO": return 1;
    default: return 0;
  }
}

// ===========================================
// FULL PARSE PIPELINE
// ===========================================

/**
 * Run the complete parse pipeline on an array of raw HubSpot workflow details.
 * Returns parsed workflows, dependency edges, and property index.
 */
export function parseAllWorkflows(flows: HubSpotFlowDetail[]): {
  parsedWorkflows: ParsedWorkflow[];
  dependencyGraph: DependencyGraphResult;
} {
  // Pass 1: Parse each workflow individually
  const parsedWorkflows = flows.map(parseWorkflow);

  // Pass 2: Build the dependency graph
  const dependencyGraph = buildDependencyGraph(parsedWorkflows);

  return { parsedWorkflows, dependencyGraph };
}
