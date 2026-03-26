import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Status rank — higher = further along the pipeline
const STATUS_RANK: Record<string, number> = {
  NEW: 0,
  CONTACTED: 1,
  RESPONDED: 2,
  QUALIFIED: 3,
  CLOSED: 4,
  NOT_INTERESTED: -1, // always apply when triggered
  DO_NOT_CONTACT: -1, // always apply when triggered
};

// What status each outcome should move the contact to
const OUTCOME_STATUS: Record<string, string> = {
  "Left voicemail":     "CONTACTED",
  "No answer":          "CONTACTED",
  "Connected":          "RESPONDED",
  "Callback requested": "RESPONDED",
  "Not interested":     "NOT_INTERESTED",
  "Interested":         "QUALIFIED",
  "Converted":          "CLOSED",
};

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

  const [activity, contact] = await Promise.all([
    prisma.activity.create({
      data: {
        contactId,
        type,
        date: date ? new Date(date + "T12:00:00") : new Date(),
        notes: notes || "",
        outcome: outcome || "",
      },
    }),
    prisma.contact.findUnique({ where: { id: contactId }, select: { status: true } }),
  ]);

  // Auto-advance status based on outcome
  const targetStatus = outcome ? OUTCOME_STATUS[outcome] : null;
  if (targetStatus && contact) {
    const currentRank = STATUS_RANK[contact.status] ?? 0;
    const targetRank = STATUS_RANK[targetStatus] ?? 0;
    // Always apply negative-rank statuses (NOT_INTERESTED); for pipeline statuses only move forward
    const shouldUpdate = targetRank === -1 || targetRank > currentRank;
    if (shouldUpdate) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { status: targetStatus as never },
      });
    }
  }

  return NextResponse.json({ ...activity, newStatus: targetStatus ?? null });
}
