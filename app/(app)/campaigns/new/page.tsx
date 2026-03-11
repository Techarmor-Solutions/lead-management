import { prisma } from "@/lib/db";
import CampaignBuilder from "./CampaignBuilder";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template: templateId } = await searchParams;

  const [contacts, agencyProfile, lists, templateData] = await Promise.all([
    prisma.contact.findMany({
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
    templateId
      ? prisma.campaign.findUnique({
          where: { id: templateId, isTemplate: true },
          include: { steps: { orderBy: { stepNumber: "asc" } } },
        })
      : null,
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">New Campaign</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {templateData ? `Using template: ${templateData.name}` : "Build your email sequence"}
        </p>
      </div>
      <CampaignBuilder
        contacts={contacts}
        agencyProfile={agencyProfile}
        lists={lists}
        initialSteps={templateData?.steps}
        initialIndustry={templateData?.industry}
      />
    </div>
  );
}
