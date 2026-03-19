import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_COLUMNS = [
  { name: "Prospect", color: "#3b82f6", position: 0 },
  { name: "Proposal Sent", color: "#f59e0b", position: 1 },
  { name: "Closed Won", color: "#10b981", position: 2 },
];

export async function GET() {
  try {
    let columns = await prisma.pipelineColumn.findMany({
      orderBy: { position: "asc" },
      include: {
        deals: {
          orderBy: { position: "asc" },
          include: {
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
          },
        },
      },
    });

    if (columns.length === 0) {
      await prisma.pipelineColumn.createMany({ data: DEFAULT_COLUMNS });
      columns = await prisma.pipelineColumn.findMany({
        orderBy: { position: "asc" },
        include: {
          deals: {
            orderBy: { position: "asc" },
            include: {
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
            },
          },
        },
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
    const { title, value, notes, columnId } = body;

    if (!title || !columnId) {
      return NextResponse.json({ error: "title and columnId required" }, { status: 400 });
    }

    const maxPos = await prisma.deal.aggregate({
      where: { columnId },
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    const deal = await prisma.deal.create({
      data: { title, value: value ? parseFloat(value) : null, notes: notes || null, columnId, position },
      include: {
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
      },
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals:", error);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
