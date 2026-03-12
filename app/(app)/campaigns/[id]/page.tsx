import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, pct } from "@/lib/utils";
import CampaignActions from "./CampaignActions";
import Link from "next/link";
import { ArrowLeft, Users, Clock, Mail, Linkedin, Phone, CheckSquare, MessageSquare, Copy } from "lucide-react";
import type { StepType } from "@prisma/client";

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
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Sent", value: totalSends },
            { label: "Open Rate", value: pct(opens, totalSends) },
            { label: "Click Rate", value: pct(clicks, totalSends) },
            { label: "Reply Rate", value: pct(replies, totalSends) },
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
          <div className="space-y-3">
            {campaign.steps.map((step) => (
              <div key={step.id} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <StepTypeIcon type={step.stepType} />
                    Step {step.stepNumber}: {step.label}
                  </div>
                  <div className="flex items-center gap-2">
                    <StepTypeBadge type={step.stepType} />
                    {step.delayDays > 0 && (
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        +{step.delayDays}d
                      </div>
                    )}
                  </div>
                </div>
                {step.stepType === "EMAIL" ? (
                  <>
                    <div className="text-xs font-medium text-zinc-400 mb-1">{step.subject}</div>
                    <div className="text-xs text-zinc-500 whitespace-pre-wrap line-clamp-4">{step.body}</div>
                  </>
                ) : (
                  step.body && (
                    <div className="text-xs text-zinc-500 whitespace-pre-wrap line-clamp-4">{step.body}</div>
                  )
                )}
              </div>
            ))}
          </div>
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

function StepTypeIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5";
  switch (type) {
    case "EMAIL": return <Mail className={`${cls} text-[#eb9447]`} />;
    case "LINKEDIN_CONNECT": return <Linkedin className={`${cls} text-sky-400`} />;
    case "LINKEDIN_MESSAGE": return <MessageSquare className={`${cls} text-sky-400`} />;
    case "CALL": return <Phone className={`${cls} text-green-400`} />;
    case "TASK": return <CheckSquare className={`${cls} text-amber-400`} />;
    default: return <Mail className={cls} />;
  }
}

const STEP_TYPE_LABELS: Record<string, string> = {
  EMAIL: "Email",
  LINKEDIN_CONNECT: "LinkedIn Connect",
  LINKEDIN_MESSAGE: "LinkedIn Message",
  CALL: "Cold Call",
  TASK: "Task",
};

const STEP_TYPE_COLORS: Record<string, string> = {
  EMAIL: "bg-[#eb9447]/15 text-[#eb9447]",
  LINKEDIN_CONNECT: "bg-sky-900/30 text-sky-400",
  LINKEDIN_MESSAGE: "bg-sky-900/30 text-sky-400",
  CALL: "bg-green-900/30 text-green-400",
  TASK: "bg-amber-900/30 text-amber-400",
};

function StepTypeBadge({ type }: { type: StepType }) {
  if (type === "EMAIL") return null;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${STEP_TYPE_COLORS[type] || "bg-zinc-800 text-zinc-400"}`}>
      {STEP_TYPE_LABELS[type] || type}
    </span>
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
