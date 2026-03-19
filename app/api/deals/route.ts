import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_COLUMNS = [
  { name: "Prospect", color: "#3b82f6", position: 0, isClosedStage: false },
  { name: "Proposal Sent", color: "#f59e0b", position: 1, isClosedStage: false },
  { name: "Closed Won", color: "#10b981", position: 2, isClosedStage: true },
];

const dealInclude = {
  contacts: {
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: { select: { name: true } },
        },
      },
    },
  },
  stageHistory: {
    orderBy: { enteredAt: "asc" as const },
    include: {
      column: { select: { name: true, color: true, isClosedStage: true } },
    },
  },
};

export async function GET() {
  try {
    let columns = await prisma.pipelineColumn.findMany({
      orderBy: { position: "asc" },
      include: { deals: { orderBy: { position: "asc" }, include: dealInclude } },
    });

    if (columns.length === 0) {
      await prisma.pipelineColumn.createMany({ data: DEFAULT_COLUMNS });
      columns = await prisma.pipelineColumn.findMany({
        orderBy: { position: "asc" },
        include: { deals: { orderBy: { position: "asc" }, include: dealInclude } },
      });
    }

    return NextResponse.json({ columns });
  } catch (error) {
    console.error("GET /api/deals:", error);
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, value, notes, closeDate, columnId } = body;

    if (!title || !columnId) {
      return NextResponse.json({ error: "title and columnId required" }, { status: 400 });
    }

    const maxPos = await prisma.deal.aggregate({
      where: { columnId },
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    const deal = await prisma.deal.create({
      data: {
        title,
        value: value ? parseFloat(value) : null,
        notes: notes || null,
        closeDate: closeDate ? new Date(closeDate) : null,
        columnId,
        position,
        stageHistory: { create: { columnId } },
      },
      include: dealInclude,
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals:", error);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
