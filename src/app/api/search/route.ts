import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const portalId = searchParams.get("portalId");
  const query = searchParams.get("q");

  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });
  if (!query || query.length < 2) return NextResponse.json({ results: [] });

  const q = query.toLowerCase();

  const workflows = await prisma.workflow.findMany({
    where: { portalId },
    select: {
      id: true, name: true, hubspotFlowId: true, objectType: true,
      status: true, actions: true, enrollmentCriteria: true, actionCount: true,
    },
  });

  // Fetch email and list lookups
  const [emails, lists] = await Promise.all([
    prisma.marketingEmail.findMany({ where: { portalId } }),
    prisma.crmList.findMany({ where: { portalId } }),
  ]);
  const emailLookup: Record<string, string> = {};
  for (const e of emails) emailLookup[e.hubspotEmailId] = e.name;
  const listLookup: Record<string, string> = {};
  for (const l of lists) listLookup[l.hubspotListId] = l.name;

  const ACTION_LABELS: Record<string, string> = {
    "0-1":"Delay","0-2":"If/then branch","0-3":"Create task","0-4":"Send email",
    "0-5":"Set property","0-6":"Copy property","0-7":"Send notification",
    "0-9":"Enroll in workflow","0-10":"Webhook","0-11":"Add to list",
    "0-12":"Remove from list","0-13":"Create deal","0-14":"Clear property",
    "0-16":"Create ticket","0-19":"Custom code",
  };

  interface SearchResult {
    workflowId: string;
    workflowName: string;
    hubspotFlowId: string;
    objectType: string;
    status: string;
    matchType: "workflow_name" | "action" | "property" | "email" | "list" | "enrollment";
    matchDetail: string;
    actionIndex?: number;
  }

  const results: SearchResult[] = [];

  for (const wf of workflows) {
    // Match workflow name
    if (wf.name.toLowerCase().includes(q)) {
      results.push({
        workflowId: wf.id, workflowName: wf.name, hubspotFlowId: wf.hubspotFlowId,
        objectType: wf.objectType, status: wf.status,
        matchType: "workflow_name", matchDetail: `Workflow name: "${wf.name}"`,
      });
    }

    // Search actions
    const actions = wf.actions as any[];
    if (!actions || !Array.isArray(actions)) continue;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const atid = action.actionTypeId || "";
      const fields = action.fields || {};
      const actionLabel = ACTION_LABELS[atid] || `Action ${atid}`;

      // Property match
      if (fields.property_name && fields.property_name.toLowerCase().includes(q)) {
        results.push({
          workflowId: wf.id, workflowName: wf.name, hubspotFlowId: wf.hubspotFlowId,
          objectType: wf.objectType, status: wf.status,
          matchType: "property", matchDetail: `${actionLabel}: property "${fields.property_name}"`,
          actionIndex: i,
        });
      }

      // Email match
      const contentId = fields.content_id || fields.contentId;
      if (contentId) {
        const emailName = emailLookup[String(contentId)] || "";
        if (emailName.toLowerCase().includes(q) || String(contentId).includes(q)) {
          results.push({
            workflowId: wf.id, workflowName: wf.name, hubspotFlowId: wf.hubspotFlowId,
            objectType: wf.objectType, status: wf.status,
            matchType: "email", matchDetail: `Send email: "${emailName || contentId}"`,
            actionIndex: i,
          });
        }
      }

      // List match
      const listId = fields.listId || fields.list_id || fields.staticListId;
      if (listId) {
        const listName = listLookup[String(listId)] || "";
        if (listName.toLowerCase().includes(q) || String(listId).includes(q)) {
          results.push({
            workflowId: wf.id, workflowName: wf.name, hubspotFlowId: wf.hubspotFlowId,
            objectType: wf.objectType, status: wf.status,
            matchType: "list", matchDetail: `${actionLabel}: list "${listName || listId}"`,
            actionIndex: i,
          });
        }
      }

      // Subject / task title match
      if (fields.subject && fields.subject.toLowerCase().includes(q)) {
        results.push({
          workflowId: wf.id, workflowName: wf.name, hubspotFlowId: wf.hubspotFlowId,
          objectType: wf.objectType, status: wf.status,
          matchType: "action", matchDetail: `${actionLabel}: "${fields.subject}"`,
          actionIndex: i,
        });
      }

      // Value match
      const val = fields.value;
      if (val) {
        const sv = typeof val === "string" ? val : val?.staticValue;
        if (sv && String(sv).toLowerCase().includes(q)) {
          results.push({
            workflowId: wf.id, workflowName: wf.name, hubspotFlowId: wf.hubspotFlowId,
            objectType: wf.objectType, status: wf.status,
            matchType: "property", matchDetail: `${actionLabel}: sets "${fields.property_name}" to "${sv}"`,
            actionIndex: i,
          });
        }
      }

      // Webhook URL match
      if (fields.url && fields.url.toLowerCase().includes(q)) {
        results.push({
          workflowId: wf.id, workflowName: wf.name, hubspotFlowId: wf.hubspotFlowId,
          objectType: wf.objectType, status: wf.status,
          matchType: "action", matchDetail: `Webhook: ${fields.url}`,
          actionIndex: i,
        });
      }
    }
  }

  // Deduplicate by workflow+matchDetail
  const seen = new Set<string>();
  const unique = results.filter(r => {
    const key = `${r.workflowId}:${r.matchDetail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ results: unique.slice(0, 100), total: unique.length, query });
}
