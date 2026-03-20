import { prisma } from "./db";
import { pollForReplies, sendEmail } from "./gmail";
import { applyPersonalizationTags, buildEmailHtml, htmlToPlainText } from "./utils";
import { generateToken, injectTracking, extractLinks } from "./tracking";

export async function runPollReplies(): Promise<{ checked: number; replied: number }> {
  const activeSends = await prisma.send.findMany({
    where: {
      sentAt: { not: null },
      respondedAt: null,
      status: { in: ["SENT", "OPENED", "CLICKED"] },
    },
    include: { contact: { select: { id: true, email: true } } },
    distinct: ["contactId"],
  });

  if (activeSends.length === 0) return { checked: 0, replied: 0 };

  const emails = activeSends
    .map((s) => s.contact.email)
    .filter((e) => e && e.includes("@"));

  const repliedEmails = await pollForReplies(emails);
  let replied = 0;

  for (const email of repliedEmails) {
    const contact = await prisma.contact.findFirst({ where: { email } });
    if (!contact) continue;

    await prisma.send.updateMany({
      where: {
        contactId: contact.id,
        status: { in: ["PENDING", "SCHEDULED", "SENT", "OPENED", "CLICKED"] },
        respondedAt: null,
      },
      data: { respondedAt: new Date(), status: "RESPONDED" },
    });

    await prisma.contact.update({
      where: { id: contact.id },
      data: { status: "RESPONDED" },
    });

    replied++;
  }

  return { checked: emails.length, replied };
}

export async function runProcessScheduled(): Promise<{ processed: number }> {
  const now = new Date();
  let processed = 0;

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  for (const campaign of activeCampaigns) {
    const sentAt = campaign.sentAt;
    if (!sentAt) continue;

    for (const send of campaign.sends) {
      const stepsSoFar = await prisma.campaignStep.findMany({
        where: { campaignId: campaign.id, stepNumber: { lte: send.step.stepNumber } },
        orderBy: { stepNumber: "asc" },
      });

      const totalDelayDays = stepsSoFar.reduce((sum, s) => sum + s.delayDays, 0);
      const sendTime = new Date(sentAt.getTime() + totalDelayDays * 24 * 60 * 60 * 1000);
      if (now < sendTime) continue;

      const responded = await prisma.send.findFirst({
        where: { contactId: send.contactId, campaignId: campaign.id, status: "RESPONDED" },
      });
      if (responded) {
        await prisma.send.update({ where: { id: send.id }, data: { status: "CANCELLED" } });
        continue;
      }

      const { contact, step } = send;
      const subject = applyPersonalizationTags(step.subject, contact, contact.company, senderName);
      const bodyHtml = applyPersonalizationTags(step.body, contact, contact.company, senderName);

      const unsubscribeUrl = `${appUrl}/api/unsubscribe?cid=${contact.id}`;
      const fullHtml = buildEmailHtml(bodyHtml, step.ctaText, step.ctaUrl, unsubscribeUrl);

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
        await sendEmail({ to: contact.email, subject, htmlBody: trackedHtml, textBody: htmlToPlainText(fullHtml) });
        await prisma.send.update({ where: { id: send.id }, data: { status: "SENT", sentAt: new Date() } });
        processed++;
      } catch (err) {
        await prisma.send.update({ where: { id: send.id }, data: { status: "FAILED", errorMsg: String(err) } });
      }
    }
  }

  return { processed };
}
