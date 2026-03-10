import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const list = await prisma.contactList.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { createdAt: "desc" },
        include: {
          contact: {
            include: { company: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(list);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, description } = await req.json();
  const list = await prisma.contactList.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
    },
  });
  return NextResponse.json(list);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.contactList.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
