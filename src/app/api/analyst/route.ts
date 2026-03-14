// app/api/analyst/route.ts
import { trackEvent } from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";
import {
  ANALYST_SYSTEM_PROMPT,
  buildAnalystUserMessage,
} from "@/lib/analyst-prompt";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel timeout — generous for AI call

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, objectType, enrollmentCriteria, rawJson, steps } =
      body;

    if (!rawJson && (!steps || steps.length === 0)) {
      return NextResponse.json(
        { error: "Provide either rawJson or structured steps." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log("[analyst] key starts with:", apiKey?.slice(0, 15));
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured." },
        { status: 500 }
      );
    }

    const userMessage = buildAnalystUserMessage({
      name,
      description,
      objectType,
      enrollmentCriteria,
      rawJson,
      steps,
    });

    const requestBody = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: ANALYST_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    };
    console.log("[analyst] sending model:", requestBody.model);
    console.log("[analyst] key starts with:", apiKey?.slice(0, 15));
    console.log("[analyst] key length:", apiKey?.length);
console.log("[analyst] key ends with:", JSON.stringify(apiKey?.slice(-5)));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[analyst] Anthropic API error:", response.status, errBody);
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

    // Strip markdown fences if present
    const cleaned = text.replace(/```json\s?|```/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("[analyst] Failed to parse AI response:", cleaned);
      return NextResponse.json(
        { error: "AI returned malformed JSON. Please retry.", raw: cleaned },
        { status: 502 }
      );
    }

    trackEvent("ai_analysis", { portalId: body.portalId });

    return NextResponse.json({ analysis });
  } catch (err: unknown) {
    console.error("[analyst] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
