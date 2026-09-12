import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ONLY_PREFIXES = ["/dashboard/agents", "/dashboard/commission-rules", "/dashboard/audit-logs", "/dashboard/settings"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");

  if (!isDashboard) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isLoggedIn = !!token;

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token.status === "DISABLED") {
    return NextResponse.redirect(new URL("/login?error=disabled", req.nextUrl.origin));
  }

  if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
