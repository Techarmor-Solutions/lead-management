import { NextResponse } from "next/server";
import { runProcessScheduled } from "@/lib/jobs";

export async function POST() {
  const result = await runProcessScheduled();
  return NextResponse.json({ ok: true, ...result });
}
