import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const lists = await prisma.contactList.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true, companyMembers: true } } },
  });
  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const list = await prisma.contactList.create({
    data: { name: name.trim(), description: description?.trim() || "" },
  });
  return NextResponse.json(list);
}
