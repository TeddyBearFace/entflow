import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Pages that don't require auth
const PUBLIC_ROUTES = [
  "/",
  "/landing",
  "/login",
  "/register",
  "/pricing",
  "/features",
  "/documentation",
  "/api/auth",
  "/api/webhooks",
  "/api/cron",
  "/api/debug",
  "/admin",
  "/api/admin",
  "/api/sync",
  "/api/sync-status",
  "/welcome",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for NextAuth session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // Not logged in — redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated — allow through
  // Portal-level access checks happen in API routes / server components via validatePortalAccess()
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
