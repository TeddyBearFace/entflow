// ===========================================
// Journey Layout Engine
// ===========================================
// Arranges workflows in a left-to-right customer journey:
// Contact workflows → Deal workflows → Company workflows
// Within each group, workflows are ordered by their dependencies
// (upstream workflows on the left, downstream on the right).

import type {
  GraphNode,
  GraphEdge,
  MapFilters,
} from "@/types";
import type { ExpandedWorkflowNodeData, ActionItem } from "@/components/map/ExpandedWorkflowNode";

// --- Stage ordering (left to right) ---
const STAGE_ORDER: Record<string, number> = {
  CONTACT: 0,
  COMPANY: 1,
  DEAL: 2,
  TICKET: 3,
  CUSTOM: 4,
  UNKNOWN: 5,
};

const STAGE_LABELS: Record<string, string> = {
  CONTACT: "Contact Workflows",
  COMPANY: "Company Workflows",
  DEAL: "Deal Workflows",
  TICKET: "Ticket Workflows",
  CUSTOM: "Custom Workflows",
  UNKNOWN: "Other Workflows",
};

const STAGE_COLORS: Record<string, string> = {
  CONTACT: "#2E75B6",
  COMPANY: "#8E44AD",
  DEAL: "#27AE60",
  TICKET: "#E67E22",
  CUSTOM: "#95A5A6",
  UNKNOWN: "#95A5A6",
};

interface WorkflowRecord {
  id: string;
  hubspotFlowId: string;
  name: string;
  objectType: string;
  status: string;
  actionCount: number;
  enrollmentCount?: number | null;
  hubspotUpdatedAt?: Date | null;
  enrollmentCriteria?: any;
  actions?: any;
  dataSources?: any;
  workflowTags?: Array<{ tag: { id: string; name: string; color: string } }>;
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

// --- Health Score Calculator ---
function calculateHealthScore(
  wf: WorkflowRecord,
  dependencies: DependencyRecord[],
  allWorkflows: WorkflowRecord[],
  hasEnrollmentTrigger: boolean
): { score: number; grade: string; issues: string[] } {
  let score = 100;
  const issues: string[] = [];

  const workflowStatusById = new Map<string, string>();
  for (const w of allWorkflows) {
    workflowStatusById.set(w.id, w.status);
  }

  // Conflicts (most critical)
  const conflictCount = wf._count?.conflictWorkflows || 0;
  if (conflictCount > 0) {
    const penalty = Math.min(conflictCount * 15, 40);
    score -= penalty;
    issues.push(`${conflictCount} property conflict${conflictCount > 1 ? "s" : ""}`);
  }

  // No enrollment criteria
  if (!hasEnrollmentTrigger) {
    score -= 12;
    issues.push("No enrollment trigger");
  }

  // No actions (empty workflow)
  if (wf.actionCount === 0) {
    score -= 25;
    issues.push("No actions defined");
  }

  // Inactive
  if (wf.status === "INACTIVE") {
    score -= 8;
    issues.push("Workflow is inactive");
  }

  // Erroring
  if (wf.status === "ERRORING") {
    score -= 20;
    issues.push("Workflow is erroring");
  }

  // High complexity (>15 actions)
  if (wf.actionCount > 15) {
    score -= 8;
    issues.push(`High complexity (${wf.actionCount} actions)`);
  }

  // References inactive workflows
  const outgoingDeps = dependencies.filter(d => d.sourceWorkflowId === wf.id && d.targetWorkflowId);
  const inactiveRefs = outgoingDeps.filter(d => {
    const targetStatus = workflowStatusById.get(d.targetWorkflowId!);
    return targetStatus === "INACTIVE";
  });
  if (inactiveRefs.length > 0) {
    score -= 10;
    issues.push(`References ${inactiveRefs.length} inactive workflow${inactiveRefs.length > 1 ? "s" : ""}`);
  }

  // Not updated in 6+ months
  if (wf.hubspotUpdatedAt) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (new Date(wf.hubspotUpdatedAt) < sixMonthsAgo) {
      score -= 5;
      issues.push("Not updated in 6+ months");
    }
  }

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 55 ? "C" : score >= 35 ? "D" : "F";
  return { score, grade, issues };
}

// --- Edge colors by dependency type ---
const EDGE_COLORS: Record<string, string> = {
  PROPERTY_WRITE: "#2E75B6",
  PROPERTY_READ: "#2E75B6",
  CROSS_ENROLLMENT: "#E67E22",
  LIST_REFERENCE: "#8E44AD",
  EMAIL_SEND: "#E74C3C",
  DELAY_CHAIN: "#95A5A6",
  WEBHOOK: "#27AE60",
};

/**
 * Build a journey-style graph layout.
 * Workflows are arranged left-to-right by object type,
 * with detailed action breakdowns inside each node.
 */
export function buildJourneyGraph(
  workflows: WorkflowRecord[],
  dependencies: DependencyRecord[],
  workflowIdToName: Map<string, string>,
  filters?: MapFilters,
  lookups?: {
    stageLookup: Record<string, string>;
    stageOrderLookup: Record<string, string>;
    pipelineLookup: Record<string, string>;
    emailLookup?: Record<string, string>;
    listLookup?: Record<string, string>;
  }
): { nodes: GraphNode[]; edges: GraphEdge[]; stages: StageGroup[] } {
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
    if (filters.dependencyTypes.length > 0) {
      filteredDeps = filteredDeps.filter((d) =>
        filters.dependencyTypes.includes(d.type)
      );
    }
  }

  // Group workflows by object type
  const groups = new Map<string, WorkflowRecord[]>();
  for (const wf of filteredWorkflows) {
    const type = wf.objectType || "UNKNOWN";
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(wf);
  }

  // Sort groups by stage order
  const sortedGroups = [...groups.entries()].sort(
    (a, b) => (STAGE_ORDER[a[0]] ?? 99) - (STAGE_ORDER[b[0]] ?? 99)
  );

  // Build adjacency for topological ordering within groups
  const adjacency = new Map<string, Set<string>>();
  for (const dep of filteredDeps) {
    if (!dep.targetWorkflowId) continue;
    if (dep.type === "CROSS_ENROLLMENT" || dep.type === "PROPERTY_WRITE") {
      if (!adjacency.has(dep.sourceWorkflowId)) {
        adjacency.set(dep.sourceWorkflowId, new Set());
      }
      adjacency.get(dep.sourceWorkflowId)!.add(dep.targetWorkflowId);
    }
  }

  // Layout constants
  const NODE_WIDTH = 300;
  const NODE_MIN_HEIGHT = 200;
  const NODE_SPACING_X = 80;
  const NODE_SPACING_Y = 60;
  const STAGE_PADDING = 60;
  const STAGE_HEADER_HEIGHT = 50;

  const nodes: GraphNode[] = [];
  const stages: StageGroup[] = [];
  let currentX = STAGE_PADDING;

  for (const [objectType, groupWorkflows] of sortedGroups) {
    // Sort workflows within group: upstream first (fewest incoming deps)
    const sorted = topologicalSort(groupWorkflows, adjacency);

    const stageStartX = currentX;
    let maxColumnWidth = 0;
    let currentY = STAGE_PADDING + STAGE_HEADER_HEIGHT;

    for (let i = 0; i < sorted.length; i++) {
      const wf = sorted[i];
      const depCount =
        (wf._count?.sourceDependencies || 0) +
        (wf._count?.targetDependencies || 0);

      // Parse actions for display
      const actionItems = parseActionsForDisplay(wf.actions, workflowIdToName, lookups, wf.dataSources as any[]);
      const enrollmentTrigger = parseEnrollmentTrigger(wf.enrollmentCriteria);

      // Calculate health score
      // enrollmentTrigger parser may not cover all v4 formats, so also check raw criteria
      const rawCriteria = wf.enrollmentCriteria;
      const hasEnrollment = !!enrollmentTrigger || (
        rawCriteria != null && typeof rawCriteria === "object" && Object.keys(rawCriteria).length > 0
      );
      const health = calculateHealthScore(wf, filteredDeps, workflows, hasEnrollment);

      // Estimate node height based on action count
      const visibleActions = Math.min(actionItems.length, 8);
      const hasHealthIssues = health.issues.length > 0 && "CDF".includes(health.grade);
      const estimatedHeight = 100 + (visibleActions * 36) + (enrollmentTrigger ? 40 : 0) + (hasHealthIssues ? 24 : 0);

      const nodeData: ExpandedWorkflowNodeData = {
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
        enrollmentTrigger,
        actions: actionItems,
        healthScore: health.score,
        healthGrade: health.grade,
        healthIssues: health.issues,
        tags: wf.workflowTags?.map(wt => wt.tag) || [],
      };

      const nodeHeight = Math.max(estimatedHeight, NODE_MIN_HEIGHT);

      nodes.push({
        id: wf.id,
        type: "expandedWorkflow",
        position: { x: currentX, y: currentY },
        data: nodeData as any,
        style: { width: NODE_WIDTH, height: nodeHeight },
      });

      currentY += nodeHeight + NODE_SPACING_Y;
      maxColumnWidth = Math.max(maxColumnWidth, NODE_WIDTH);
    }

    stages.push({
      id: objectType,
      label: STAGE_LABELS[objectType] || objectType,
      color: STAGE_COLORS[objectType] || "#95A5A6",
      x: stageStartX - 20,
      y: STAGE_PADDING - 10,
      width: maxColumnWidth + 40,
      height: currentY - STAGE_PADDING + 20,
      workflowCount: sorted.length,
    });

    currentX += maxColumnWidth + NODE_SPACING_X + STAGE_PADDING;
  }

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
        strokeWidth: d.severity === "CRITICAL" ? 3 : d.severity === "WARNING" ? 2 : 1.5,
      },
      markerEnd: {
        type: "arrowclosed",
        color: EDGE_COLORS[d.type] || "#95A5A6",
        width: 20,
        height: 20,
      },
      label: getEdgeLabel(d.type),
      labelStyle: { fontSize: 10, fill: "#666" },
      labelBgStyle: { fill: "white", fillOpacity: 0.8 },
      labelBgPadding: [4, 2] as [number, number],
    }));

  return { nodes, edges, stages };
}

// --- Parse raw HubSpot actions into display items ---

function parseActionsForDisplay(
  rawActions: any,
  workflowIdToName: Map<string, string>,
  lookups?: {
    stageLookup: Record<string, string>;
    stageOrderLookup: Record<string, string>;
    pipelineLookup: Record<string, string>;
    emailLookup?: Record<string, string>;
    listLookup?: Record<string, string>;
  },
  dataSources?: any[]
): ActionItem[] {
  if (!rawActions || !Array.isArray(rawActions)) return [];

  const sl = lookups?.stageLookup || {};
  const sol = lookups?.stageOrderLookup || {};
  const pl = lookups?.pipelineLookup || {};
  const el = lookups?.emailLookup || {};
  const ll = lookups?.listLookup || {};

  // Pre-scan: build a lookup from fetched_object IDs to their object types
  // Data fetch actions have an actionId that becomes the fetched_object_XXXXX suffix
  const OBJECT_TYPE_NAMES: Record<string, string> = {
    // Standard CRM objects
    "0-1": "Contact", "0-2": "Company", "0-3": "Deal", "0-5": "Ticket",
    // Commerce
    "0-6": "Product", "0-8": "Line Item", "0-47": "Quote",
    "0-69": "Subscription", "0-68": "Invoice", "0-101": "Payment",
    "0-116": "Order", "0-54": "Cart",
    // Activities
    "0-4": "Engagement", "0-7": "Task", "0-27": "Task",
    "0-46": "Communication", "0-48": "Call", "0-49": "Email Activity",
    "0-51": "Meeting", "0-52": "Postal Mail",
    // Marketing
    "0-11": "Marketing Event", "0-18": "Campaign", "0-19": "Form Submission",
    // Other
    "0-14": "Feedback Submission",
    // Common string names HubSpot sometimes uses
    "CONTACT": "Contact", "COMPANY": "Company", "DEAL": "Deal", "TICKET": "Ticket",
    "LINE_ITEM": "Line Item", "PRODUCT": "Product", "QUOTE": "Quote",
    "CALL": "Call", "EMAIL": "Email", "MEETING": "Meeting", "TASK": "Task",
    "NOTE": "Note", "INVOICE": "Invoice", "ORDER": "Order",
    "SUBSCRIPTION": "Subscription", "PAYMENT": "Payment",
    "FEEDBACK_SUBMISSION": "Feedback Submission",
    // Lowercase variants
    "contact": "Contact", "company": "Company", "deal": "Deal", "ticket": "Ticket",
    "line_item": "Line Item", "product": "Product", "quote": "Quote",
  };
  const fetchedObjectTypes = new Map<string, string>();
  // Primary source: dataSources array from HubSpot workflow definition
  if (dataSources && Array.isArray(dataSources)) {
    for (const ds of dataSources) {
      if (ds.name && ds.objectTypeId) {
        const idMatch = ds.name.match(/fetched_object_(\w+)/);
        const key = idMatch ? idMatch[1] : ds.name;
        let objName = OBJECT_TYPE_NAMES[ds.objectTypeId];
        if (!objName) {
          if (/^2-\d+$/.test(ds.objectTypeId)) objName = "Custom Object";
          else objName = ds.objectTypeId.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        }
        fetchedObjectTypes.set(key, objName);
      }
    }
  }
  // Fallback: scan actions for targetObject fields
  for (const action of rawActions) {
    if (!action?.actionId) continue;
    const f = action.fields || {};
    const to = f.targetObject || f.objectTypeId || f.target_object_type;
    if (to && to !== "SINGLE_CONNECTION" && to !== "BRANCH") {
      let objName = OBJECT_TYPE_NAMES[to];
      if (!objName) {
        if (/^2-\d+$/.test(to)) objName = "Custom Object";
        else objName = to.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
      if (!fetchedObjectTypes.has(String(action.actionId))) {
        fetchedObjectTypes.set(String(action.actionId), objName);
      }
    }
  }

  // Translate HubSpot template variables to readable text
  function translateTemplate(val: string): string | null {
    if (!/\{\{.*\}\}/.test(val)) return null;
    const t = val.trim();
    const exact: Record<string, string> = {
      "{{ enrolled_object }}": "Enrolled record",
      "{{ enrolled_object.hubspot_owner_id }}": "Record owner",
      "{{ enrolled_object.hs_object_id }}": "Record ID",
      "{{ enrolled_object.email }}": "Contact email",
      "{{ enrolled_object.firstname }}": "First name",
      "{{ enrolled_object.lastname }}": "Last name",
      "{{ enrolled_object.lifecyclestage }}": "Lifecycle stage",
      "{{ enrolled_object.hs_lead_status }}": "Lead status",
    };
    if (exact[t]) return exact[t];
    // Fetched objects: {{ fetched_objects.fetched_object_1426533619.name }} → "Fetched: Company Name"
    const fetchedMatch = t.match(/\{\{\s*fetched_objects\.fetched_object_(\w+)\.(\w+)\s*\}\}/);
    if (fetchedMatch) {
      const objType = fetchedObjectTypes.get(fetchedMatch[1]) || "Object";
      return `${objType} ${formatProp(fetchedMatch[2])}`;
    }
    const fetchedGeneric = t.match(/\{\{\s*fetched_objects\.[\w]+\.(\w+)\s*\}\}/);
    if (fetchedGeneric) return `${formatProp(fetchedGeneric[1])}`;
    // Enrolled object property
    const enrolledMatch = t.match(/\{\{\s*enrolled_object\.(\w+)\s*\}\}/);
    if (enrolledMatch) return `Record ${formatProp(enrolledMatch[1])}`;
    // Contact/deal/company tokens
    const objMatch = t.match(/\{\{\s*(contact|deal|company|ticket)\.(\w+)\s*\}\}/);
    if (objMatch) return `${objMatch[1].charAt(0).toUpperCase() + objMatch[1].slice(1)} ${formatProp(objMatch[2])}`;
    // Generic cleanup
    const inner = t.replace(/\{\{|\}\}/g, "").trim().replace(/fetched_objects?\.\w+\./g, "").replace(/enrolled_object\./g, "");
    return inner ? formatProp(inner) : "Dynamic value";
  }

  // Resolve a raw value to a human-readable name using pipeline/stage lookups
  function resolveValue(rawVal: string, propName: string): string {
    // Check for template variables first
    const translated = translateTemplate(rawVal);
    if (translated) return translated;

    const isPipelineStage = /pipeline.?stage|dealstage/i.test(propName);
    const isPipeline = /^(hs_)?pipeline$/i.test(propName);
    const isLifecycle = /lifecyclestage/i.test(propName);

    const lifecycleStages: Record<string, string> = {
      subscriber: "Subscriber", lead: "Lead",
      marketingqualifiedlead: "Marketing Qualified Lead",
      salesqualifiedlead: "Sales Qualified Lead",
      opportunity: "Opportunity", customer: "Customer",
      evangelist: "Evangelist", other: "Other",
    };

    const trimmed = rawVal.trim();
    if (isPipelineStage && sl[trimmed]) return sl[trimmed];
    if (isPipelineStage && sol[trimmed]) return sol[trimmed];
    if (isPipeline && pl[trimmed]) return pl[trimmed];
    if (isLifecycle && lifecycleStages[trimmed.toLowerCase()]) return lifecycleStages[trimmed.toLowerCase()];
    return trimmed;
  }

  // Format property names for display
  function formatProp(prop: string): string {
    const known: Record<string, string> = {
      hs_pipeline_stage: "Pipeline Stage", hs_pipeline: "Pipeline",
      lifecyclestage: "Lifecycle Stage", dealstage: "Deal Stage",
      hs_lead_status: "Lead Status", hubspot_owner_id: "Owner",
    };
    if (known[prop]) return known[prop];
    return prop.replace(/^hs_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  // HubSpot v4 API action type IDs
  // Format: "appId-actionTypeId" where appId 0 = HubSpot built-in
  const ACTION_TYPE_MAP: Record<string, { type: string; label: string }> = {
    "0-1":  { type: "DELAY", label: "Delay" },
    "0-2":  { type: "IF_BRANCH", label: "If/then branch" },
    "0-3":  { type: "CREATE_TASK", label: "Create task" },
    "0-4":  { type: "SEND_EMAIL", label: "Send email" },
    "0-5":  { type: "SET_PROPERTY", label: "Set property" },
    "0-6":  { type: "COPY_PROPERTY", label: "Copy property" },
    "0-7":  { type: "SEND_INTERNAL_EMAIL", label: "Send notification" },
    "0-8":  { type: "SEND_IN_APP_NOTIFICATION", label: "In-app notification" },
    "0-9":  { type: "ENROLL_IN_WORKFLOW", label: "Enroll in workflow" },
    "0-10": { type: "WEBHOOK", label: "Webhook" },
    "0-11": { type: "ADD_TO_LIST", label: "Add to list" },
    "0-12": { type: "REMOVE_FROM_LIST", label: "Remove from list" },
    "0-13": { type: "CREATE_DEAL", label: "Create deal" },
    "0-14": { type: "CLEAR_PROPERTY", label: "Clear property" },
    "0-15": { type: "ROTATE_OWNER", label: "Rotate owner" },
    "0-16": { type: "CREATE_TICKET", label: "Create ticket" },
    "0-17": { type: "BRANCH", label: "Branch" },
    "0-18": { type: "CREATE_COMPANY", label: "Create company" },
    "0-19": { type: "CUSTOM_CODE", label: "Custom code" },
    "0-20": { type: "UNENROLL_FROM_WORKFLOW", label: "Unenroll from workflow" },
    "0-35": { type: "FORMAT_DATA", label: "Format data" },
  };

  // Try to infer a friendly label for unknown HubSpot action types from their fields
  function inferActionFromFields(fields: any, actionTypeId: string): { type: string; label: string; icon: string } {
    // Check for common field patterns - most specific first
    if (fields.listId || fields.list_id || fields.staticListId) return { type: "ADD_TO_LIST", label: "Add to list", icon: "📝" };
    if (fields.content_id || fields.contentId) return { type: "SEND_EMAIL", label: "Send email", icon: "📧" };
    if (fields.property_name || fields.propertyName) return { type: "SET_PROPERTY", label: "Set property", icon: "✏️" };
    if (fields.flow_id || fields.flowId) return { type: "ENROLL_IN_WORKFLOW", label: "Enroll in workflow", icon: "➡️" };
    if (fields.subject || fields.body) return { type: "NOTIFICATION", label: "Send notification", icon: "🔔" };
    if (fields.url || fields.webhook_url) return { type: "WEBHOOK", label: "Webhook", icon: "🔗" };
    if (fields.associations) return { type: "ASSOCIATION", label: "Set association", icon: "🔗" };
    if (fields.targetObject) return { type: "DATA_ACTION", label: "Fetch data", icon: "🔍" };
    // Generic fallback
    return { type: "UNKNOWN", label: "Action", icon: "⚙️" };
  }

  // Clean up template variables and raw values for display
  function cleanFieldValue(val: any): string | null {
    if (val === null || val === undefined) return null;
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    // Translate template variables instead of skipping
    if (/\{\{.*\}\}/.test(str.trim())) {
      const translated = translateTemplate(str);
      return translated || null;
    }
    // Skip very long or complex values
    if (str.length > 100) return null;
    // Skip "0" placeholder values
    if (str === "0") return null;
    return str;
  }

  const items: ActionItem[] = [];

  function walk(actions: any[]) {
    for (const action of actions) {
      if (!action) continue;

      const actionTypeId = action.actionTypeId || "";
      const fields = action.fields || {};
      const mapped = ACTION_TYPE_MAP[actionTypeId];
      
      // For unknown types, infer from fields
      const inferred = !mapped ? inferActionFromFields(fields, actionTypeId) : null;
      const resolvedType = mapped?.type || inferred?.type || "UNKNOWN";
      const resolvedLabel = mapped?.label || inferred?.label || "Action";

      const item: ActionItem = { type: inferred?.type || resolvedType };

      // --- Set property (actionTypeId 0-5) ---
      if (resolvedType === "SET_PROPERTY" || resolvedType === "CLEAR_PROPERTY") {
        const propName = fields.property_name || fields.propertyName;
        if (propName) {
          item.propertyName = formatProp(propName);
          const val = fields.value;
          let rawVal = "";
          if (val && typeof val === "object" && val.staticValue) {
            rawVal = String(val.staticValue);
          } else if (val && typeof val === "string") {
            rawVal = val;
          }
          if (rawVal) {
            item.propertyValue = resolveValue(rawVal, propName);
          }
          item.description = `${item.propertyName}${item.propertyValue ? ` → ${item.propertyValue}` : ""}`;
        }
      }

      // --- Copy property (actionTypeId 0-6) ---
      if (resolvedType === "COPY_PROPERTY") {
        const source = fields.source_property || fields.sourceProperty;
        const target = fields.target_property || fields.targetProperty || fields.property_name;
        item.description = source && target ? `${source} → ${target}` : (source || target || "Copy property");
      }

      // --- Send email (actionTypeId 0-4) ---
      if (resolvedType === "SEND_EMAIL") {
        const contentId = fields.content_id || fields.contentId || fields.emailId;
        if (contentId && contentId !== "0") {
          item.emailId = String(contentId);
          const emailName = el[String(contentId)];
          item.description = emailName || `Email #${contentId}`;
        } else {
          item.description = "Send email";
        }
      }

      // --- Enroll in workflow (actionTypeId 0-9) ---
      if (resolvedType === "ENROLL_IN_WORKFLOW" || resolvedType === "UNENROLL_FROM_WORKFLOW") {
        const targetFlowId = fields.flow_id || fields.flowId || fields.workflowId;
        if (targetFlowId) {
          item.flowId = String(targetFlowId);
          item.targetFlowName = workflowIdToName.get(String(targetFlowId)) || `Workflow ${targetFlowId}`;
        }
      }

      // --- Create task (actionTypeId 0-3) ---
      if (resolvedType === "CREATE_TASK") {
        const subject = fields.subject;
        const taskType = fields.task_type;
        const dueTime = fields.due_time;
        const parts: string[] = [];
        if (taskType) parts.push(taskType.toLowerCase());
        if (subject) parts.push(`"${subject}"`);
        if (dueTime?.delta && dueTime?.timeUnit) {
          parts.push(`due in ${dueTime.delta} ${dueTime.timeUnit.toLowerCase()}`);
        }
        item.description = parts.length > 0 ? parts.join(" · ") : "Create task";
      }

      // --- Create deal (actionTypeId 0-13) ---
      if (resolvedType === "CREATE_DEAL" || resolvedType === "CREATE_TICKET" || resolvedType === "CREATE_COMPANY") {
        item.description = resolvedLabel;
      }

      // --- Delay (actionTypeId 0-1) ---
      if (resolvedType === "DELAY") {
        const delayMs = fields.delayMillis || fields.delay_millis;
        if (delayMs) {
          item.delayDescription = formatDelay(Number(delayMs));
        } else if (fields.delta && fields.timeUnit) {
          item.delayDescription = `Wait ${fields.delta} ${fields.timeUnit.toLowerCase()}`;
        } else {
          item.delayDescription = "Delay";
        }
      }

      // --- Webhook (actionTypeId 0-10) ---
      if (resolvedType === "WEBHOOK") {
        item.description = fields.url || fields.webhook_url || "Webhook";
      }

      // --- Custom code (actionTypeId 0-19) ---
      if (resolvedType === "CUSTOM_CODE") {
        item.description = "Custom code action";
      }

      // --- Notifications (actionTypeId 0-7, 0-8) ---
      if (resolvedType === "SEND_INTERNAL_EMAIL" || resolvedType === "SEND_IN_APP_NOTIFICATION") {
        const subject = fields.subject;
        item.description = subject ? `Notify: ${subject}` : "Send notification";
      }

      // --- Lists (actionTypeId 0-11, 0-12, or inferred) ---
      if (resolvedType === "ADD_TO_LIST" || resolvedType === "REMOVE_FROM_LIST") {
        const listId = fields.list_id || fields.listId || fields.staticListId;
        if (listId) {
          const listName = ll[String(listId)];
          item.description = listName || `List #${listId}`;
        } else {
          item.description = resolvedLabel;
        }
      }

      // --- Branches (actionTypeId 0-2, 0-17) ---
      if (resolvedType === "IF_BRANCH" || resolvedType === "BRANCH") {
        item.description = "Branch logic";
      }

      // --- Format data (actionTypeId 0-35) ---
      if (resolvedType === "FORMAT_DATA") {
        item.description = "Format data";
      }

      // --- Rotate owner (actionTypeId 0-15) ---
      if (resolvedType === "ROTATE_OWNER") {
        item.description = "Rotate record owner";
      }

      // Fallback: if no description set, build one from clean field values
      if (!item.description && !item.propertyName && !item.delayDescription && !item.targetFlowName) {
        // Try to build a meaningful description from fields
        const cleanParts: string[] = [];
        for (const [key, val] of Object.entries(fields)) {
          const cleaned = cleanFieldValue(val);
          if (cleaned) {
            const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            cleanParts.push(`${label}: ${cleaned}`);
          }
        }
        item.description = cleanParts.length > 0 ? cleanParts.slice(0, 2).join(" · ") : resolvedLabel;
      }

      items.push(item);

      // Recurse into branches if present
      if (action.branches) {
        for (const branch of action.branches) {
          if (branch.actions) walk(branch.actions);
        }
      }
      if (action.actions) {
        walk(action.actions);
      }
      // Follow the connection chain (v4 API uses nextActionId but actions are flat, not nested)
    }
  }

  walk(rawActions);
  return items;
}

function formatDelay(ms: number): string {
  const minutes = ms / (1000 * 60);
  if (minutes < 60) return `Wait ${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `Wait ${Math.round(hours)} hr`;
  const days = hours / 24;
  return `Wait ${Math.round(days)} day${days !== 1 ? "s" : ""}`;
}

// --- Parse enrollment criteria into a readable trigger string ---

function parseEnrollmentTrigger(criteria: any): string | undefined {
  if (!criteria) return undefined;

  const parts: string[] = [];

  if (criteria.listId) {
    parts.push(`List #${criteria.listId} membership`);
  }

  if (criteria.filterBranches) {
    for (const branch of criteria.filterBranches) {
      const filterTexts = extractFilterTexts(branch);
      if (filterTexts.length > 0) {
        parts.push(filterTexts.join(" AND "));
      }
    }
  }

  if (criteria.type) {
    if (criteria.type === "FORM_SUBMISSION") parts.push("Form submission");
    if (criteria.type === "PAGE_VIEW") parts.push("Page view");
    if (criteria.type === "EVENT") parts.push("Event trigger");
  }

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function extractFilterTexts(branch: any): string[] {
  const texts: string[] = [];

  function processFilters(filters: any[]) {
    for (const f of filters) {
      if (f.property) {
        const op = f.operator || f.type || "is";
        const val = f.value || "";
        texts.push(`${f.property} ${formatOperator(op)} ${val}`.trim());
      }
    }
  }

  if (branch.filters) processFilters(branch.filters);
  if (branch.filterGroups) {
    for (const group of branch.filterGroups) {
      if (group.filters) processFilters(group.filters);
    }
  }

  return texts.slice(0, 3); // Limit to 3 conditions to keep it readable
}

function formatOperator(op: string): string {
  const map: Record<string, string> = {
    EQ: "=",
    NEQ: "≠",
    GT: ">",
    GTE: "≥",
    LT: "<",
    LTE: "≤",
    IS_KNOWN: "is set",
    IS_NOT_KNOWN: "is not set",
    CONTAINS: "contains",
    NOT_CONTAINS: "doesn't contain",
    HAS_PROPERTY: "is set",
    NOT_HAS_PROPERTY: "is not set",
    SET_ANY: "is any of",
    SET_ALL: "is all of",
    SET_EQ: "=",
    SET_NEQ: "≠",
    BETWEEN: "between",
    IS_EQUAL_TO: "=",
    IS_NOT_EQUAL_TO: "≠",
  };
  return map[op.toUpperCase()] || op.toLowerCase();
}

function getEdgeLabel(type: string): string {
  const labels: Record<string, string> = {
    CROSS_ENROLLMENT: "enrolls →",
    PROPERTY_WRITE: "sets prop",
    LIST_REFERENCE: "shared list",
    EMAIL_SEND: "same email",
  };
  return labels[type] || "";
}

// --- Topological sort within a group ---

function topologicalSort(
  workflows: WorkflowRecord[],
  adjacency: Map<string, Set<string>>
): WorkflowRecord[] {
  const ids = new Set(workflows.map((w) => w.id));
  const inDegree = new Map<string, number>();

  for (const wf of workflows) inDegree.set(wf.id, 0);

  for (const wf of workflows) {
    const targets = adjacency.get(wf.id);
    if (!targets) continue;
    for (const targetId of targets) {
      if (ids.has(targetId)) {
        inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
      }
    }
  }

  // BFS from nodes with 0 in-degree
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    const targets = adjacency.get(current);
    if (!targets) continue;
    for (const targetId of targets) {
      if (!ids.has(targetId)) continue;
      const newDegree = (inDegree.get(targetId) || 1) - 1;
      inDegree.set(targetId, newDegree);
      if (newDegree === 0) queue.push(targetId);
    }
  }

  // Add any remaining (cycles) at the end
  for (const wf of workflows) {
    if (!order.includes(wf.id)) order.push(wf.id);
  }

  const wfMap = new Map(workflows.map((w) => [w.id, w]));
  return order.map((id) => wfMap.get(id)!).filter(Boolean);
}

// --- Filter helper ---

function applyFilters(
  workflows: WorkflowRecord[],
  filters: MapFilters
): WorkflowRecord[] {
  let result = workflows;
  if (filters.status.length > 0) {
    result = result.filter((w) => filters.status.includes(w.status as any));
  }
  if (filters.objectTypes.length > 0) {
    result = result.filter((w) => filters.objectTypes.includes(w.objectType));
  }
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase().trim();
    result = result.filter((w) => w.name.toLowerCase().includes(query));
  }
  if (filters.properties && filters.properties.length > 0) {
    result = result.filter((w) => {
      const actions = w.actions as any[];
      if (!actions || !Array.isArray(actions)) return false;
      for (const action of actions) {
        const fields = action.fields || {};
        const propName = fields.property_name || fields.propertyName;
        if (propName && filters.properties.includes(propName)) return true;
        // Also check dealstage, hs_pipeline, hs_pipeline_stage in value targets
        if (fields.dealstage || fields.hs_pipeline || fields.hs_pipeline_stage) {
          const targetProps = [fields.dealstage && "dealstage", fields.hs_pipeline && "hs_pipeline", fields.hs_pipeline_stage && "hs_pipeline_stage"].filter(Boolean) as string[];
          if (targetProps.some(p => filters.properties.includes(p))) return true;
        }
      }
      // Check enrollment criteria for property reads
      const enrollment = w.enrollmentCriteria as any;
      if (enrollment?.listFilterBranch) {
        const enrollProps = extractFilterProperties(enrollment.listFilterBranch);
        if (enrollProps.some(p => filters.properties.includes(p))) return true;
      }
      return false;
    });
  }
  return result;
}

function extractFilterProperties(branch: any): string[] {
  const props: string[] = [];
  if (branch.filters) {
    for (const f of branch.filters) {
      if (f.property) props.push(f.property);
    }
  }
  if (branch.filterBranches) {
    for (const child of branch.filterBranches) {
      props.push(...extractFilterProperties(child));
    }
  }
  return props;
}

// --- Stage group type for background rendering ---

export interface StageGroup {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  workflowCount: number;
}
