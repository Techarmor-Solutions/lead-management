import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const send = await prisma.send.findUnique({ where: { id }, include: { step: true } });
  if (!send) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.send.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
  });

  // Update contact status based on task type
  const statusMap: Record<string, string> = {
    CALL: "CONTACTED",
    LINKEDIN_CONNECT: "CONTACTED",
    LINKEDIN_MESSAGE: "CONTACTED",
  };
  const newStatus = statusMap[send.step.stepType];
  if (newStatus) {
    const contact = await prisma.contact.findUnique({ where: { id: send.contactId } });
    if (contact && contact.status === "NEW") {
      await prisma.contact.update({ where: { id: send.contactId }, data: { status: "CONTACTED" } });
    }
  }

  return NextResponse.json({ ok: true });
}
