import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.savedSearch.update({
    where: { id },
    data: { lastRunAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
