// GET /api/workflow-diff?portalId=X&workflowId=Y
// Returns all snapshots for a workflow.
// Optional: &from=snapshotId&to=snapshotId to get a structured diff between two snapshots.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  "0-1": "Delay", "0-2": "If/then branch", "0-3": "Create task", "0-4": "Send email",
  "0-5": "Set property", "0-6": "Copy property", "0-7": "Send notification",
  "0-8": "In-app notification", "0-9": "Enroll in workflow", "0-10": "Webhook",
  "0-11": "Add to list", "0-12": "Remove from list", "0-13": "Create deal",
  "0-14": "Clear property", "0-15": "Rotate owner", "0-16": "Create ticket",
  "0-17": "Branch", "0-18": "Create company", "0-19": "Custom code",
  "0-20": "Unenroll from workflow", "0-35": "Format data",
};

interface ActionDiff {
  status: "added" | "removed" | "modified" | "unchanged";
  label: string;
  actionTypeId: string;
  key: string;
  previousFields?: Record<string, any>;
  currentFields?: Record<string, any>;
  fieldChanges?: Array<{ field: string; previous: any; current: any }>;
}

function actionKey(action: any): string {
  const atid = action.actionTypeId || "unknown";
  const fields = action.fields || {};
  let key = atid;
  if (fields.property_name) key += `:${fields.property_name}`;
  if (fields.content_id) key += `:email:${fields.content_id}`;
  if (fields.flow_id) key += `:flow:${fields.flow_id}`;
  if (fields.listId || fields.list_id) key += `:list:${fields.listId || fields.list_id}`;
  if (fields.subject) key += `:${fields.subject}`;
  return key;
}

function computeActionDiffs(prevActions: any[], currActions: any[]): ActionDiff[] {
  const prevByKey = new Map<string, any>();
  for (const a of prevActions) prevByKey.set(actionKey(a), a);
  const currByKey = new Map<string, any>();
  for (const a of currActions) currByKey.set(actionKey(a), a);

  const diffs: ActionDiff[] = [];

  // Current actions: added, modified, or unchanged
  for (const [key, curr] of currByKey) {
    const atid = curr.actionTypeId || "unknown";
    const label = ACTION_LABELS[atid] || `Action ${atid}`;
    const prev = prevByKey.get(key);

    if (!prev) {
      diffs.push({ status: "added", label, actionTypeId: atid, key, currentFields: curr.fields || {} });
    } else {
      const prevFields = prev.fields || {};
      const currFields = curr.fields || {};
      const prevJson = JSON.stringify(prevFields);
      const currJson = JSON.stringify(currFields);

      if (prevJson !== currJson) {
        // Find specific field changes
        const allKeys = new Set([...Object.keys(prevFields), ...Object.keys(currFields)]);
        const fieldChanges: ActionDiff["fieldChanges"] = [];
        for (const fk of allKeys) {
          if (JSON.stringify(prevFields[fk]) !== JSON.stringify(currFields[fk])) {
            fieldChanges.push({ field: fk, previous: prevFields[fk], current: currFields[fk] });
          }
        }
        diffs.push({ status: "modified", label, actionTypeId: atid, key, previousFields: prevFields, currentFields: currFields, fieldChanges });
      } else {
        diffs.push({ status: "unchanged", label, actionTypeId: atid, key, currentFields: currFields });
      }
    }
  }

  // Removed actions
  for (const [key, prev] of prevByKey) {
    if (!currByKey.has(key)) {
      const atid = prev.actionTypeId || "unknown";
      const label = ACTION_LABELS[atid] || `Action ${atid}`;
      diffs.push({ status: "removed", label, actionTypeId: atid, key, previousFields: prev.fields || {} });
    }
  }

  return diffs;
}

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  const workflowId = request.nextUrl.searchParams.get("workflowId");
  const fromId = request.nextUrl.searchParams.get("from");
  const toId = request.nextUrl.searchParams.get("to");

  if (!portalId || !workflowId) {
    return NextResponse.json({ error: "portalId and workflowId required" }, { status: 400 });
  }

  // Get workflow info
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    select: { id: true, name: true, hubspotFlowId: true, status: true, objectType: true },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  // Get all snapshots for this workflow
  const snapshots = await prisma.workflowSnapshot.findMany({
    where: { portalId, workflowId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      actionCount: true,
      actionsHash: true,
      enrollmentHash: true,
      createdAt: true,
      syncLogId: true,
    },
  });

  // If no diff requested, just return the snapshot list
  if (!fromId || !toId) {
    return NextResponse.json({ workflow, snapshots, diff: null });
  }

  // Compute diff between two snapshots
  const [fromSnapshot, toSnapshot] = await Promise.all([
    prisma.workflowSnapshot.findUnique({ where: { id: fromId } }),
    prisma.workflowSnapshot.findUnique({ where: { id: toId } }),
  ]);

  if (!fromSnapshot || !toSnapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const prevActions = JSON.parse(fromSnapshot.actionsJson || "[]");
  const currActions = JSON.parse(toSnapshot.actionsJson || "[]");
  const prevEnrollment = fromSnapshot.enrollmentJson ? JSON.parse(fromSnapshot.enrollmentJson) : null;
  const currEnrollment = toSnapshot.enrollmentJson ? JSON.parse(toSnapshot.enrollmentJson) : null;

  const actionDiffs = computeActionDiffs(prevActions, currActions);

  const diff = {
    from: { id: fromSnapshot.id, name: fromSnapshot.name, status: fromSnapshot.status, actionCount: fromSnapshot.actionCount, createdAt: fromSnapshot.createdAt },
    to: { id: toSnapshot.id, name: toSnapshot.name, status: toSnapshot.status, actionCount: toSnapshot.actionCount, createdAt: toSnapshot.createdAt },
    nameChanged: fromSnapshot.name !== toSnapshot.name,
    statusChanged: fromSnapshot.status !== toSnapshot.status,
    enrollmentChanged: fromSnapshot.enrollmentHash !== toSnapshot.enrollmentHash,
    previousEnrollment: prevEnrollment,
    currentEnrollment: currEnrollment,
    actionDiffs,
    summary: {
      added: actionDiffs.filter(d => d.status === "added").length,
      removed: actionDiffs.filter(d => d.status === "removed").length,
      modified: actionDiffs.filter(d => d.status === "modified").length,
      unchanged: actionDiffs.filter(d => d.status === "unchanged").length,
    },
  };

  return NextResponse.json({ workflow, snapshots, diff });
}
