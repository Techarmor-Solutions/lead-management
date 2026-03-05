import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/gmail";
import { applyPersonalizationTags } from "@/lib/utils";
import { generateToken, injectTracking, extractLinks } from "@/lib/tracking";

// Called by node-cron every hour to process due follow-up steps
export async function POST() {
  const now = new Date();
  let processed = 0;

  // Find all active campaigns with scheduled sends
  const activeCampaigns = await prisma.campaign.findMany({
    where: { status: "ACTIVE" },
    include: {
      sends: {
        where: { status: "SCHEDULED" },
        include: {
          contact: { include: { company: true } },
          step: true,
        },
      },
    },
  });

  const agencyProfile = await prisma.agencyProfile.findFirst();
  const senderName = agencyProfile?.name || "Caleb";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const campaign of activeCampaigns) {
    // Get campaign send start time
    const sentAt = campaign.sentAt;
    if (!sentAt) continue;

    for (const send of campaign.sends) {
      // Calculate when this step should send
      // Cumulative delay: sum of all previous step delays
      const stepsSoFar = await prisma.campaignStep.findMany({
        where: { campaignId: campaign.id, stepNumber: { lte: send.step.stepNumber } },
        orderBy: { stepNumber: "asc" },
      });

      const totalDelayDays = stepsSoFar.reduce((sum, s) => sum + s.delayDays, 0);
      const sendTime = new Date(sentAt.getTime() + totalDelayDays * 24 * 60 * 60 * 1000);

      if (now < sendTime) continue; // Not due yet

      // Check contact hasn't responded
      const responded = await prisma.send.findFirst({
        where: {
          contactId: send.contactId,
          campaignId: campaign.id,
          status: "RESPONDED",
        },
      });
      if (responded) {
        await prisma.send.update({ where: { id: send.id }, data: { status: "CANCELLED" } });
        continue;
      }

      const { contact, step } = send;
      const subject = applyPersonalizationTags(step.subject, contact, contact.company, senderName);
      const bodyText = applyPersonalizationTags(step.body, contact, contact.company, senderName);

      const openToken = generateToken();
      const links = extractLinks(bodyText);
      const clickTokenMap = new Map<string, string>();
      for (const link of links) {
        clickTokenMap.set(link, generateToken());
      }

      await prisma.trackingToken.create({
        data: { token: openToken, sendId: send.id, type: "OPEN" },
      });
      for (const [url, token] of clickTokenMap) {
        await prisma.trackingToken.create({
          data: { token, sendId: send.id, type: "CLICK", url },
        });
      }

      const htmlBody = bodyText
        .split("\n\n")
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("");
      const trackedHtml = injectTracking(htmlBody, openToken, clickTokenMap, appUrl);

      try {
        await sendEmail({ to: contact.email, subject, htmlBody: trackedHtml, textBody: bodyText });
        await prisma.send.update({
          where: { id: send.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        processed++;
      } catch (err) {
        await prisma.send.update({
          where: { id: send.id },
          data: { status: "FAILED", errorMsg: String(err) },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, processed });
}
