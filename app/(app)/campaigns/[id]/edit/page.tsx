import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CampaignBuilder from "../../new/CampaignBuilder";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [campaign, contacts, agencyProfile, lists] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    }),
    prisma.contact.findMany({
      where: { status: { not: "DO_NOT_CONTACT" } },
      include: { company: { select: { name: true, industry: true, website: true } } },
      orderBy: { firstName: "asc" },
    }),
    prisma.agencyProfile.findFirst(),
    prisma.contactList.findMany({
      include: { _count: { select: { members: true } }, members: { select: { contactId: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!campaign) notFound();

  return (
    <div className="p-8 max-w-5xl">
      <Link href={`/campaigns/${id}`} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {campaign.isTemplate ? "Back to Template" : "Back to Campaign"}
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6">{campaign.isTemplate ? "Edit Template" : "Edit Campaign"}</h1>
      <CampaignBuilder
        contacts={contacts}
        agencyProfile={agencyProfile}
        lists={lists}
        initialSteps={campaign.steps}
        initialIndustry={campaign.industry || ""}
        initialName={campaign.name}
        editId={id}
        isTemplate={campaign.isTemplate}
      />
    </div>
  );
}
