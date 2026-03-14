import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Key properties per object type that RevOps teams care about most
const KEY_PROPERTIES: Record<string, Array<{ name: string; label: string; critical: boolean }>> = {
  CONTACT: [
    { name: "lifecyclestage", label: "Lifecycle Stage", critical: true },
    { name: "hs_lead_status", label: "Lead Status", critical: true },
    { name: "hubspot_owner_id", label: "Contact Owner", critical: true },
    { name: "email", label: "Email", critical: false },
    { name: "hs_analytics_source", label: "Original Source", critical: false },
    { name: "hs_analytics_source_data_1", label: "Original Source Drill-Down 1", critical: false },
    { name: "hs_marketable_status", label: "Marketing Contact Status", critical: true },
    { name: "hs_email_optout", label: "Email Opt-Out", critical: true },
  ],
  DEAL: [
    { name: "dealstage", label: "Deal Stage", critical: true },
    { name: "hs_pipeline", label: "Pipeline", critical: true },
    { name: "hubspot_owner_id", label: "Deal Owner", critical: true },
    { name: "amount", label: "Amount", critical: false },
    { name: "closedate", label: "Close Date", critical: false },
    { name: "hs_deal_stage_probability", label: "Deal Probability", critical: false },
  ],
  COMPANY: [
    { name: "hubspot_owner_id", label: "Company Owner", critical: true },
    { name: "lifecyclestage", label: "Lifecycle Stage", critical: true },
    { name: "industry", label: "Industry", critical: false },
    { name: "hs_lead_status", label: "Lead Status", critical: false },
  ],
  TICKET: [
    { name: "hs_pipeline", label: "Pipeline", critical: true },
    { name: "hs_pipeline_stage", label: "Ticket Status", critical: true },
    { name: "hs_ticket_priority", label: "Priority", critical: true },
    { name: "hubspot_owner_id", label: "Ticket Owner", critical: true },
    { name: "hs_ticket_category", label: "Category", critical: false },
  ],
};

interface PropertyImpact {
  property: string;
  label: string;
  objectType: string;
  critical: boolean;
  readers: Array<{ workflowId: string; name: string; status: string; hubspotFlowId: string }>;
  writers: Array<{ workflowId: string; name: string; status: string; hubspotFlowId: string; value?: string }>;
  totalWorkflows: number;
  hasConflict: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const portalId = searchParams.get("portalId");
  const objectType = searchParams.get("objectType"); // optional filter
  const propertyName = searchParams.get("property"); // optional: specific property

  if (!portalId) return NextResponse.json({ error: "portalId required" }, { status: 400 });

  // Load pipeline stages for resolving raw values
  const [workflows, stagesWithPipeline] = await Promise.all([
    prisma.workflow.findMany({
      where: { portalId },
      select: {
        id: true, name: true, hubspotFlowId: true, objectType: true,
        status: true, actions: true, enrollmentCriteria: true,
      },
    }),
    prisma.pipelineStage.findMany({
      where: { pipeline: { portalId } },
      select: { hubspotStageId: true, label: true, displayOrder: true, pipeline: { select: { objectType: true } } },
    }),
  ]);

  // Build lookup tables for resolving raw values
  // By stage ID (e.g. "appointmentscheduled" → "Appointment Scheduled")
  const stageLookup = new Map<string, string>();
  // By display order per object type (e.g. DEAL:"2" → "Presentation Scheduled")
  const stageOrderByType = new Map<string, Map<string, string>>();
  for (const s of stagesWithPipeline) {
    stageLookup.set(s.hubspotStageId, s.label);
    const ot = s.pipeline.objectType;
    if (!stageOrderByType.has(ot)) stageOrderByType.set(ot, new Map());
    stageOrderByType.get(ot)!.set(String(s.displayOrder), s.label);
  }

  const lifecycleLookup: Record<string, string> = {
    subscriber: "Subscriber", lead: "Lead",
    marketingqualifiedlead: "Marketing Qualified Lead",
    salesqualifiedlead: "Sales Qualified Lead",
    opportunity: "Opportunity", customer: "Customer",
    evangelist: "Evangelist", other: "Other",
  };

  const leadStatusLookup: Record<string, string> = {
    NEW: "New", OPEN: "Open", IN_PROGRESS: "In Progress",
    OPEN_DEAL: "Open Deal", UNQUALIFIED: "Unqualified",
    ATTEMPTED_TO_CONTACT: "Attempted to Contact",
    CONNECTED: "Connected",
  };

  // Resolve a raw property value to a human-readable name
  function resolveValue(propName: string, rawVal: string, objectType?: string): string {
    if (!rawVal) return rawVal;
    // Template variables
    if (/\{\{.*\}\}/.test(rawVal)) {
      const fetched = rawVal.match(/\{\{\s*fetched_objects\.fetched_object_\w+\.(\w+)\s*\}\}/);
      if (fetched) return `Fetched ${fetched[1].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`;
      const enrolled = rawVal.match(/\{\{\s*enrolled_object\.(\w+)\s*\}\}/);
      if (enrolled) return `Record ${enrolled[1].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`;
      return "Dynamic value";
    }
    // Pipeline stages — check by ID first, then by display order (scoped to object type)
    if (/pipeline.?stage|dealstage|hs_pipeline_stage/i.test(propName)) {
      if (stageLookup.has(rawVal)) return stageLookup.get(rawVal)!;
      // Check display order for the specific object type, then fall back to any
      if (objectType && stageOrderByType.has(objectType)) {
        const orderMap = stageOrderByType.get(objectType)!;
        if (orderMap.has(rawVal)) return orderMap.get(rawVal)!;
      }
      for (const [, orderMap] of Array.from(stageOrderByType)) {
        if (orderMap.has(rawVal)) return orderMap.get(rawVal)!;
      }
      return rawVal;
    }
    // Lifecycle stage
    if (/lifecyclestage/i.test(propName)) {
      return lifecycleLookup[rawVal.toLowerCase()] || rawVal;
    }
    // Lead status
    if (/lead.?status/i.test(propName)) {
      return leadStatusLookup[rawVal] || rawVal;
    }
    return rawVal;
  }

  // Build property impact map
  const impactMap = new Map<string, PropertyImpact>();

  // Initialize with key properties
  const objectTypes = objectType ? [objectType] : Object.keys(KEY_PROPERTIES);
  for (const ot of objectTypes) {
    const props = KEY_PROPERTIES[ot] || [];
    for (const p of props) {
      if (propertyName && p.name !== propertyName) continue;
      const key = `${ot}:${p.name}`;
      impactMap.set(key, {
        property: p.name, label: p.label, objectType: ot, critical: p.critical,
        readers: [], writers: [], totalWorkflows: 0, hasConflict: false,
      });
    }
  }

  for (const wf of workflows) {
    const actions = wf.actions as any[];
    if (!actions || !Array.isArray(actions)) continue;
    const wfInfo = { workflowId: wf.id, name: wf.name, status: wf.status, hubspotFlowId: wf.hubspotFlowId };

    for (const action of actions) {
      const atid = action.actionTypeId || "";
      const fields = action.fields || {};
      const propName = fields.property_name || fields.propertyName;

      if (!propName) continue;

      // Determine if read or write
      const isWrite = ["0-5", "0-14", "0-6"].includes(atid) || fields.value !== undefined;

      // Check all object types this property could belong to
      for (const ot of objectTypes) {
        const key = `${ot}:${propName}`;

        // Create entry for non-key properties if specifically queried or if they're touched
        if (!impactMap.has(key)) {
          if (propertyName && propName !== propertyName) continue;
          // Only add discovered properties if they match the workflow's object type
          if (wf.objectType !== ot) continue;
          impactMap.set(key, {
            property: propName, label: propName.replace(/^hs_/, "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            objectType: ot, critical: false,
            readers: [], writers: [], totalWorkflows: 0, hasConflict: false,
          });
        }

        const impact = impactMap.get(key)!;
        // Only associate if workflow matches the object type
        if (wf.objectType !== ot) continue;

        if (isWrite) {
          const val = fields.value;
          const sv = typeof val === "string" ? val : val?.staticValue;
          if (!impact.writers.find(w => w.workflowId === wf.id)) {
            const resolved = sv ? resolveValue(propName, String(sv), wf.objectType) : undefined;
            impact.writers.push({ ...wfInfo, value: resolved ? resolved.slice(0, 100) : undefined });
          }
        } else {
          if (!impact.readers.find(r => r.workflowId === wf.id)) {
            impact.readers.push(wfInfo);
          }
        }
      }
    }

    // Also check enrollment criteria for property reads
    const enrollment = wf.enrollmentCriteria as any;
    if (enrollment?.listFilterBranch) {
      const props = extractEnrollmentProperties(enrollment.listFilterBranch);
      for (const prop of props) {
        for (const ot of objectTypes) {
          if (wf.objectType !== ot) continue;
          const key = `${ot}:${prop}`;
          if (!impactMap.has(key)) {
            impactMap.set(key, {
              property: prop, label: prop.replace(/^hs_/, "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              objectType: ot, critical: false,
              readers: [], writers: [], totalWorkflows: 0, hasConflict: false,
            });
          }
          const impact = impactMap.get(key)!;
          if (!impact.readers.find(r => r.workflowId === wf.id)) {
            impact.readers.push({ workflowId: wf.id, name: wf.name, status: wf.status, hubspotFlowId: wf.hubspotFlowId });
          }
        }
      }
    }
  }

  // Calculate totals and conflicts
  for (const impact of impactMap.values()) {
    const allWfIds = new Set([...impact.readers.map(r => r.workflowId), ...impact.writers.map(w => w.workflowId)]);
    impact.totalWorkflows = allWfIds.size;
    // Conflict if 2+ active workflows write to same property
    const activeWriters = impact.writers.filter(w => w.status === "ACTIVE");
    impact.hasConflict = activeWriters.length > 1;
  }

  // Sort: critical first, then by total workflows, then alphabetical
  const results = [...impactMap.values()]
    .filter(i => i.totalWorkflows > 0)
    .sort((a, b) => {
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      if (a.totalWorkflows !== b.totalWorkflows) return b.totalWorkflows - a.totalWorkflows;
      return a.label.localeCompare(b.label);
    });

  return NextResponse.json({
    properties: results,
    keyProperties: KEY_PROPERTIES,
    totalProperties: results.length,
  });
}

function extractEnrollmentProperties(branch: any): string[] {
  const props: string[] = [];
  if (branch.filters) {
    for (const f of branch.filters) {
      if (f.property) props.push(f.property);
    }
  }
  if (branch.filterBranches) {
    for (const child of branch.filterBranches) {
      props.push(...extractEnrollmentProperties(child));
    }
  }
  return props;
}
