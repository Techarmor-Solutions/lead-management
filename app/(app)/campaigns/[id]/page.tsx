import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, pct } from "@/lib/utils";
import CampaignActions from "./CampaignActions";
import StepCards from "./StepCards";
import CampaignProgress, { type StepSummary, type ContactProgress } from "./CampaignProgress";
import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      sends: {
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
              company: { select: { name: true } },
            },
          },
          step: { select: { id: true, stepNumber: true, label: true, stepType: true } },
        },
      },
    },
  });

  if (!campaign) notFound();

  const totalSends = campaign.sends.filter((s) => s.sentAt).length;
  const opens = campaign.sends.filter((s) => s.openedAt).length;
  const clicks = campaign.sends.filter((s) => s.clickedAt).length;
  const replies = campaign.sends.filter((s) => s.respondedAt).length;
  const bounces = campaign.sends.filter((s) => s.bouncedAt).length;

  // ── Compute cumulative delay for each step ──────────────────────────────
  const cumulativeDelays: number[] = [];
  campaign.steps.forEach((step, i) => {
    const prev = i > 0 ? cumulativeDelays[i - 1] : 0;
    cumulativeDelays.push(prev + step.delayDays);
  });

  // Fire time for step index i: campaign.sentAt + cumulativeDelays[i] days
  const campaignSentAt = campaign.sentAt;
  function stepFireTime(stepIdx: number): Date | null {
    if (!campaignSentAt) return null;
    return new Date(campaignSentAt.getTime() + cumulativeDelays[stepIdx] * 86400000);
  }

  // ── Step summaries ──────────────────────────────────────────────────────
  const now = Date.now();

  const stepSummaries: StepSummary[] = campaign.steps.map((step, i) => {
    const fireTime = stepFireTime(i);
    const daysUntilFire = fireTime ? Math.ceil((fireTime.getTime() - now) / 86400000) : null;
    const stepSends = campaign.sends.filter((s) => s.stepId === step.id);

    return {
      stepId: step.id,
      stepNumber: step.stepNumber,
      label: step.label,
      stepType: step.stepType,
      scheduledFireDate: fireTime?.toISOString() ?? null,
      daysUntilFire,
      scheduledCount: stepSends.filter((s) => s.status === "SCHEDULED").length,
      sentCount: stepSends.filter((s) => ["SENT", "OPENED", "CLICKED", "RESPONDED"].includes(s.status)).length,
      cancelledCount: stepSends.filter((s) => s.status === "CANCELLED").length,
    };
  });

  // ── Per-contact progress ────────────────────────────────────────────────
  const contactMap = new Map<string, typeof campaign.sends[0]["contact"]>();
  for (const send of campaign.sends) {
    if (!contactMap.has(send.contactId)) contactMap.set(send.contactId, send.contact);
  }

  const contactProgress: ContactProgress[] = Array.from(contactMap.entries()).map(([contactId, contact]) => {
    const contactSends = campaign.sends.filter((s) => s.contactId === contactId);

    const sentSends = contactSends.filter((s) => ["SENT", "OPENED", "CLICKED", "RESPONDED"].includes(s.status));
    const scheduledSends = contactSends.filter((s) => s.status === "SCHEDULED");

    const replied = contactSends.some((s) => s.respondedAt != null || s.status === "RESPONDED");
    const bounced = contactSends.some((s) => s.status === "BOUNCED");
    const unsubscribed = contact.status === "DO_NOT_CONTACT";

    // Highest sent step number
    const maxSentStep = sentSends.length > 0
      ? Math.max(...sentSends.map((s) => s.step.stepNumber))
      : 0;

    // Lowest scheduled step
    const nextScheduledSend = scheduledSends.length > 0
      ? scheduledSends.reduce((min, s) => s.step.stepNumber < min.step.stepNumber ? s : min)
      : null;

    // Days until next scheduled step
    let daysUntilNext: number | null = null;
    if (nextScheduledSend) {
      const stepIdx = campaign.steps.findIndex((s) => s.id === nextScheduledSend.stepId);
      if (stepIdx >= 0) {
        const ft = stepFireTime(stepIdx);
        if (ft) daysUntilNext = Math.ceil((ft.getTime() - now) / 86400000);
      }
    }

    let removalReason: ContactProgress["removalReason"] = null;
    if (replied) removalReason = "responded";
    else if (bounced) removalReason = "bounced";
    else if (unsubscribed) removalReason = "unsubscribed";

    const isRemoved = replied || bounced || unsubscribed;
    const isActive = scheduledSends.length > 0 && !isRemoved;

    return {
      contactId,
      name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown",
      company: contact.company?.name || "",
      email: contact.email,
      currentStepNumber: maxSentStep,
      nextStepNumber: nextScheduledSend?.step.stepNumber ?? null,
      daysUntilNext,
      isActive,
      isRemoved,
      removalReason,
      sent: sentSends.length > 0,
      opened: contactSends.some((s) => s.openedAt != null),
      clicked: contactSends.some((s) => s.clickedAt != null),
      replied,
      bounced,
    };
  });

  const isTemplate = campaign.isTemplate;
  const showProgress = !isTemplate && campaign.sends.length > 0;

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/campaigns" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Campaigns
      </Link>

      {isTemplate && (
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
            {!isTemplate && <CampaignStatusBadge status={campaign.status} />}
            {campaign.sentAt && (
              <span>Sent {formatDate(campaign.sentAt)}</span>
            )}
          </div>
        </div>
        <CampaignActions campaign={{ id, status: campaign.status, name: campaign.name, isTemplate }} />
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

      {/* Steps */}
      <div className="mb-6">
        <h2 className="font-semibold text-white mb-3">Steps ({campaign.steps.length})</h2>
        <StepCards steps={campaign.steps} />
      </div>

      {/* Campaign Progression */}
      {showProgress && (
        <CampaignProgress
          campaignId={id}
          stepSummaries={stepSummaries}
          contactProgress={contactProgress}
          totalSteps={campaign.steps.length}
          campaignStatus={campaign.status}
        />
      )}

      {/* Template: just contacts count */}
      {isTemplate && campaign.steps.length === 0 && (
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl py-8 text-center text-sm text-zinc-500">
          No steps defined yet. Edit this template to add steps.
        </div>
      )}
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
