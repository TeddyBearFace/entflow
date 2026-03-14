// app/api/analyst/sequence/route.ts
import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 60;

const SEQUENCE_SYSTEM_PROMPT = `You are the Entflow Flow Timeline engine — an expert in HubSpot workflow orchestration who maps the exact execution order of automation workflows.

Your job: given a set of HubSpot workflows with their enrollment triggers, actions, and property updates, determine the PRECISE order they execute in a real customer journey. This is not guesswork — you must trace the actual causal chain.

## How to determine order:

### 1. TRACE PROPERTY CHAINS (most important)
- If Workflow A sets "lifecyclestage" to "MQL", and Workflow B enrolls when "lifecyclestage = MQL", then A fires BEFORE B. This is a HARD dependency.
- If Workflow A sets "hs_lead_status" to "Open", and Workflow B enrolls when "hs_lead_status = Open", A → B.
- Track ALL property writes and match them against ALL enrollment criteria. This is the primary sequencing signal.

### 2. TRACE CROSS-ENROLLMENT
- If Workflow A has a "Enroll in workflow" action targeting Workflow B, then A fires BEFORE B.
- This is a direct, explicit dependency.

### 3. TRACE LIST-BASED CHAINS
- If Workflow A adds contacts to List X, and Workflow B enrolls based on List X membership, then A → B.

### 4. TRACE DEAL/TICKET CREATION CHAINS
- If Workflow A creates a Deal, and Workflow B is a Deal-based workflow that enrolls on deal creation, then A → B.
- Same for tickets, companies, etc.

### 5. IDENTIFY INDEPENDENT WORKFLOWS
- Some workflows are truly independent (e.g., two form-based workflows for different forms). Place them at the same position number.
- Don't force a sequence where none exists.

### 6. IDENTIFY ENTRY POINTS
- Form submission triggers = early (these are how contacts enter the system)
- "Contact is created" triggers = early
- Manual enrollment = can be anywhere
- Property-based triggers = depends on what sets that property

## Common HubSpot lifecycle patterns:
- Lead Capture (form, import, API) → Data Enrichment → Lead Scoring → MQL Nurture → SQL/Sales Handoff → Opportunity Management → Close Won → Onboarding → Renewal/Upsell
- Not all portals follow this exact pattern. Derive the actual flow from the data.

## Stage labels to use:
Choose from: "Lead Capture", "Data Enrichment", "Lead Scoring", "Nurture", "Qualification", "Sales Handoff", "Opportunity", "Close Won", "Onboarding", "Retention", "Re-engagement", "Internal Ops", "Notification", "Data Management"
You can also create custom stage labels if the workflow doesn't fit these categories.

## Response format:
Respond ONLY with valid JSON — no markdown, no backticks:
{
  "sequence": [
    {
      "workflowId": "string (the id from input)",
      "position": 1,
      "stage": "string (stage label from above)",
      "triggeredBy": "string or null (id of workflow that DIRECTLY triggers this one via property chain, enrollment action, or list)",
      "triggerReason": "string or null (e.g. 'Sets lifecyclestage to MQL which triggers enrollment')",
      "triggers": ["array of workflow ids this one DIRECTLY triggers"],
      "reasoning": "1 sentence explaining WHY this workflow is at this position, citing specific properties or actions"
    }
  ],
  "lifecycle_summary": "3-4 sentence overview describing the full automation flow, highlighting the main chains and any gaps or issues found"
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflows } = body;

    if (!workflows || !Array.isArray(workflows) || workflows.length === 0) {
      return NextResponse.json(
        { error: "Provide an array of workflows." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured." },
        { status: 500 }
      );
    }

    // Build a rich representation with extracted causal signals
    const workflowSummaries = workflows.map((w: any) => {
      const def = w.definition || {};
      const actions = def.actions || def.steps || w.steps || [];

      // Extract property writes
      const propertyWrites: string[] = [];
      const enrollmentActions: string[] = [];
      const listActions: string[] = [];
      const emailActions: string[] = [];
      const createActions: string[] = [];

      if (Array.isArray(actions)) {
        for (const a of actions) {
          const f = a.fields || {};
          const atid = a.actionTypeId || "";

          // Property sets
          if (atid === "0-5" || f.property_name) {
            const prop = f.property_name || f.propertyName;
            const val = f.value?.staticValue || (typeof f.value === "string" ? f.value : null);
            if (prop) propertyWrites.push(`${prop}${val ? ` = ${val}` : ""}`);
          }

          // Cross-enrollment
          if (atid === "0-9" || f.flow_id) {
            enrollmentActions.push(f.flow_id || f.flowId || "unknown");
          }

          // List adds
          if (atid === "0-11" || f.list_id || f.listId) {
            listActions.push(f.list_id || f.listId || f.staticListId || "unknown");
          }

          // Email sends
          if (atid === "0-4" || (f.content_id && f.content_id !== "0")) {
            emailActions.push(f.content_id || f.contentId || "unknown");
          }

          // Object creation (deals, tickets, companies)
          if (atid === "0-13") createActions.push("deal");
          if (atid === "0-16") createActions.push("ticket");
          if (atid === "0-18") createActions.push("company");
        }
      }

      return {
        id: w.id,
        name: w.name,
        objectType: w.objectType || "contact",
        enrollmentCriteria: w.enrollmentCriteria || def.enrollmentCriteria || "unknown",
        propertyWrites,
        enrollmentActions,
        listActions,
        emailActions,
        createActions,
        actionCount: Array.isArray(actions) ? actions.length : 0,
      };
    });

    const userMessage = `Here are ${workflows.length} HubSpot workflows. Trace the EXACT causal chains between them and determine execution order.

IMPORTANT: Look at each workflow's enrollmentCriteria and match it against other workflows' propertyWrites. If Workflow A writes to a property that Workflow B enrolls on, A must come before B. Also check enrollmentActions for direct cross-enrollment links.

Workflows:
${JSON.stringify(workflowSummaries, null, 2)}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SEQUENCE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[sequence] Anthropic API error:", response.status, errBody);
      return NextResponse.json(
        { error: `AI service error (${response.status})` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.content
      ?.map((b: { type: string; text?: string }) =>
        b.type === "text" ? b.text : ""
      )
      .join("");

    if (!text) {
      return NextResponse.json(
        { error: "Empty response from AI service." },
        { status: 502 }
      );
    }

    const cleaned = text.replace(/```json\s?|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error("[sequence] Failed to parse AI response:", cleaned);
      return NextResponse.json(
        { error: "AI returned malformed JSON. Please retry.", raw: cleaned },
        { status: 502 }
      );
    }

    trackEvent("flow_timeline", { metadata: { workflowCount: workflows.length } });

    return NextResponse.json({ sequence: result });
  } catch (err: unknown) {
    console.error("[sequence] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
