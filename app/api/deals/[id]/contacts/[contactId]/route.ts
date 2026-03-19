import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id: dealId, contactId } = await params;

    await prisma.dealContact.deleteMany({ where: { dealId, contactId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deals/[id]/contacts/[contactId]:", error);
    return NextResponse.json({ error: "Failed to remove contact" }, { status: 500 });
  }
}
