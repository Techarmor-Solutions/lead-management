import { NextResponse } from "next/server";
import { runPollReplies } from "@/lib/jobs";

export async function POST() {
  const result = await runPollReplies();
  return NextResponse.json({ ok: true, ...result });
}
