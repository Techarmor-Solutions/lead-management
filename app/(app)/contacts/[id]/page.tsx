import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ContactProfile from "./ContactProfile";
import ContactTasks from "./ContactTasks";

export const dynamic = "force-dynamic";

export default async function ContactProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [contact, manualTasks] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        listMemberships: {
          include: { list: { select: { id: true, name: true } } },
        },
        sends: {
          orderBy: { createdAt: "desc" },
          include: {
            campaign: { select: { id: true, name: true, status: true } },
            step: { select: { label: true, stepNumber: true, stepType: true } },
          },
        },
        activities: {
          orderBy: { date: "desc" },
        },
      },
    }),
    prisma.manualTask.findMany({
      where: { contactId: id },
      orderBy: [{ completedAt: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  if (!contact) notFound();

  return (
    <div className="p-8 max-w-4xl">
      <ContactProfile contact={contact} />
      <div className="mt-6">
        <ContactTasks contactId={id} initial={manualTasks.map((t) => ({
          ...t,
          dueDate: t.dueDate?.toISOString() ?? null,
          completedAt: t.completedAt?.toISOString() ?? null,
          createdAt: t.createdAt.toISOString(),
        }))} />
      </div>
    </div>
  );
}
