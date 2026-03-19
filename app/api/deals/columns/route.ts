import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const maxPos = await prisma.pipelineColumn.aggregate({ _max: { position: true } });
    const position = (maxPos._max.position ?? -1) + 1;

    const column = await prisma.pipelineColumn.create({
      data: { name, color: color || "#3b82f6", position, isClosedStage: body.isClosedStage ?? false },
      include: { deals: true },
    });

    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals/columns:", error);
    return NextResponse.json({ error: "Failed to create column" }, { status: 500 });
  }
}
