// ===========================================
// Entflow - Core Types
// ===========================================

// --- HubSpot API Response Types ---

/** Raw workflow from HubSpot v4 API GET /automation/v4/flows */
export interface HubSpotFlowSummary {
  id: string;
  name?: string;
  isEnabled: boolean;
  objectTypeId: string;
  revisionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Full workflow detail from GET /automation/v4/flows/{flowId} */
export interface HubSpotFlowDetail {
  id: string;
  name: string;
  type: string; // CONTACT_FLOW, PLATFORM_FLOW
  isEnabled: boolean;
  objectTypeId: string;
  description?: string;
  revisionId?: string;
  enrollmentCriteria?: HubSpotEnrollmentCriteria;
  actions: HubSpotAction[];
  createdAt?: string;
  updatedAt?: string;
  dataSources?: any;
}

export interface HubSpotEnrollmentCriteria {
  type?: string;
  filterBranches?: HubSpotFilterBranch[];
  listId?: number;
  [key: string]: unknown;
}

export interface HubSpotFilterBranch {
  filterBranchType?: string;
  filterGroups?: HubSpotFilterGroup[];
  filters?: HubSpotFilter[];
  [key: string]: unknown;
}

export interface HubSpotFilterGroup {
  filters: HubSpotFilter[];
}

export interface HubSpotFilter {
  property?: string;
  propertyObjectType?: string;
  operator?: string;
  value?: string;
  type?: string;
  filterType?: string;
  [key: string]: unknown;
}

export interface HubSpotAction {
  type: string;
  actionId?: string;
  // SET_PROPERTY action fields
  propertyName?: string;
  propertyValue?: string;
  propertyObjectType?: string;
  // ENROLLMENT action fields
  flowId?: string;
  workflowId?: string;
  // EMAIL action fields
  emailId?: string | number;
  // WEBHOOK action fields
  url?: string;
  method?: string;
  // DELAY action fields
  delayMillis?: number;
  // BRANCH action fields
  branches?: HubSpotBranch[];
  // Nested actions (for branches, if/then)
  actions?: HubSpotAction[];
  // Generic fields
  [key: string]: unknown;
}

export interface HubSpotBranch {
  branchType?: string;
  filterGroups?: HubSpotFilterGroup[];
  filters?: HubSpotFilter[];
  actions?: HubSpotAction[];
  [key: string]: unknown;
}

/** HubSpot OAuth token response */
export interface HubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/** HubSpot API error */
export interface HubSpotApiError {
  status: string;
  message: string;
  correlationId: string;
  category: string;
}

// --- Graph Types (for React Flow rendering) ---

export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
  style?: Record<string, any>;
}

export interface WorkflowNodeData {
  workflowId: string;
  hubspotFlowId: string;
  name: string;
  objectType: string;
  status: "ACTIVE" | "INACTIVE" | "ERRORING";
  actionCount: number;
  enrollmentCount?: number;
  hasConflicts: boolean;
  conflictCount: number;
  dependencyCount: number;
  hubspotUpdatedAt?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "smoothstep";
  animated?: boolean;
  data: DependencyEdgeData;
}

export interface DependencyEdgeData {
  dependencyId: string;
  type: string;
  severity: string;
  description?: string;
  detail: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// --- Parser Types ---

export interface ParsedWorkflow {
  hubspotFlowId: string;
  name: string;
  objectType: string;
  status: "ACTIVE" | "INACTIVE" | "ERRORING";
  flowType: string;
  actionCount: number;
  propertiesRead: PropertyReference[];
  propertiesWritten: PropertyReference[];
  crossEnrollments: CrossEnrollmentReference[];
  listReferences: ListReference[];
  emailSends: EmailReference[];
  webhooks: WebhookReference[];
  delays: DelayReference[];
}

export interface PropertyReference {
  propertyName: string;
  objectType: string;
  context: "enrollment" | "branch" | "action";
}

export interface CrossEnrollmentReference {
  targetFlowId: string;
  context: string;
}

export interface ListReference {
  listId: string;
  context: "enrollment" | "action";
}

export interface EmailReference {
  emailId: string;
  context: string;
}

export interface WebhookReference {
  url: string;
  method: string;
}

export interface DelayReference {
  delayMs: number;
  afterAction: string;
}

// --- Property Index ---

export interface PropertyIndexEntry {
  propertyName: string;
  objectType: string;
  readByWorkflows: string[];   // hubspotFlowIds
  writtenByWorkflows: string[]; // hubspotFlowIds
}

// --- Conflict Detection ---

export interface DetectedConflict {
  type: "PROPERTY_WRITE_COLLISION" | "CIRCULAR_DEPENDENCY" | "INACTIVE_REFERENCE" | "EMAIL_OVERLAP" | "ORPHANED_ENROLLMENT";
  severity: "INFO" | "WARNING" | "CRITICAL";
  description: string;
  involvedWorkflowIds: string[]; // internal IDs
  detail: Record<string, unknown>;
}

// --- Dashboard Stats ---

export interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;
  totalDependencies: number;
  totalConflicts: number;
  criticalConflicts: number;
  lastSyncedAt: string | null;
  syncStatus: string;
  mostComplexWorkflows: Array<{
    id: string;
    name: string;
    dependencyCount: number;
  }>;
}

// --- Filter State ---

export interface MapFilters {
  status: ("ACTIVE" | "INACTIVE" | "ERRORING")[];
  objectTypes: string[];
  dependencyTypes: string[];
  searchQuery: string;
  properties: string[];
  tags: string[]; // tag IDs
}

// --- HubSpot Object Type ID mapping ---

export const HUBSPOT_OBJECT_TYPE_MAP: Record<string, string> = {
  "0-1": "CONTACT",
  "0-2": "COMPANY",
  "0-3": "DEAL",
  "0-5": "TICKET",
};

export function resolveObjectType(objectTypeId: string): string {
  return HUBSPOT_OBJECT_TYPE_MAP[objectTypeId] || "CUSTOM";
}
