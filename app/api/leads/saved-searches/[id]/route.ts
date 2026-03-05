import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.savedSearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
