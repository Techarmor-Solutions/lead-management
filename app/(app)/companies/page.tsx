import { prisma } from "@/lib/db";
import CompanyList from "./CompanyList";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; industry?: string; page?: string }>;
}) {
  const { search = "", industry = "", page = "1" } = await searchParams;
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

  const [companies, total, industries] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limit,
      take: limit,
      include: { _count: { select: { contacts: true } } },
    }),
    prisma.company.count({ where }),
    // Distinct non-empty industries for the filter dropdown
    prisma.company.findMany({
      where: { industry: { not: "" } },
      select: { industry: true },
      distinct: ["industry"],
      orderBy: { industry: "asc" },
    }),
  ]);

  const industryOptions = industries.map((i) => i.industry);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Companies</h1>
        <p className="text-zinc-500 text-sm mt-1">{total} companies saved</p>
      </div>
      <CompanyList
        companies={companies}
        total={total}
        page={pageNum}
        limit={limit}
        search={search}
        industryFilter={industry}
        industryOptions={industryOptions}
      />
    </div>
  );
}
