import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ContactProfile from "./ContactProfile";

export const dynamic = "force-dynamic";

export default async function ContactProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
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
    },
  });

  if (!contact) notFound();

  return (
    <div className="p-8 max-w-4xl">
      <ContactProfile contact={contact} />
    </div>
  );
}
