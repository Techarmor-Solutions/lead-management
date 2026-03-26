import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const contactId = req.nextUrl.searchParams.get("contactId");
  const includeDone = req.nextUrl.searchParams.get("includeDone") === "true";

  const where: Record<string, unknown> = {};
  if (contactId) where.contactId = contactId;
  if (!includeDone) where.completedAt = null;

  const tasks = await prisma.manualTask.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } } },
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  if (!data.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const task = await prisma.manualTask.create({
    data: {
      title: data.title.trim(),
      type: data.type || "TASK",
      description: data.description || "",
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      contactId: data.contactId || null,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } } },
    },
  });

  return NextResponse.json(task);
}
