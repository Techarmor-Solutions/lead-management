import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Only protect app routes
  if (req.nextUrl.pathname.startsWith("/api/track")) {
    return res; // tracking pixels are public
  }
  if (
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname === "/login"
  ) {
    return res;
  }

  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  if (!session.isLoggedIn) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
};
