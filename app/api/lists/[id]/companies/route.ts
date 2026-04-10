import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST { companyIds: string[] } — add companies to a list and sync their existing contacts
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: listId } = await params;
  const { companyIds } = await req.json() as { companyIds: string[] };

  if (!companyIds?.length) {
    return NextResponse.json({ error: "companyIds required" }, { status: 400 });
  }

  // Add companies to the list (ignore duplicates)
  await prisma.companyListMember.createMany({
    data: companyIds.map((companyId) => ({ listId, companyId })),
    skipDuplicates: true,
  });

  // For each company, sync all existing contacts into the list too
  let contactsAdded = 0;
  for (const companyId of companyIds) {
    const contacts = await prisma.contact.findMany({
      where: { companyId },
      select: { id: true },
    });
    if (contacts.length > 0) {
      const result = await prisma.contactListMember.createMany({
        data: contacts.map((c) => ({ listId, contactId: c.id })),
        skipDuplicates: true,
      });
      contactsAdded += result.count;
    }
  }

  return NextResponse.json({ ok: true, companiesAdded: companyIds.length, contactsAdded });
}

// DELETE { companyId: string } — remove a company from the list and remove its contacts too
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: listId } = await params;
  const { companyId } = await req.json() as { companyId: string };

  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  // Get all contact IDs for this company
  const contacts = await prisma.contact.findMany({
    where: { companyId },
    select: { id: true },
  });

  // Remove their list memberships
  if (contacts.length > 0) {
    await prisma.contactListMember.deleteMany({
      where: { listId, contactId: { in: contacts.map((c) => c.id) } },
    });
  }

  // Remove the company itself from the list
  await prisma.companyListMember.deleteMany({
    where: { listId, companyId },
  });

  return NextResponse.json({ ok: true });
}
