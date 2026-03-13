// app/api/analyst/sequence/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SEQUENCE_SYSTEM_PROMPT = `You are the Entflow AI Workflow Sequencer — an expert in HubSpot workflow orchestration and customer lifecycle mapping.

You receive a list of HubSpot workflows with their enrollment triggers, steps, and property updates. Your job is to determine the logical trigger order — i.e. how these workflows relate to each other in a customer's journey through the CRM.

## Rules:
- Workflow A comes BEFORE Workflow B if A's actions (property changes, lifecycle updates, etc.) could trigger B's enrollment criteria.
- If workflows are independent (no causal link), group them by lifecycle stage or funnel position.
- Consider common HubSpot patterns: lead capture → nurture → MQL → SQL → opportunity → customer → onboarding → renewal.
- If a workflow sets a lifecycle stage or deal stage that another workflow enrolls on, that's a direct causal chain.
- Form submission triggers typically come early in the funnel.
- Re-engagement and win-back workflows come late.

## Response format:
Respond ONLY with valid JSON — no markdown, no backticks:
{
  "sequence": [
    {
      "workflowId": "string (the id from input)",
      "position": 1,
      "stage": "string (e.g. 'Lead Capture', 'Nurture', 'Qualification', 'Sales Handoff', 'Onboarding', 'Retention')",
      "triggeredBy": "string or null (id of workflow that likely triggers this one)",
      "triggers": ["array of workflow ids this one likely triggers"],
      "reasoning": "1 sentence explaining placement"
    }
  ],
  "lifecycle_summary": "2-3 sentence overview of the full automation flow"
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

    // Build a compact representation for the AI
    const workflowSummaries = workflows.map((w: any) => ({
      id: w.id,
      name: w.name,
      objectType: w.objectType || "contact",
      enrollmentCriteria: w.enrollmentCriteria || "unknown",
      description: w.description || "",
      steps: (w.definition?.steps || w.steps || []).map((s: any) => ({
        type: s.type,
        name: s.name,
        config: s.config || {},
      })),
    }));

    const userMessage = `Here are ${workflows.length} HubSpot workflows. Determine their logical trigger order in the customer lifecycle:\n\n${JSON.stringify(workflowSummaries, null, 2)}`;

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

    return NextResponse.json({ sequence: result });
  } catch (err: unknown) {
    console.error("[sequence] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
