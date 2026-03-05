import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const stored = process.env.ADMIN_PASSWORD;
  if (!stored) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_PASSWORD not set" },
      { status: 500 }
    );
  }

  // Constant-time comparison prevents timing attacks
  let valid = false;
  try {
    valid = timingSafeEqual(Buffer.from(password), Buffer.from(stored));
  } catch {
    valid = false; // buffers differ in length
  }

  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
