import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    nextauthUrl: process.env.NEXTAUTH_URL || "NOT SET",
    hasDbUrl: !!process.env.DATABASE_URL,
    dbHost: process.env.DATABASE_URL?.match(/@([^/]+)/)?.[1] || "NOT SET",
  });
}