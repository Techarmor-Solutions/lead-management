import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { matchCategory } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") || "";
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 20;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { industry: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { contacts: true } } },
    }),
    prisma.company.count({ where }),
  ]);

  return NextResponse.json({ companies, total, page, limit });
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  const profile = await prisma.agencyProfile.findFirst({ select: { categories: true } });
  const categories = profile?.categories || [];
  const resolvedIndustry = matchCategory(data.industry || "", categories);

  // Manual company (no placeId): always create a new record
  if (!data.placeId) {
    const company = await prisma.company.create({
      data: {
        name: data.name,
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
        phone: data.phone || "",
        website: data.website || "",
        industry: resolvedIndustry,
        notes: data.notes || "",
        source: "manual",
      },
    });
    return NextResponse.json(company);
  }

  // Google Places company: upsert by placeId
  const company = await prisma.company.upsert({
    where: { placeId: data.placeId },
    update: {
      name: data.name,
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      phone: data.phone || "",
      website: data.website || "",
      industry: resolvedIndustry,
      rating: data.rating,
      totalRatings: data.totalRatings,
    },
    create: {
      name: data.name,
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      phone: data.phone || "",
      website: data.website || "",
      industry: resolvedIndustry,
      rating: data.rating,
      totalRatings: data.totalRatings,
      placeId: data.placeId,
    },
  });

  return NextResponse.json(company);
}
