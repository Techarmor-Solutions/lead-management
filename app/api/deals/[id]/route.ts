import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, value, notes, columnId, position } = body;

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(value !== undefined && { value: value === "" || value === null ? null : parseFloat(value) }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(columnId !== undefined && { columnId }),
        ...(position !== undefined && { position }),
      },
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
