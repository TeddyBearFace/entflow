/**
 * Changelog Diff Engine
 * Compares workflow snapshots between syncs and generates human-readable change entries.
 */
import crypto from "crypto";

interface ActionSummary {
  actionId: string;
  actionTypeId: string;
  label: string;
  key: string; // unique identifier for matching
  fieldsHash: string;
  fields: any;
}

interface ChangeEntry {
  workflowId: string;
  hubspotFlowId: string;
  workflowName: string;
  changeType: string;
  severity: string;
  summary: string;
  details?: string;
  previousValue?: string;
  newValue?: string;
}

const ACTION_LABELS: Record<string, string> = {
  "0-1": "Delay", "0-2": "If/then branch", "0-3": "Create task", "0-4": "Send email",
  "0-5": "Set property", "0-6": "Copy property", "0-7": "Send notification",
  "0-8": "In-app notification", "0-9": "Enroll in workflow", "0-10": "Webhook",
  "0-11": "Add to list", "0-12": "Remove from list", "0-13": "Create deal",
  "0-14": "Clear property", "0-15": "Rotate owner", "0-16": "Create ticket",
  "0-17": "Branch", "0-18": "Create company", "0-19": "Custom code",
  "0-20": "Unenroll from workflow", "0-35": "Format data",
};

function hash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);
}

function summarizeAction(action: any): ActionSummary {
  const atid = action.actionTypeId || "unknown";
  const fields = action.fields || {};
  const label = ACTION_LABELS[atid] || `Action ${atid}`;

  // Build a key that identifies this action uniquely
  let key = atid;
  if (fields.property_name) key += `:${fields.property_name}`;
  if (fields.content_id) key += `:email:${fields.content_id}`;
  if (fields.flow_id) key += `:flow:${fields.flow_id}`;
  if (fields.listId || fields.list_id) key += `:list:${fields.listId || fields.list_id}`;
  if (fields.subject) key += `:${fields.subject}`;

  return {
    actionId: action.actionId || "",
    actionTypeId: atid,
    label,
    key,
    fieldsHash: hash(JSON.stringify(fields)),
    fields,
  };
}

function describeFieldChange(atid: string, field: string, oldVal: any, newVal: any): string {
  const label = ACTION_LABELS[atid] || "Action";
  const cleanField = field.replace(/_/g, " ");

  if (field === "value" && typeof oldVal === "object") {
    const o = oldVal?.staticValue || JSON.stringify(oldVal);
    const n = newVal?.staticValue || JSON.stringify(newVal);
    return `${label}: value changed from "${o}" to "${n}"`;
  }
  return `${label}: ${cleanField} changed from "${String(oldVal).slice(0, 50)}" to "${String(newVal).slice(0, 50)}"`;
}

export function generateChangelog(
  workflowId: string,
  hubspotFlowId: string,
  workflowName: string,
  previousActions: any[] | null,
  currentActions: any[] | null,
  previousEnrollment: any | null,
  currentEnrollment: any | null,
  previousStatus: string | null,
  currentStatus: string,
  previousName: string | null,
): ChangeEntry[] {
  const changes: ChangeEntry[] = [];

  // --- Status change ---
  if (previousStatus && previousStatus !== currentStatus) {
    changes.push({
      workflowId, hubspotFlowId, workflowName,
      changeType: "STATUS_CHANGE",
      severity: currentStatus === "ACTIVE" ? "INFO" : "WARNING",
      summary: `Workflow ${currentStatus === "ACTIVE" ? "activated" : "deactivated"}`,
      previousValue: previousStatus,
      newValue: currentStatus,
    });
  }

  // --- Name change ---
  if (previousName && previousName !== workflowName) {
    changes.push({
      workflowId, hubspotFlowId, workflowName,
      changeType: "RENAMED",
      severity: "INFO",
      summary: `Renamed from "${previousName}" to "${workflowName}"`,
      previousValue: previousName,
      newValue: workflowName,
    });
  }

  // --- New workflow (no previous snapshot) ---
  if (!previousActions) {
    changes.push({
      workflowId, hubspotFlowId, workflowName,
      changeType: "WORKFLOW_CREATED",
      severity: "INFO",
      summary: `New workflow detected with ${(currentActions || []).length} action(s)`,
    });
    return changes;
  }

  // --- Action diff ---
  const prevSummaries = (previousActions || []).map(summarizeAction);
  const currSummaries = (currentActions || []).map(summarizeAction);

  const prevByKey = new Map<string, ActionSummary>();
  for (const s of prevSummaries) prevByKey.set(s.key, s);
  const currByKey = new Map<string, ActionSummary>();
  for (const s of currSummaries) currByKey.set(s.key, s);

  // Actions added
  for (const [key, curr] of currByKey) {
    if (!prevByKey.has(key)) {
      let detail = curr.label;
      const f = curr.fields;
      if (f.property_name) detail += `: ${f.property_name}`;
      if (f.subject) detail += `: "${f.subject}"`;
      if (f.content_id) detail += `: email ${f.content_id}`;

      changes.push({
        workflowId, hubspotFlowId, workflowName,
        changeType: "ACTION_ADDED",
        severity: "INFO",
        summary: `Added action: ${detail}`,
        newValue: JSON.stringify(curr.fields).slice(0, 500),
      });
    }
  }

  // Actions removed
  for (const [key, prev] of prevByKey) {
    if (!currByKey.has(key)) {
      let detail = prev.label;
      const f = prev.fields;
      if (f.property_name) detail += `: ${f.property_name}`;
      if (f.subject) detail += `: "${f.subject}"`;

      changes.push({
        workflowId, hubspotFlowId, workflowName,
        changeType: "ACTION_REMOVED",
        severity: "WARNING",
        summary: `Removed action: ${detail}`,
        previousValue: JSON.stringify(prev.fields).slice(0, 500),
      });
    }
  }

  // Actions modified
  for (const [key, curr] of currByKey) {
    const prev = prevByKey.get(key);
    if (prev && prev.fieldsHash !== curr.fieldsHash) {
      // Find specific field changes
      const fieldChanges: string[] = [];
      const allKeys = new Set([...Object.keys(prev.fields), ...Object.keys(curr.fields)]);
      for (const fk of allKeys) {
        const pv = JSON.stringify(prev.fields[fk]);
        const cv = JSON.stringify(curr.fields[fk]);
        if (pv !== cv) {
          fieldChanges.push(describeFieldChange(curr.actionTypeId, fk, prev.fields[fk], curr.fields[fk]));
        }
      }

      if (fieldChanges.length > 0) {
        changes.push({
          workflowId, hubspotFlowId, workflowName,
          changeType: "ACTION_MODIFIED",
          severity: "INFO",
          summary: `Modified action: ${curr.label}`,
          details: fieldChanges.join("\n"),
          previousValue: JSON.stringify(prev.fields).slice(0, 500),
          newValue: JSON.stringify(curr.fields).slice(0, 500),
        });
      }
    }
  }

  // --- Action order change ---
  const prevOrder = prevSummaries.map(s => s.key).join(",");
  const currOrder = currSummaries.map(s => s.key).join(",");
  if (prevOrder !== currOrder && changes.filter(c => c.changeType === "ACTION_ADDED" || c.changeType === "ACTION_REMOVED").length === 0) {
    changes.push({
      workflowId, hubspotFlowId, workflowName,
      changeType: "ACTIONS_REORDERED",
      severity: "INFO",
      summary: "Action order changed",
    });
  }

  // --- Enrollment criteria change ---
  const prevEnrollHash = hash(JSON.stringify(previousEnrollment || {}));
  const currEnrollHash = hash(JSON.stringify(currentEnrollment || {}));
  if (prevEnrollHash !== currEnrollHash) {
    changes.push({
      workflowId, hubspotFlowId, workflowName,
      changeType: "ENROLLMENT_CHANGED",
      severity: "WARNING",
      summary: "Enrollment criteria modified",
      previousValue: JSON.stringify(previousEnrollment).slice(0, 500),
      newValue: JSON.stringify(currentEnrollment).slice(0, 500),
    });
  }

  return changes;
}

export function hashActions(actions: any[]): string {
  return hash(JSON.stringify(actions || []));
}

export function hashEnrollment(enrollment: any): string {
  return hash(JSON.stringify(enrollment || {}));
}
