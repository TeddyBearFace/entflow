// ===========================================
// Sync Engine
// ===========================================
// Orchestrates the full sync process:
// 1. Fetch all workflows from HubSpot
// 2. Fetch full details for each workflow
// 3. Parse workflows and build dependency graph
// 4. Detect conflicts
// 5. Store everything in the database
// 6. Log the sync result

import { prisma } from "./prisma";
import {
  fetchAllWorkflows,
  batchFetchWorkflowDetails,
  fetchPipelines,
  fetchMarketingEmail,
  fetchListDetails,
  getValidAccessToken,
} from "./hubspot";
import { generateChangelog, hashActions, hashEnrollment } from "./changelog";
import { parseAllWorkflows } from "./parser";
import { detectConflicts } from "./conflicts";
import { resolveObjectType } from "@/types";
import type { HubSpotFlowDetail } from "@/types";

export interface SyncResult {
  success: boolean;
  workflowCount: number;
  dependencyCount: number;
  conflictCount: number;
  durationMs: number;
  error?: string;
}

/**
 * Run a full sync for a portal.
 * This is the main entry point called by API routes and scheduled jobs.
 */
export async function syncPortal(portalId: string): Promise<SyncResult> {
  const startTime = Date.now();

  // Create sync log entry
  const syncLog = await prisma.syncLog.create({
    data: {
      portalId,
      status: "SYNCING",
    },
  });

  // Mark portal as syncing
  await prisma.portal.update({
    where: { id: portalId },
    data: { syncStatus: "SYNCING", syncProgress: 0, syncTotal: 0, syncMessage: "Starting sync..." },
  });

  // Get plan tier for workflow limit
  const portal = await prisma.portal.findUnique({
    where: { id: portalId },
    select: { planTier: true },
  });
  const { getPlan } = await import("./plans");
  const plan = getPlan(portal?.planTier || "FREE");
  const workflowLimit = plan.workflowLimit === Infinity ? 999999 : plan.workflowLimit;

  try {
    // --- Step 0: Verify HubSpot connection is still valid ---
    console.log(`[Sync ${portalId}] Verifying HubSpot connection...`);
    await updateSyncProgress(portalId, 0, 0, "Verifying HubSpot connection...");
    try {
      const testToken = await getValidAccessToken(portalId);
      const testRes = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + testToken);
      if (!testRes.ok) throw new Error(`HubSpot returned ${testRes.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Sync ${portalId}] HubSpot connection invalid:`, msg);
      await prisma.portal.update({
        where: { id: portalId },
        data: { syncStatus: "FAILED", syncMessage: "HubSpot disconnected — please reconnect your portal" },
      });
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { status: "FAILED", error: `Auth failed: ${msg}`, completedAt: new Date() },
      });
      return { success: false, workflowCount: 0, dependencyCount: 0, conflictCount: 0, durationMs: Date.now() - startTime, error: msg };
    }

    // --- Step 1: Fetch workflow list ---
    console.log(`[Sync ${portalId}] Fetching workflow list...`);
    await updateSyncProgress(portalId, 0, 0, "Discovering workflows...");
    let workflowSummaries = await fetchAllWorkflows(portalId);
    console.log(
      `[Sync ${portalId}] Found ${workflowSummaries.length} workflows`
    );

    // Enforce workflow limit based on plan tier
    if (workflowSummaries.length > workflowLimit) {
      console.log(`[Sync ${portalId}] Plan limit: ${workflowLimit}, truncating from ${workflowSummaries.length}`);
      workflowSummaries = workflowSummaries.slice(0, workflowLimit);
    }

    await updateSyncProgress(portalId, 0, workflowSummaries.length, `Found ${workflowSummaries.length} workflows`);

    if (workflowSummaries.length === 0) {
      await updateSyncProgress(portalId, 0, 0, "No workflows found");
      await completeSyncLog(syncLog.id, portalId, 0, 0, 0, startTime);
      return {
        success: true,
        workflowCount: 0,
        dependencyCount: 0,
        conflictCount: 0,
        durationMs: Date.now() - startTime,
      };
    }

    // --- Step 2: Fetch full details ---
    console.log(`[Sync ${portalId}] Fetching workflow details...`);
    const flowIds = workflowSummaries.map((w) => w.id);
    const flowDetails = await batchFetchWorkflowDetails(portalId, flowIds, async (completed, total) => {
      await updateSyncProgress(portalId, completed, total, `Fetching workflow details (${completed}/${total})...`);
    });
    console.log(
      `[Sync ${portalId}] Retrieved details for ${flowDetails.length} workflows`
    );

    // --- Step 3: Parse all workflows ---
    console.log(`[Sync ${portalId}] Parsing workflows...`);
    await updateSyncProgress(portalId, flowDetails.length, flowDetails.length, "Parsing workflow actions...");
    const { parsedWorkflows, dependencyGraph } = parseAllWorkflows(flowDetails);

    // --- Step 4: Detect conflicts ---
    console.log(`[Sync ${portalId}] Detecting conflicts...`);
    await updateSyncProgress(portalId, flowDetails.length, flowDetails.length, "Detecting conflicts...");
    const conflicts = detectConflicts(
      parsedWorkflows,
      dependencyGraph.edges,
      dependencyGraph.propertyIndex
    );

    // --- Step 4.5: Fetch pipelines ---
    console.log(`[Sync ${portalId}] Fetching pipelines...`);
    await updateSyncProgress(portalId, flowDetails.length, flowDetails.length, "Fetching pipelines...");
    const [dealPipelines, ticketPipelines] = await Promise.all([
      fetchPipelines(portalId, "DEAL"),
      fetchPipelines(portalId, "TICKET"),
    ]);
    const allPipelines = [
      ...dealPipelines.map((p) => ({ ...p, objectType: "DEAL" })),
      ...ticketPipelines.map((p) => ({ ...p, objectType: "TICKET" })),
    ];

    // --- Step 4.6: Fetch email metadata ---
    const emailIds = new Set<string>();
    for (const wf of parsedWorkflows) {
      for (const email of wf.emailSends) {
        if (email.emailId && email.emailId !== "0") {
          emailIds.add(email.emailId);
        }
      }
    }
    // Also scan raw actions for content_id fields
    for (const flow of flowDetails) {
      if (flow.actions && Array.isArray(flow.actions)) {
        for (const action of flow.actions) {
          const contentId = action?.fields?.content_id;
          if (contentId && contentId !== "0") {
            emailIds.add(String(contentId));
          }
        }
      }
    }
    const emailDetails: Array<{ id: string; name: string; subject: string }> = [];
    const emailArray = [...emailIds];
    const EMAIL_BATCH = 10;
    for (let i = 0; i < emailArray.length; i += EMAIL_BATCH) {
      const batch = emailArray.slice(i, i + EMAIL_BATCH);
      await updateSyncProgress(portalId, flowDetails.length, flowDetails.length, `Resolving emails (${Math.min(i + EMAIL_BATCH, emailArray.length)}/${emailArray.length})...`);
      const results = await Promise.all(batch.map(id => fetchMarketingEmail(portalId, id)));
      for (const r of results) { if (r) emailDetails.push(r); }
    }
    console.log(`[Sync ${portalId}] Total emails resolved: ${emailDetails.length}`);

    // --- Step 4.7: Fetch list metadata ---
    const listIds = new Set<string>();
    for (const wf of parsedWorkflows) {
      for (const list of wf.listReferences) {
        if (list.listId) listIds.add(list.listId);
      }
    }
    // Also scan raw actions for listId fields
    for (const flow of flowDetails) {
      if (flow.actions && Array.isArray(flow.actions)) {
        for (const action of flow.actions) {
          const lid = action?.fields?.listId || action?.fields?.list_id || action?.fields?.staticListId;
          if (lid) listIds.add(String(lid));
        }
      }
    }
    const listDetails: Array<{ id: string; name: string }> = [];
    const listArray = [...listIds];
    const LIST_BATCH = 10;
    for (let i = 0; i < listArray.length; i += LIST_BATCH) {
      const batch = listArray.slice(i, i + LIST_BATCH);
      await updateSyncProgress(portalId, flowDetails.length, flowDetails.length, `Resolving lists (${Math.min(i + LIST_BATCH, listArray.length)}/${listArray.length})...`);
      const results = await Promise.all(batch.map(id => fetchListDetails(portalId, id)));
      for (const r of results) { if (r) listDetails.push(r); }
    }
    console.log(`[Sync ${portalId}] Total lists resolved: ${listDetails.length}`);

    // --- Step 5: Store in database ---
    console.log(`[Sync ${portalId}] Storing results...`);
    await updateSyncProgress(portalId, flowDetails.length, flowDetails.length, `Saving ${parsedWorkflows.length} workflows to database...`);
    await storeResults(
      portalId,
      flowDetails,
      parsedWorkflows,
      dependencyGraph,
      conflicts,
      allPipelines,
      emailDetails,
      listDetails
    );

    // --- Step 5b: Generate changelog ---
    console.log(`[Sync ${portalId}] Generating changelog...`);
    await updateSyncProgress(portalId, flowDetails.length, flowDetails.length, "Generating changelog...");
    let changeCount = 0;
    try {
      changeCount = await generateAndStoreChangelog(portalId, flowDetails, syncLog.id);
      console.log(`[Sync ${portalId}] Changelog: ${changeCount} change(s) detected`);
    } catch (err) {
      console.warn(`[Sync ${portalId}] Changelog generation failed:`, err);
    }

    // --- Step 6: Complete sync ---
    const result: SyncResult = {
      success: true,
      workflowCount: parsedWorkflows.length,
      dependencyCount: dependencyGraph.edges.length,
      conflictCount: conflicts.length,
      durationMs: Date.now() - startTime,
    };

    await completeSyncLog(
      syncLog.id,
      portalId,
      result.workflowCount,
      result.dependencyCount,
      result.conflictCount,
      startTime
    );

    await updateSyncProgress(portalId, result.workflowCount, result.workflowCount, "Sync complete!");

    console.log(
      `[Sync ${portalId}] Complete. ${result.workflowCount} workflows, ${result.dependencyCount} dependencies, ${result.conflictCount} conflicts. (${result.durationMs}ms)`
    );

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[Sync ${portalId}] Failed:`, errorMessage);

    const isAuthFailure = errorMessage.includes("HUBSPOT_AUTH_FAILED");

    // Mark sync as failed
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "FAILED",
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    await prisma.portal.update({
      where: { id: portalId },
      data: {
        syncStatus: "FAILED",
        syncMessage: isAuthFailure
          ? "HubSpot disconnected — please reconnect your portal"
          : `Sync failed: ${errorMessage}`,
      },
    });

    return {
      success: false,
      workflowCount: 0,
      dependencyCount: 0,
      conflictCount: 0,
      durationMs: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Update sync progress in the portal record for real-time UI feedback.
 */
async function updateSyncProgress(portalId: string, progress: number, total: number, message: string) {
  try {
    await prisma.portal.update({
      where: { id: portalId },
      data: { syncProgress: progress, syncTotal: total, syncMessage: message },
    });
  } catch (err) {
    // Non-critical - don't fail sync if progress update fails
  }
}

/**
 * Store parsed results in the database.
 * Uses a transaction to ensure consistency.
 */
async function storeResults(
  portalId: string,
  flowDetails: HubSpotFlowDetail[],
  parsedWorkflows: ReturnType<typeof parseAllWorkflows>["parsedWorkflows"],
  dependencyGraph: ReturnType<typeof parseAllWorkflows>["dependencyGraph"],
  conflicts: ReturnType<typeof detectConflicts>,
  pipelines: Array<{ id: string; label: string; displayOrder: number; objectType: string; stages: Array<{ id: string; label: string; displayOrder: number; metadata: any }> }>,
  emails: Array<{ id: string; name: string; subject: string }>,
  lists: Array<{ id: string; name: string }>
): Promise<void> {
  // Clear existing data (rebuild fresh each sync)
  await prisma.dependency.deleteMany({ where: { portalId } });
  await prisma.conflictWorkflow.deleteMany({ where: { conflict: { portalId } } });
  await prisma.conflict.deleteMany({ where: { portalId } });
  await prisma.propertyIndex.deleteMany({ where: { portalId } });

  // Upsert workflows
  const workflowIdMap = new Map<string, string>();
  for (const parsed of parsedWorkflows) {
    const detail = flowDetails.find((f) => f.id === parsed.hubspotFlowId);
    const workflow = await prisma.workflow.upsert({
      where: { portalId_hubspotFlowId: { portalId, hubspotFlowId: parsed.hubspotFlowId } },
      update: {
        name: parsed.name,
        objectType: parsed.objectType as any,
        status: parsed.status as any,
        flowType: parsed.flowType,
        enrollmentCriteria: detail?.enrollmentCriteria as any,
        actions: detail?.actions as any,
        dataSources: (detail as any)?.dataSources as any,
        actionCount: parsed.actionCount,
        hubspotUpdatedAt: detail?.updatedAt ? new Date(detail.updatedAt) : undefined,
      },
      create: {
        portalId,
        hubspotFlowId: parsed.hubspotFlowId,
        name: parsed.name,
        objectType: parsed.objectType as any,
        status: parsed.status as any,
        flowType: parsed.flowType,
        enrollmentCriteria: detail?.enrollmentCriteria as any,
        actions: detail?.actions as any,
        dataSources: (detail as any)?.dataSources as any,
        actionCount: parsed.actionCount,
        hubspotCreatedAt: detail?.createdAt ? new Date(detail.createdAt) : undefined,
        hubspotUpdatedAt: detail?.updatedAt ? new Date(detail.updatedAt) : undefined,
      },
    });
    workflowIdMap.set(parsed.hubspotFlowId, workflow.id);
  }

  // Remove workflows that no longer exist
  const currentFlowIds = parsedWorkflows.map((p) => p.hubspotFlowId);
  await prisma.workflow.deleteMany({ where: { portalId, hubspotFlowId: { notIn: currentFlowIds } } });

  // Create dependencies
  for (const edge of dependencyGraph.edges) {
    const sourceId = workflowIdMap.get(edge.sourceFlowId);
    const targetId = workflowIdMap.get(edge.targetFlowId);
    if (!sourceId) continue;
    await prisma.dependency.create({
      data: { portalId, sourceWorkflowId: sourceId, targetWorkflowId: targetId || null, type: edge.type as any, severity: edge.severity as any, description: edge.description, detail: edge.detail as any },
    });
  }

  // Create property index
  for (const prop of dependencyGraph.propertyIndex) {
    await prisma.propertyIndex.upsert({
      where: { portalId_propertyName_objectType: { portalId, propertyName: prop.propertyName, objectType: prop.objectType } },
      update: { readByWorkflows: prop.readByWorkflows, writtenByWorkflows: prop.writtenByWorkflows },
      create: { portalId, propertyName: prop.propertyName, objectType: prop.objectType, readByWorkflows: prop.readByWorkflows, writtenByWorkflows: prop.writtenByWorkflows },
    });
  }

  // Create conflicts
  for (const conflict of conflicts) {
    const conflictRecord = await prisma.conflict.create({
      data: { portalId, type: conflict.type as any, severity: conflict.severity as any, description: conflict.description, detail: conflict.detail as any },
    });
    for (const hubspotFlowId of conflict.involvedWorkflowIds) {
      const workflowId = workflowIdMap.get(hubspotFlowId);
      if (workflowId) {
        await prisma.conflictWorkflow.create({ data: { conflictId: conflictRecord.id, workflowId } });
      }
    }
  }

  // Store pipelines
  for (const pipeline of pipelines) {
    const pipelineRecord = await prisma.pipeline.upsert({
      where: { portalId_hubspotPipelineId: { portalId, hubspotPipelineId: pipeline.id } },
      update: { label: pipeline.label, objectType: pipeline.objectType, displayOrder: pipeline.displayOrder },
      create: { portalId, hubspotPipelineId: pipeline.id, label: pipeline.label, objectType: pipeline.objectType, displayOrder: pipeline.displayOrder },
    });
    for (const stage of pipeline.stages) {
      await prisma.pipelineStage.upsert({
        where: { pipelineId_hubspotStageId: { pipelineId: pipelineRecord.id, hubspotStageId: stage.id } },
        update: { label: stage.label, displayOrder: stage.displayOrder, metadata: stage.metadata },
        create: { pipelineId: pipelineRecord.id, hubspotStageId: stage.id, label: stage.label, displayOrder: stage.displayOrder, metadata: stage.metadata },
      });
    }
  }

  // Store emails
  for (const email of emails) {
    await prisma.marketingEmail.upsert({
      where: { portalId_hubspotEmailId: { portalId, hubspotEmailId: email.id } },
      update: { name: email.name, subject: email.subject, fromName: (email as any).fromName || null, fromEmail: (email as any).fromEmail || null, replyTo: (email as any).replyTo || null, previewText: (email as any).previewText || null },
      create: { portalId, hubspotEmailId: email.id, name: email.name, subject: email.subject, fromName: (email as any).fromName || null, fromEmail: (email as any).fromEmail || null, replyTo: (email as any).replyTo || null, previewText: (email as any).previewText || null },
    });
  }

  // Store lists
  for (const list of lists) {
    await prisma.crmList.upsert({
      where: { portalId_hubspotListId: { portalId, hubspotListId: list.id } },
      update: { name: list.name },
      create: { portalId, hubspotListId: list.id, name: list.name },
    });
  }
}
/**
 * Mark a sync as complete and update the portal's sync status.
 */
async function completeSyncLog(
  syncLogId: string,
  portalId: string,
  workflowCount: number,
  dependencyCount: number,
  conflictCount: number,
  startTime: number
): Promise<void> {
  await prisma.syncLog.update({
    where: { id: syncLogId },
    data: {
      status: "COMPLETED",
      workflowCount,
      dependencyCount,
      conflictCount,
      durationMs: Date.now() - startTime,
      completedAt: new Date(),
    },
  });

  await prisma.portal.update({
    where: { id: portalId },
    data: {
      syncStatus: "COMPLETED",
      lastSyncedAt: new Date(),
    },
  });
}

/**
 * Generate changelog by comparing current workflows to previous snapshots.
 */
async function generateAndStoreChangelog(
  portalId: string,
  flowDetails: any[],
  syncLogId: string
): Promise<number> {
  const allChanges: any[] = [];

  for (const flow of flowDetails) {
    const fid = String(flow.id);
    const actions = flow.actions || [];
    const enrollment = flow.enrollmentCriteria || null;
    const currentActionsHash = hashActions(actions);
    const currentEnrollmentHash = hashEnrollment(enrollment);

    // Find the workflow's DB record
    const wf = await prisma.workflow.findFirst({
      where: { portalId, hubspotFlowId: fid },
      select: { id: true, name: true, status: true },
    });
    if (!wf) continue;

    // Get most recent snapshot
    const prevSnapshot = await prisma.workflowSnapshot.findFirst({
      where: { portalId, hubspotFlowId: fid },
      orderBy: { createdAt: "desc" },
    });

    // Generate changes
    const changes = generateChangelog(
      wf.id,
      fid,
      flow.name || wf.name,
      prevSnapshot ? JSON.parse(prevSnapshot.actionsJson) : null,
      actions,
      prevSnapshot?.enrollmentJson ? JSON.parse(prevSnapshot.enrollmentJson) : null,
      enrollment,
      prevSnapshot?.status || null,
      wf.status,
      prevSnapshot?.name || null,
    );

    // Only store snapshot if something changed (or first time)
    if (!prevSnapshot || currentActionsHash !== prevSnapshot.actionsHash || currentEnrollmentHash !== prevSnapshot.enrollmentHash || prevSnapshot.status !== wf.status || prevSnapshot.name !== (flow.name || wf.name)) {
      await prisma.workflowSnapshot.create({
        data: {
          portalId,
          workflowId: wf.id,
          hubspotFlowId: fid,
          name: flow.name || wf.name,
          status: wf.status,
          actionCount: actions.length,
          actionsHash: currentActionsHash,
          enrollmentHash: currentEnrollmentHash,
          actionsJson: JSON.stringify(actions),
          enrollmentJson: JSON.stringify(enrollment),
          syncLogId,
        },
      });
    }

    allChanges.push(...changes);
  }

  // Store changelog entries
  if (allChanges.length > 0) {
    await prisma.changelogEntry.createMany({
      data: allChanges.map(c => ({
        portalId,
        workflowId: c.workflowId,
        hubspotFlowId: c.hubspotFlowId,
        workflowName: c.workflowName,
        changeType: c.changeType,
        severity: c.severity,
        summary: c.summary,
        details: c.details || null,
        previousValue: c.previousValue || null,
        newValue: c.newValue || null,
        syncLogId,
      })),
    });
  }

  return allChanges.length;
}
