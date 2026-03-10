import { prisma } from "@/lib/db";
import CampaignBuilder from "./CampaignBuilder";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const [contacts, agencyProfile, lists] = await Promise.all([
    prisma.contact.findMany({
      where: { email: { not: "" } },
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true, industry: true, website: true } } },
    }),
    prisma.agencyProfile.findFirst(),
    prisma.contactList.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true } },
        members: { select: { contactId: true } },
      },
    }),
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">New Campaign</h1>
        <p className="text-zinc-500 text-sm mt-1">Build your email sequence</p>
      </div>
      <CampaignBuilder contacts={contacts} agencyProfile={agencyProfile} lists={lists} />
    </div>
  );
}
