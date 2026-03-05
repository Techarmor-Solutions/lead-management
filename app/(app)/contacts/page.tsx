import { prisma } from "@/lib/db";
import ContactsTable from "./ContactsTable";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const { search = "", status = "", page = "1" } = await searchParams;
  const pageNum = parseInt(page);
  const limit = 25;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limit,
      take: limit,
      include: { company: { select: { id: true, name: true } } },
    }),
    prisma.contact.count({ where }),
  ]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-zinc-500 text-sm mt-1">{total} contacts</p>
        </div>
        <a
          href="/api/contacts/export"
          className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Export CSV
        </a>
      </div>
      <ContactsTable contacts={contacts} total={total} page={pageNum} limit={limit} search={search} statusFilter={status} />
    </div>
  );
}
