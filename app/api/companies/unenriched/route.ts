import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);

  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { enrichedAt: null },
        { enrichedAt: { lt: cutoff } },
      ],
    },
    select: { id: true },
  });

  return NextResponse.json({ ids: companies.map((c) => c.id) });
}
