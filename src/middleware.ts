import { NextRequest, NextResponse } from "next/server";

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

export function middleware(req: NextRequest) {
  // Don't gate the login page or login API
  if (req.nextUrl.pathname === "/admin/login" || req.nextUrl.pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get("admin_token")?.value;
  if (token === process.env.ADMIN_TOKEN) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
