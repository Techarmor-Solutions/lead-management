import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  const activities = await prisma.activity.findMany({
    where: { contactId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(activities);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  const { type, date, notes, outcome } = await req.json();
  const activity = await prisma.activity.create({
    data: {
      contactId,
      type,
      date: date ? new Date(date + "T12:00:00") : new Date(),
      notes: notes || "",
      outcome: outcome || "",
    },
  });
  return NextResponse.json(activity);
}
