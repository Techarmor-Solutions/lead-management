import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/gmail";
import { applyPersonalizationTags, } from "@/lib/utils";
import { generateToken, injectTracking, extractLinks, TRACKING_PIXEL } from "@/lib/tracking";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      sends: {
        where: { status: "PENDING" },
        include: {
          contact: { include: { company: true } },
          step: true,
        },
      },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status !== "APPROVED") {
    return NextResponse.json({ error: "Campaign must be approved first" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const agencyProfile = await prisma.agencyProfile.findFirst();
  const senderName = agencyProfile?.name || "Caleb";

  // Update campaign status
  await prisma.campaign.update({
    where: { id },
    data: { status: "ACTIVE", sentAt: new Date() },
  });

  // Group sends by contact, sort by step number
  // For step 1 (delayDays = 0): send now
  // For subsequent steps: schedule via pg-boss (simplified: we just schedule them here)
  const step1Sends = campaign.sends.filter((s) => s.step.stepNumber === 1);
  const laterSends = campaign.sends.filter((s) => s.step.stepNumber > 1);

  // Send step 1 immediately (throttled: spread across time)
  let sendCount = 0;
  for (const send of step1Sends) {
    const { contact, step } = send;

    const subject = applyPersonalizationTags(step.subject, contact, contact.company, senderName);
    const bodyText = applyPersonalizationTags(step.body, contact, contact.company, senderName);

    // Create tracking tokens
    const openToken = generateToken();
    const links = extractLinks(bodyText);
    const clickTokenMap = new Map<string, string>();

    for (const link of links) {
      clickTokenMap.set(link, generateToken());
    }

    // Store tracking tokens
    await prisma.trackingToken.create({
      data: { token: openToken, sendId: send.id, type: "OPEN" },
    });
    for (const [url, token] of clickTokenMap) {
      await prisma.trackingToken.create({
        data: { token, sendId: send.id, type: "CLICK", url },
      });
    }

    // Convert plain text to HTML
    const htmlBody = bodyText
      .split("\n\n")
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");

    const trackedHtml = injectTracking(htmlBody, openToken, clickTokenMap, appUrl);

    try {
      await sendEmail({
        to: contact.email,
        subject,
        htmlBody: trackedHtml,
        textBody: bodyText,
      });

      await prisma.send.update({
        where: { id: send.id },
        data: { status: "SENT", sentAt: new Date() },
      });

      await prisma.contact.update({
        where: { id: contact.id },
        data: { status: "CONTACTED" },
      });

      sendCount++;
    } catch (err) {
      await prisma.send.update({
        where: { id: send.id },
        data: { status: "FAILED", errorMsg: String(err) },
      });
    }

    // Small delay between sends to protect domain health
    if (sendCount % 5 === 0) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Mark later steps as SCHEDULED (they'll be processed by the scheduler)
  for (const send of laterSends) {
    await prisma.send.update({
      where: { id: send.id },
      data: { status: "SCHEDULED" },
    });
  }

  return NextResponse.json({ ok: true, sent: sendCount });
}
