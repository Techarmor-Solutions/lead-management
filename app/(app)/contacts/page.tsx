import { prisma } from "@/lib/db";
import ContactsTable from "./ContactsTable";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    dateFrom?: string;
    dateTo?: string;
    lastContactedFrom?: string;
    lastContactedTo?: string;
  }>;
}) {
  const {
    search = "",
    status = "",
    page = "1",
    dateFrom = "",
    dateTo = "",
    lastContactedFrom = "",
    lastContactedTo = "",
  } = await searchParams;
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

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
    };
  }

  if (lastContactedFrom || lastContactedTo) {
    where.sends = {
      some: {
        sentAt: {
          ...(lastContactedFrom ? { gte: new Date(lastContactedFrom) } : { not: null }),
          ...(lastContactedTo ? { lte: new Date(lastContactedTo + "T23:59:59") } : {}),
        },
      },
    };
  }

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
      <ContactsTable
        contacts={contacts}
        total={total}
        page={pageNum}
        limit={limit}
        search={search}
        statusFilter={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
        lastContactedFrom={lastContactedFrom}
        lastContactedTo={lastContactedTo}
      />
    </div>
  );
}
