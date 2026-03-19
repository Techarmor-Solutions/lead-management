import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, value, notes, closeDate, columnId, position } = body;

    // If column is changing, update stage history
    if (columnId !== undefined) {
      const current = await prisma.deal.findUnique({ where: { id }, select: { columnId: true } });
      if (current && current.columnId !== columnId) {
        const now = new Date();
        // Close the current open history entry
        await prisma.dealStageHistory.updateMany({
          where: { dealId: id, exitedAt: null },
          data: { exitedAt: now },
        });
        // Open a new history entry for the new column
        await prisma.dealStageHistory.create({
          data: { dealId: id, columnId, enteredAt: now },
        });
      }
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(value !== undefined && { value: value === "" || value === null ? null : parseFloat(value) }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(closeDate !== undefined && { closeDate: closeDate ? new Date(closeDate) : null }),
        ...(columnId !== undefined && { columnId }),
        ...(position !== undefined && { position }),
      },
      include: dealInclude,
    });

    return NextResponse.json({ deal });
  } catch (error) {
    console.error("PUT /api/deals/[id]:", error);
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.deal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deals/[id]:", error);
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
  }
}
