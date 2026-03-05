import { prisma } from "@/lib/db";
import CompanyList from "./CompanyList";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search = "", page = "1" } = await searchParams;
  const pageNum = parseInt(page);
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
      skip: (pageNum - 1) * limit,
      take: limit,
      include: { _count: { select: { contacts: true } } },
    }),
    prisma.company.count({ where }),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Companies</h1>
        <p className="text-zinc-500 text-sm mt-1">{total} companies saved</p>
      </div>
      <CompanyList companies={companies} total={total} page={pageNum} limit={limit} search={search} />
    </div>
  );
}
