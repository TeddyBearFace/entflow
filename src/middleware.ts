import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/landing",
  "/connect",
  "/documentation",
  "/api/",  // All API routes handle their own auth
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const portalCookie = request.cookies.get("entflow_portal");

  if (!portalCookie?.value) {
    // No session — redirect to connect page
    const connectUrl = new URL("/connect", request.url);
    return NextResponse.redirect(connectUrl);
  }

  // For pages that use ?portal= param, inject from cookie if missing
  if (!request.nextUrl.searchParams.get("portal") && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.searchParams.set("portal", portalCookie.value);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image).*)",
  ],
};
