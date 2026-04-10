import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { placeIds } = await req.json();
  if (!Array.isArray(placeIds) || placeIds.length === 0) {
    return NextResponse.json({ savedIds: [] });
  }

  const companies = await prisma.company.findMany({
    where: { placeId: { in: placeIds } },
    select: { id: true, placeId: true },
  });

  return NextResponse.json({
    savedIds: companies.map((c) => c.placeId),
    // placeId → DB id map so the UI can add pre-saved companies to lists
    idMap: Object.fromEntries(companies.map((c) => [c.placeId, c.id])),
  });
}
