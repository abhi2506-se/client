import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ADMIN_ONLY_PREFIXES = ["/dashboard/agents", "/dashboard/commission-rules", "/dashboard/audit-logs", "/dashboard/settings"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && req.auth!.user.status === "DISABLED") {
    return NextResponse.redirect(new URL("/login?error=disabled", req.nextUrl.origin));
  }

  if (isLoggedIn && ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (req.auth!.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
