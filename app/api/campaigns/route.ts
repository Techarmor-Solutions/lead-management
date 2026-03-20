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
  const { name, industry, status, isTemplate, contactIds, steps } = await req.json();

  const campaign = await prisma.campaign.create({
    data: {
      name,
      industry: industry || "",
      status: status || "DRAFT",
      isTemplate: isTemplate || false,
      steps: {
        create: steps.map(
          (step: { label: string; stepType: string; delayDays: number; subject: string; body: string; ctaText?: string; ctaUrl?: string }, i: number) => ({
            stepNumber: i + 1,
            stepType: step.stepType || "EMAIL",
            label: step.label,
            delayDays: i === 0 ? 0 : step.delayDays,
            subject: step.subject || "",
            body: step.body || "",
            ctaText: step.ctaText || null,
            ctaUrl: step.ctaUrl || null,
          })
        ),
      },
    },
    include: { steps: true },
  });

  // Templates have no contacts — skip Send record creation
  if (!isTemplate && contactIds?.length > 0) {
    const emailSteps = campaign.steps.filter((s) => s.stepType === "EMAIL");
    const sendData = [];
    for (const contactId of contactIds) {
      for (const step of emailSteps) {
        sendData.push({ campaignId: campaign.id, contactId, stepId: step.id });
      }
    }
    if (sendData.length > 0) {
      await prisma.send.createMany({ data: sendData, skipDuplicates: true });
    }
  }

  return NextResponse.json(campaign);
}
