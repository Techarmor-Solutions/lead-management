import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json({ error: "contactId required" }, { status: 400 });
    }

    const dc = await prisma.dealContact.create({
      data: { dealId, contactId },
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
    });

    return NextResponse.json({ dealContact: dc }, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals/[id]/contacts:", error);
    return NextResponse.json({ error: "Failed to add contact" }, { status: 500 });
  }
}
