import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ListDetail from "./ListDetail";

export const dynamic = "force-dynamic";

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [list, allContacts] = await Promise.all([
    prisma.contactList.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { createdAt: "desc" },
          include: {
            contact: {
              include: { company: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    prisma.contact.findMany({
      where: { email: { not: "" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        status: true,
        company: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!list) notFound();

  return (
    <div className="p-8 max-w-5xl">
      <ListDetail list={list} allContacts={allContacts} />
    </div>
  );
}
