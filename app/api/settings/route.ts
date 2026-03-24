import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const profile = await prisma.agencyProfile.findFirst();
  return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const existing = await prisma.agencyProfile.findFirst();

  const upsertData = {
    name: data.name,
    services: data.services || [],
    valueProposition: data.valueProposition || "",
    targetIndustries: data.targetIndustries || [],
    targetCompanySize: data.targetCompanySize || "",
    painPoints: data.painPoints || [],
    targetGeography: data.targetGeography || [],
    additionalNotes: data.additionalNotes || "",
    categories: data.categories || [],
  };

  const profile = existing
    ? await prisma.agencyProfile.update({ where: { id: existing.id }, data: upsertData })
    : await prisma.agencyProfile.create({ data: upsertData });

  return NextResponse.json(profile);
}
