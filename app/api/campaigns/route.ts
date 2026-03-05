import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { steps: true, sends: true } } },
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const { name, industry, status, contactIds, steps } = await req.json();

  const campaign = await prisma.campaign.create({
    data: {
      name,
      industry: industry || "",
      status: status || "DRAFT",
      steps: {
        create: steps.map((step: { label: string; delayDays: number; subject: string; body: string }, i: number) => ({
          stepNumber: i + 1,
          label: step.label,
          delayDays: i === 0 ? 0 : step.delayDays,
          subject: step.subject,
          body: step.body,
        })),
      },
    },
    include: { steps: true },
  });

  // Create pending send records for each contact × step
  const sendData = [];
  for (const contactId of contactIds) {
    for (const step of campaign.steps) {
      sendData.push({
        campaignId: campaign.id,
        contactId,
        stepId: step.id,
      });
    }
  }

  if (sendData.length > 0) {
    await prisma.send.createMany({ data: sendData, skipDuplicates: true });
  }

  // Update contact status to CONTACTED (will be done at send time, but mark now)
  return NextResponse.json(campaign);
}
