import { prisma } from "@/lib/db";
import CompanyList from "./CompanyList";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    industry?: string;
    page?: string;
    dateFrom?: string;
    dateTo?: string;
    enriched?: string;
  }>;
}) {
  const { search = "", industry = "", page = "1", dateFrom = "", dateTo = "", enriched = "" } = await searchParams;
  const pageNum = parseInt(page);
  const limit = 20;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }
  if (industry) {
    where.industry = { equals: industry, mode: "insensitive" };
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
    };
  }
  if (enriched === "yes") where.enrichedAt = { not: null };
  if (enriched === "no") where.enrichedAt = null;

  const [companies, total, industries, profile] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limit,
      take: limit,
      include: { _count: { select: { contacts: true } } },
    }),
    prisma.company.count({ where }),
    prisma.company.findMany({
      where: { industry: { not: "" } },
      select: { industry: true },
      distinct: ["industry"],
      orderBy: { industry: "asc" },
    }),
    prisma.agencyProfile.findFirst({ select: { categories: true } }),
  ]);

  const industryOptions = industries.map((i) => i.industry);
  const categories = profile?.categories || [];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="text-zinc-500 text-sm mt-1">{total} companies saved</p>
        </div>
        <a
          href="/api/companies/export"
          className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Export CSV
        </a>
      </div>
      <CompanyList
        companies={companies}
        total={total}
        page={pageNum}
        limit={limit}
        search={search}
        industryFilter={industry}
        industryOptions={industryOptions}
        categories={categories}
        dateFrom={dateFrom}
        dateTo={dateTo}
        enrichedFilter={enriched}
      />
    </div>
  );
}
