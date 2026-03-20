import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, pct } from "@/lib/utils";
import CampaignActions from "./CampaignActions";
import StepCards from "./StepCards";
import Link from "next/link";
import { ArrowLeft, Users, Copy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      sends: {
        include: {
          contact: { include: { company: { select: { name: true } } } },
          step: { select: { stepNumber: true, label: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });

  if (!campaign) notFound();

  const totalSends = campaign.sends.filter((s) => s.sentAt).length;
  const opens = campaign.sends.filter((s) => s.openedAt).length;
  const clicks = campaign.sends.filter((s) => s.clickedAt).length;
  const replies = campaign.sends.filter((s) => s.respondedAt).length;
  const bounces = campaign.sends.filter((s) => s.bouncedAt).length;

  // Get unique contacts in this campaign
  const uniqueContacts = [...new Map(campaign.sends.map((s) => [s.contactId, s.contact])).values()];

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/campaigns" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Campaigns
      </Link>

      {campaign.isTemplate && (
        <div className="bg-purple-900/20 border border-purple-600/30 rounded-xl px-4 py-3 text-sm text-purple-300 mb-6 flex items-center gap-2">
          <Copy className="w-4 h-4 shrink-0" />
          This is a template — use it to quickly create campaigns with pre-filled steps.
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
            <span>Created {formatDate(campaign.createdAt)}</span>
            {!campaign.isTemplate && <CampaignStatusBadge status={campaign.status} />}
          </div>
        </div>
        <CampaignActions campaign={{ id, status: campaign.status, name: campaign.name, isTemplate: campaign.isTemplate }} />
      </div>

      {/* Metrics */}
      {totalSends > 0 && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: "Sent", value: totalSends },
            { label: "Open Rate", value: pct(opens, totalSends) },
            { label: "Click Rate", value: pct(clicks, totalSends) },
            { label: "Reply Rate", value: pct(replies, totalSends) },
            { label: "Bounce Rate", value: pct(bounces, totalSends) },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4">
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Steps */}
        <div>
          <h2 className="font-semibold text-white mb-3">Steps ({campaign.steps.length})</h2>
          <StepCards steps={campaign.steps} />
        </div>

        {/* Contacts */}
        <div>
          <h2 className="font-semibold text-white mb-3">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contacts ({uniqueContacts.length})
            </span>
          </h2>
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
            {uniqueContacts.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">No contacts in this campaign</div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800">
                {uniqueContacts.map((contact) => {
                  const contactSends = campaign.sends.filter((s) => s.contactId === contact.id);
                  const replied = contactSends.some((s) => s.respondedAt);
                  const opened = contactSends.some((s) => s.openedAt);

                  return (
                    <div key={contact.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <div className="text-sm text-white">
                          {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                        </div>
                        <div className="text-xs text-zinc-500">{contact.company.name}</div>
                      </div>
                      <div className="flex gap-1.5 text-xs">
                        {replied && <span className="bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded">Replied</span>}
                        {opened && !replied && <span className="bg-[#eb9447]/15 text-[#eb9447] px-1.5 py-0.5 rounded">Opened</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function CampaignStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-zinc-800 text-zinc-400",
    READY: "bg-[#eb9447]/15 text-[#eb9447]",
    APPROVED: "bg-green-900/40 text-green-400",
    SENDING: "bg-amber-900/40 text-amber-400",
    ACTIVE: "bg-green-900/40 text-green-400",
    COMPLETED: "bg-zinc-700 text-zinc-300",
    PAUSED: "bg-orange-900/40 text-orange-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || "bg-zinc-800 text-zinc-400"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
