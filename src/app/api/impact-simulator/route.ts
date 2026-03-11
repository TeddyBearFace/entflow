import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ImpactItem {
  type: "property_stops" | "enrollment_lost" | "list_orphaned" | "email_stops" | "cascade";
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  affectedWorkflows: Array<{ id: string; name: string; status: string }>;
}

export async function GET(request: NextRequest) {
  const portalId = request.nextUrl.searchParams.get("portalId");
  const workflowId = request.nextUrl.searchParams.get("workflowId");
  if (!portalId || !workflowId) return NextResponse.json({ error: "portalId and workflowId required" }, { status: 400 });

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    select: { id: true, name: true, hubspotFlowId: true, status: true, objectType: true, actions: true, actionCount: true },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  // Get all workflows for name/status lookup
  const allWorkflows = await prisma.workflow.findMany({
    where: { portalId },
    select: { id: true, name: true, hubspotFlowId: true, status: true, objectType: true },
  });
  const wfLookup = new Map(allWorkflows.map(w => [w.id, w]));

  // Get dependencies where this workflow is source
  const outgoingDeps = await prisma.dependency.findMany({
    where: { portalId, sourceWorkflowId: workflowId },
    include: { targetWorkflow: { select: { id: true, name: true, status: true } } },
  });

  // Get all dependencies for cascade analysis
  const allDeps = await prisma.dependency.findMany({
    where: { portalId },
    select: { sourceWorkflowId: true, targetWorkflowId: true, type: true },
  });

  // Get property index — find properties this workflow writes to
  const propertyIndex = await prisma.propertyIndex.findMany({
    where: { portalId },
  });

  const impacts: ImpactItem[] = [];

  // 1. Properties this workflow WRITES that other active workflows READ
  const propsWeWrite = propertyIndex.filter(p => p.writtenByWorkflows.includes(workflowId));
  
  for (const prop of propsWeWrite) {
    // Find other workflows that read this property
    const readerIds = prop.readByWorkflows.filter(id => id !== workflowId);
    const activeReaders = readerIds
      .map(id => wfLookup.get(id))
      .filter((w): w is NonNullable<typeof w> => !!w && w.status === "ACTIVE");

    if (activeReaders.length > 0) {
      const prettyProp = prop.propertyName.replace(/^hs_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      
      // Check if we're the ONLY writer — that makes it critical
      const otherActiveWriters = prop.writtenByWorkflows
        .filter(id => id !== workflowId)
        .filter(id => { const w = wfLookup.get(id); return w && w.status === "ACTIVE"; });
      
      const isOnlyWriter = otherActiveWriters.length === 0;

      impacts.push({
        type: "property_stops",
        severity: isOnlyWriter ? "critical" : "warning",
        title: isOnlyWriter
          ? `"${prettyProp}" will no longer be set by any active workflow`
          : `"${prettyProp}" — one fewer workflow writing to it`,
        detail: `${activeReaders.length} active workflow${activeReaders.length > 1 ? "s" : ""} read${activeReaders.length === 1 ? "s" : ""} this property.${
          isOnlyWriter ? " This is the only active workflow setting it." : ` ${otherActiveWriters.length} other workflow${otherActiveWriters.length > 1 ? "s" : ""} also write${otherActiveWriters.length === 1 ? "s" : ""} to it.`
        }`,
        affectedWorkflows: activeReaders.map(w => ({ id: w.id, name: w.name, status: w.status })),
      });
    }
  }

  // 2. Cross-enrollments — workflows this one enrolls records into
  const enrollmentDeps = outgoingDeps.filter(d => d.type === "CROSS_ENROLLMENT" && d.targetWorkflow);
  const activeEnrollTargets = enrollmentDeps
    .filter(d => d.targetWorkflow?.status === "ACTIVE")
    .map(d => d.targetWorkflow!);
  if (activeEnrollTargets.length > 0) {
    impacts.push({
      type: "enrollment_lost",
      severity: "critical",
      title: `${activeEnrollTargets.length} workflow${activeEnrollTargets.length > 1 ? "s" : ""} will lose an enrollment source`,
      detail: `This workflow enrolls records into other workflows. Those workflows may stop receiving new records from this path.`,
      affectedWorkflows: activeEnrollTargets,
    });
  }

  // 3. List operations — lists this workflow manages that others depend on
  const listDeps = outgoingDeps.filter(d => d.type === "LIST_REFERENCE" && d.targetWorkflow);
  const activeListUsers = listDeps
    .filter(d => d.targetWorkflow?.status === "ACTIVE")
    .map(d => d.targetWorkflow!);
  if (activeListUsers.length > 0) {
    impacts.push({
      type: "list_orphaned",
      severity: "warning",
      title: `${activeListUsers.length} workflow${activeListUsers.length > 1 ? "s" : ""} use lists managed by this workflow`,
      detail: `This workflow adds or removes records from shared lists. Those lists may stop updating.`,
      affectedWorkflows: activeListUsers,
    });
  }

  // 4. Emails that would stop sending
  const actions = (workflow.actions as any[]) || [];
  const emailActions = actions.filter(a => {
    const atid = a.actionTypeId || "";
    return atid === "0-4" || /SEND.*EMAIL/i.test(atid);
  });
  if (emailActions.length > 0) {
    impacts.push({
      type: "email_stops",
      severity: "warning",
      title: `${emailActions.length} email${emailActions.length > 1 ? "s" : ""} will stop sending`,
      detail: `Automated emails triggered by this workflow will no longer be sent.`,
      affectedWorkflows: [],
    });
  }

  // 5. Cascade — workflows downstream of our direct dependents
  const directlyAffectedIds = new Set(impacts.flatMap(i => i.affectedWorkflows.map(w => w.id)));
  const cascadeWorkflows: Array<{ id: string; name: string; status: string }> = [];
  const visited = new Set<string>([workflowId, ...Array.from(directlyAffectedIds)]);
  const queue = Array.from(directlyAffectedIds);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const downstream = allDeps
      .filter(d => d.sourceWorkflowId === currentId && d.targetWorkflowId && !visited.has(d.targetWorkflowId))
      .map(d => d.targetWorkflowId!);
    for (const targetId of downstream) {
      visited.add(targetId);
      const targetWf = wfLookup.get(targetId);
      if (targetWf && targetWf.status === "ACTIVE") {
        cascadeWorkflows.push({ id: targetWf.id, name: targetWf.name, status: targetWf.status });
        queue.push(targetId);
      }
    }
  }

  if (cascadeWorkflows.length > 0) {
    impacts.push({
      type: "cascade",
      severity: "warning",
      title: `${cascadeWorkflows.length} workflow${cascadeWorkflows.length > 1 ? "s" : ""} may be indirectly affected`,
      detail: `These are downstream in the dependency chain and may experience reduced data flow or broken logic.`,
      affectedWorkflows: cascadeWorkflows,
    });
  }

  const totalAffected = new Set(impacts.flatMap(i => i.affectedWorkflows.map(w => w.id))).size;

  return NextResponse.json({
    workflow: { id: workflow.id, name: workflow.name, status: workflow.status },
    impacts,
    summary: {
      totalAffected,
      criticalCount: impacts.filter(i => i.severity === "critical").length,
      propertiesAffected: propsWeWrite.length,
      emailsAffected: emailActions.length,
      safe: impacts.length === 0,
    },
  });
}
