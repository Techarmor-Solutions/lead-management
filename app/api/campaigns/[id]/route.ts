import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { steps: { orderBy: { stepNumber: "asc" } }, sends: true },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();

  const updateData: Record<string, unknown> = {};
  if (data.status) updateData.status = data.status;
  if (data.status === "APPROVED") updateData.approvedAt = new Date();
  if (data.name !== undefined) updateData.name = data.name;
  if (data.industry !== undefined) updateData.industry = data.industry;

  const campaign = await prisma.campaign.update({ where: { id }, data: updateData });

  // Replace steps if provided
  if (data.steps) {
    // Collect existing contact IDs from pending sends before deleting steps
    const existingSends = await prisma.send.findMany({
      where: { campaignId: id, status: { in: ["PENDING", "SCHEDULED"] } },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const contactIds = existingSends.map((s) => s.contactId);

    // Delete pending/scheduled sends (they reference old step IDs)
    await prisma.send.deleteMany({ where: { campaignId: id, status: { in: ["PENDING", "SCHEDULED"] } } });

    // Delete and recreate steps
    await prisma.campaignStep.deleteMany({ where: { campaignId: id } });

    type StepInput = { label: string; stepType: string; delayDays: number; subject: string; body: string; ctaText?: string; ctaUrl?: string };
    const newSteps = await Promise.all(
      (data.steps as StepInput[]).map((step, i) =>
        prisma.campaignStep.create({
          data: {
            campaignId: id,
            stepNumber: i + 1,
            stepType: (step.stepType || "EMAIL") as import("@prisma/client").StepType,
            label: step.label,
            delayDays: i === 0 ? 0 : step.delayDays,
            subject: step.subject || "",
            body: step.body || "",
            ctaText: step.ctaText || null,
            ctaUrl: step.ctaUrl || null,
          },
        })
      )
    );

    // Recreate pending sends for email steps
    const emailSteps = newSteps.filter((s) => s.stepType === "EMAIL");
    if (contactIds.length > 0 && emailSteps.length > 0) {
      const sendData = [];
      for (const contactId of contactIds) {
        for (const step of emailSteps) {
          sendData.push({ campaignId: id, contactId, stepId: step.id });
        }
      }
      await prisma.send.createMany({ data: sendData, skipDuplicates: true });
    }
  }

  return NextResponse.json(campaign);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Delete related records in dependency order (Send has no cascade on campaign)
  const sends = await prisma.send.findMany({ where: { campaignId: id }, select: { id: true } });
  const sendIds = sends.map((s) => s.id);
  if (sendIds.length > 0) {
    await prisma.trackingToken.deleteMany({ where: { sendId: { in: sendIds } } });
    await prisma.send.deleteMany({ where: { campaignId: id } });
  }
  await prisma.campaignStep.deleteMany({ where: { campaignId: id } });
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
