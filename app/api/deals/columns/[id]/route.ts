import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color, position } = body;

    const column = await prisma.pipelineColumn.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(position !== undefined && { position }),
      },
      include: { deals: true },
    });

    return NextResponse.json({ column });
  } catch (error) {
    console.error("PUT /api/deals/columns/[id]:", error);
    return NextResponse.json({ error: "Failed to update column" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.pipelineColumn.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deals/columns/[id]:", error);
    return NextResponse.json({ error: "Failed to delete column" }, { status: 500 });
  }
}
