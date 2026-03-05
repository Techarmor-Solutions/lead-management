import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pollForReplies } from "@/lib/gmail";

export async function POST() {
  // Get all active campaign contacts that were sent to
  const activeSends = await prisma.send.findMany({
    where: {
      sentAt: { not: null },
      respondedAt: null,
      status: { in: ["SENT", "OPENED", "CLICKED"] },
    },
    include: { contact: { select: { id: true, email: true } } },
    distinct: ["contactId"],
  });

  if (activeSends.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, replied: 0 });
  }

  const emails = activeSends
    .map((s) => s.contact.email)
    .filter((e) => e && e.includes("@"));

  const repliedEmails = await pollForReplies(emails);

  let repliedCount = 0;

  for (const email of repliedEmails) {
    const contact = await prisma.contact.findFirst({ where: { email } });
    if (!contact) continue;

    // Mark all pending/scheduled sends for this contact as responded/cancelled
    await prisma.send.updateMany({
      where: {
        contactId: contact.id,
        status: { in: ["PENDING", "SCHEDULED", "SENT", "OPENED", "CLICKED"] },
        respondedAt: null,
      },
      data: {
        respondedAt: new Date(),
        status: "RESPONDED",
      },
    });

    // Update contact status
    await prisma.contact.update({
      where: { id: contact.id },
      data: { status: "RESPONDED" },
    });

    repliedCount++;
  }

  return NextResponse.json({ ok: true, checked: emails.length, replied: repliedCount });
}
