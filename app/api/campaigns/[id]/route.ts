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
    await prisma.campaignStep.deleteMany({ where: { campaignId: id } });
    await prisma.campaignStep.createMany({
      data: data.steps.map(
        (step: { label: string; stepType: string; delayDays: number; subject: string; body: string }, i: number) => ({
          campaignId: id,
          stepNumber: i + 1,
          stepType: step.stepType || "EMAIL",
          label: step.label,
          delayDays: i === 0 ? 0 : step.delayDays,
          subject: step.subject || "",
          body: step.body || "",
        })
      ),
    });
  }

  return NextResponse.json(campaign);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
