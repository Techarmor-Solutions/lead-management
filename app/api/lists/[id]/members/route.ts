import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST: add contact(s) to list
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: listId } = await params;
  const { contactIds } = await req.json() as { contactIds: string[] };
  if (!contactIds?.length) return NextResponse.json({ error: "contactIds required" }, { status: 400 });

  await prisma.contactListMember.createMany({
    data: contactIds.map((contactId) => ({ listId, contactId })),
    skipDuplicates: true,
  });
  return NextResponse.json({ ok: true });
}

// DELETE: remove a single contact from list  (body: { contactId })
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: listId } = await params;
  const { contactId } = await req.json();
  await prisma.contactListMember.deleteMany({ where: { listId, contactId } });
  return NextResponse.json({ ok: true });
}
