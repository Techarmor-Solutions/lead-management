import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const searches = await prisma.savedSearch.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(searches);
}

export async function POST(req: NextRequest) {
  const { name, query, filters } = await req.json();
  const search = await prisma.savedSearch.create({
    data: { name, query, filters: filters || {} },
  });
  return NextResponse.json(search);
}
