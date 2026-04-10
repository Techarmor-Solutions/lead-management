import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, getGmailSignature } from "@/lib/gmail";
import { applyPersonalizationTags, buildEmailHtml, htmlToPlainText } from "@/lib/utils";
import { generateToken, injectTracking, extractLinks } from "@/lib/tracking";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id, stepId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, status: true, sentAt: true },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["ACTIVE", "SENDING"].includes(campaign.status)) {
    return NextResponse.json({ error: "Campaign must be active" }, { status: 400 });
  }

  const step = await prisma.campaignStep.findUnique({ where: { id: stepId } });
  if (!step || step.campaignId !== id) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }
  if (step.stepType !== "EMAIL") {
    return NextResponse.json({ error: "Only email steps can be force-sent" }, { status: 400 });
  }

  const scheduledSends = await prisma.send.findMany({
    where: { campaignId: id, stepId, status: "SCHEDULED" },
    include: { contact: { include: { company: true } } },
  });

  if (scheduledSends.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No scheduled sends for this step" });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const agencyProfile = await prisma.agencyProfile.findFirst();
  const senderName = agencyProfile?.name || "Caleb";
  const signature = await getGmailSignature();

  let sent = 0;

  for (const send of scheduledSends) {
    const { contact } = send;

    // Skip if contact has already responded in this campaign
    const responded = await prisma.send.findFirst({
      where: { contactId: contact.id, campaignId: id, status: "RESPONDED" },
    });
    if (responded) {
      await prisma.send.update({ where: { id: send.id }, data: { status: "CANCELLED" } });
      continue;
    }

    const subject = applyPersonalizationTags(step.subject, contact, contact.company, senderName);
    const bodyHtml = applyPersonalizationTags(step.body, contact, contact.company, senderName);
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?cid=${contact.id}`;
    const fullHtml = buildEmailHtml(bodyHtml, step.ctaText, step.ctaUrl, unsubscribeUrl, signature);

    const openToken = generateToken();
    const links = extractLinks(fullHtml);
    const clickTokenMap = new Map<string, string>();
    for (const link of links) clickTokenMap.set(link, generateToken());

    await prisma.trackingToken.create({ data: { token: openToken, sendId: send.id, type: "OPEN" } });
    for (const [url, token] of clickTokenMap) {
      await prisma.trackingToken.create({ data: { token, sendId: send.id, type: "CLICK", url } });
    }

    const trackedHtml = injectTracking(fullHtml, openToken, clickTokenMap, appUrl);

    try {
      await sendEmail({
        to: contact.email,
        subject,
        htmlBody: trackedHtml,
        textBody: htmlToPlainText(fullHtml),
      });
      await prisma.send.update({ where: { id: send.id }, data: { status: "SENT", sentAt: new Date() } });
      sent++;
    } catch (err) {
      await prisma.send.update({
        where: { id: send.id },
        data: { status: "FAILED", errorMsg: String(err) },
      });
    }
  }

  return NextResponse.json({ ok: true, sent });
}
