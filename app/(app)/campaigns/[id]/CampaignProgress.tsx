"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users, UserCheck, UserX, Clock, Mail, Linkedin, Phone, CheckSquare,
  MessageSquare, CheckCircle2, MailOpen, MousePointerClick, Reply, Ban,
} from "lucide-react";

export type StepSummary = {
  stepId: string;
  stepNumber: number;
  label: string;
  stepType: string;
  scheduledFireDate: string | null;
  daysUntilFire: number | null;
  scheduledCount: number;
  sentCount: number;
  cancelledCount: number;
};

export type ContactProgress = {
  contactId: string;
  name: string;
  company: string;
  email: string;
  currentStepNumber: number;
  nextStepNumber: number | null;
  daysUntilNext: number | null;
  isActive: boolean;
  isRemoved: boolean;
  removalReason: "responded" | "bounced" | "unsubscribed" | null;
  sent: boolean;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
  bounced: boolean;
};

interface Props {
  stepSummaries: StepSummary[];
  contactProgress: ContactProgress[];
  totalSteps: number;
  campaignStatus: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="w-3.5 h-3.5 text-[#eb9447]" />,
  LINKEDIN_CONNECT: <Linkedin className="w-3.5 h-3.5 text-sky-400" />,
  LINKEDIN_MESSAGE: <MessageSquare className="w-3.5 h-3.5 text-sky-400" />,
  CALL: <Phone className="w-3.5 h-3.5 text-green-400" />,
  TASK: <CheckSquare className="w-3.5 h-3.5 text-amber-400" />,
};

function DaysChip({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days < 0) return <span className="text-xs text-amber-400">Overdue by {Math.abs(days)}d</span>;
  if (days === 0) return <span className="text-xs text-green-400">Fires today</span>;
  return <span className="text-xs text-zinc-400">In {days} day{days !== 1 ? "s" : ""}</span>;
}

export default function CampaignProgress({ stepSummaries, contactProgress, totalSteps, campaignStatus }: Props) {
  const [tab, setTab] = useState<"active" | "removed">("active");

  const activeContacts = contactProgress.filter((c) => c.isActive);
  const removedContacts = contactProgress.filter((c) => c.isRemoved);
  const completedContacts = contactProgress.filter((c) => !c.isActive && !c.isRemoved && c.sent);

  const isLive = ["ACTIVE", "SENDING"].includes(campaignStatus);

  return (
    <div className="space-y-6">
      {/* Step-by-step progress */}
      <div>
        <h2 className="font-semibold text-white mb-3">Step Progress</h2>
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-zinc-800">
            {stepSummaries.map((step) => {
              const total = step.scheduledCount + step.sentCount + step.cancelledCount;
              const pct = total > 0 ? Math.round((step.sentCount / (step.sentCount + step.scheduledCount || 1)) * 100) : 0;
              return (
                <div key={step.stepId} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {TYPE_ICONS[step.stepType] || <Mail className="w-3.5 h-3.5" />}
                      <span className="text-sm font-medium text-white">
                        Step {step.stepNumber}: {step.label || `Step ${step.stepNumber}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      {step.scheduledCount > 0 && (
                        <span className="flex items-center gap-1 text-[#eb9447]">
                          <Clock className="w-3 h-3" />
                          {step.scheduledCount} waiting
                          {step.daysUntilFire !== null && (
                            <span className="text-zinc-500 ml-1">·</span>
                          )}
                          <DaysChip days={step.daysUntilFire} />
                        </span>
                      )}
                      {step.sentCount > 0 && (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          {step.sentCount} sent
                        </span>
                      )}
                      {step.cancelledCount > 0 && (
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Ban className="w-3 h-3" />
                          {step.cancelledCount} skipped
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-[#eb9447] h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contact progression */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Contacts</h2>
          <div className="flex gap-2 text-xs text-zinc-500">
            {isLive && <span className="flex items-center gap-1"><Users className="w-3 h-3 text-[#eb9447]" />{activeContacts.length} active</span>}
            {completedContacts.length > 0 && <span className="flex items-center gap-1"><UserCheck className="w-3 h-3 text-green-400" />{completedContacts.length} completed</span>}
            {removedContacts.length > 0 && <span className="flex items-center gap-1"><UserX className="w-3 h-3 text-zinc-500" />{removedContacts.length} removed</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 bg-zinc-900 p-1 rounded-lg w-fit">
          {(["active", "removed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "active" ? `Active (${activeContacts.length + completedContacts.length})` : `Removed (${removedContacts.length})`}
            </button>
          ))}
        </div>

        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
          {tab === "active" ? (
            <ActiveTab contacts={[...activeContacts, ...completedContacts]} totalSteps={totalSteps} />
          ) : (
            <RemovedTab contacts={removedContacts} />
          )}
        </div>
      </div>
    </div>
  );
}

function ActiveTab({ contacts, totalSteps }: { contacts: ContactProgress[]; totalSteps: number }) {
  if (contacts.length === 0) {
    return <div className="py-8 text-center text-sm text-zinc-500">No active contacts</div>;
  }

  return (
    <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800">
      {contacts.map((c) => (
        <div key={c.contactId} className="flex items-center justify-between px-4 py-2.5 gap-4">
          <div className="min-w-0">
            <Link href={`/contacts/${c.contactId}`} className="text-sm font-medium text-white hover:text-[#eb9447] transition-colors">
              {c.name}
            </Link>
            <div className="text-xs text-zinc-500">{c.company}</div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Engagement badges */}
            <div className="flex gap-1">
              {c.opened && (
                <span title="Opened" className="text-[#eb9447]">
                  <MailOpen className="w-3.5 h-3.5" />
                </span>
              )}
              {c.clicked && (
                <span title="Clicked" className="text-sky-400">
                  <MousePointerClick className="w-3.5 h-3.5" />
                </span>
              )}
              {c.replied && (
                <span title="Replied" className="text-green-400">
                  <Reply className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            {/* Step + next step */}
            <div className="text-right">
              {c.currentStepNumber > 0 && (
                <div className="text-xs text-zinc-400">
                  Step {c.currentStepNumber}/{totalSteps}
                </div>
              )}
              {c.isActive && c.nextStepNumber !== null && (
                <div className="text-xs">
                  <span className="text-zinc-500">Next: step {c.nextStepNumber} · </span>
                  <DaysChip days={c.daysUntilNext} />
                </div>
              )}
              {!c.isActive && (
                <span className="text-xs text-zinc-500">Sequence complete</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RemovedTab({ contacts }: { contacts: ContactProgress[] }) {
  if (contacts.length === 0) {
    return <div className="py-8 text-center text-sm text-zinc-500">No removed contacts</div>;
  }

  const REASON_CONFIG = {
    responded: { label: "Replied", cls: "bg-green-900/30 text-green-400" },
    bounced: { label: "Bounced", cls: "bg-red-900/30 text-red-400" },
    unsubscribed: { label: "Unsubscribed", cls: "bg-zinc-700 text-zinc-400" },
  };

  return (
    <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800">
      {contacts.map((c) => {
        const cfg = c.removalReason ? REASON_CONFIG[c.removalReason] : null;
        return (
          <div key={c.contactId} className="flex items-center justify-between px-4 py-2.5">
            <div className="min-w-0">
              <Link href={`/contacts/${c.contactId}`} className="text-sm font-medium text-white hover:text-[#eb9447] transition-colors">
                {c.name}
              </Link>
              <div className="text-xs text-zinc-500">{c.company}</div>
            </div>
            {cfg && (
              <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${cfg.cls}`}>
                {cfg.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
