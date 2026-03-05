import { NextRequest, NextResponse } from "next/server";
import { generateCampaignCopy } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { agencyProfile, targetCompany, stepCount } = await req.json();

  const steps = await generateCampaignCopy({
    agencyProfile,
    targetCompany,
    stepCount: stepCount || 3,
  });

  return NextResponse.json({ steps });
}
