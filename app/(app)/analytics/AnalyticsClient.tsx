"use client";

import { useRouter } from "next/navigation";
import { BarChart3, Mail, MousePointer, MessageSquare, AlertTriangle, ChevronDown, Check, Phone, TrendingUp } from "lucide-react";
import { pct } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

type Step = {
  id: string;
  stepNumber: number;
  label: string;
  subject: string;
};

type SendData = {
  contactId: string;
  stepId: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  respondedAt: string | null;
  bouncedAt: string | null;
  contact: { firstName: string; lastName: string; email: string };
};

type Campaign = {
  id: string;
  name: string;
  industry: string;
  steps: Step[];
  sends: SendData[];
};

type Stats = {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalBounced: number;
};

type CallData = {
  total: number;
  today: number;
  thisWeek: number;
  connectRate: number;
  conversionRate: number;
  outcomeBreakdown: { outcome: string; count: number; pct: number }[];
  dailyVolume: { date: string; label: string; count: number; maxCount: number }[];
};

export default function AnalyticsClient({
  campaigns,
  selectedId,
  stats,
  callData,
  initialTab = "email",
}: {
  campaigns: Campaign[];
  selectedId: string | null;
  stats: Stats;
  callData: CallData;
  initialTab?: "email" | "calls";
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"email" | "calls">(initialTab);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCampaign = selectedId ? campaigns.find((c) => c.id === selectedId) ?? null : null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectCampaign(id: string | null) {
    router.push(id ? `/analytics?campaign=${id}` : `/analytics`);
    setDropdownOpen(false);
  }

  const statCards = [
    { label: "Total Sent", value: stats.totalSent, icon: Mail, color: "text-[#eb9447]" },
    { label: "Open Rate", value: pct(stats.totalOpened, stats.totalSent), icon: BarChart3, color: "text-green-400" },
    { label: "Click Rate", value: pct(stats.totalClicked, stats.totalSent), icon: MousePointer, color: "text-purple-400" },
    { label: "Reply Rate", value: pct(stats.totalReplied, stats.totalSent), icon: MessageSquare, color: "text-amber-400" },
    { label: "Bounce Rate", value: pct(stats.totalBounced, stats.totalSent), icon: AlertTriangle, color: "text-red-400" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("email")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "email"
              ? "bg-[#1a1a1a] text-white shadow"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
        <button
          onClick={() => setActiveTab("calls")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "calls"
              ? "bg-[#1a1a1a] text-white shadow"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Phone className="w-4 h-4" />
          Calls
        </button>
      </div>

      {activeTab === "calls" && <CallsTab data={callData} />}

      {activeTab === "email" && <>
      {/* Header + Campaign Selector */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-zinc-500 text-sm">
            {selectedCampaign ? `Viewing: ${selectedCampaign.name}` : "All campaigns overview"}
          </p>
        </div>

        {/* Campaign Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-zinc-700 rounded-lg text-sm text-white hover:border-zinc-500 transition-colors min-w-[220px] justify-between"
          >
            <span className="truncate">{selectedCampaign ? selectedCampaign.name : "All Campaigns"}</span>
            <ChevronDown className={`w-4 h-4 text-zinc-400 flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-72 bg-[#1a1a1a] border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => selectCampaign(null)}
                className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-800 transition-colors"
              >
                <span className={selectedId === null ? "text-[#eb9447]" : "text-zinc-300"}>All Campaigns</span>
                {selectedId === null && <Check className="w-4 h-4 text-[#eb9447]" />}
              </button>
              <div className="border-t border-zinc-800" />
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCampaign(c.id)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-800 transition-colors"
                >
                  <div className="min-w-0">
                    <div className={`truncate ${selectedId === c.id ? "text-[#eb9447]" : "text-zinc-300"}`}>{c.name}</div>
                    {c.industry && <div className="text-xs text-zinc-500 truncate">{c.industry}</div>}
                  </div>
                  {selectedId === c.id && <Check className="w-4 h-4 text-[#eb9447] flex-shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
              <Icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-zinc-500">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* If no campaign selected: campaign comparison table */}
      {!selectedCampaign && (
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Campaign Performance</h2>
          </div>
          {campaigns.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">No campaigns yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Campaign</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Sent</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Open %</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Click %</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Reply %</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Bounce %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {campaigns.map((c) => {
                  const sent = c.sends.filter((s) => s.sentAt).length;
                  const opened = c.sends.filter((s) => s.openedAt).length;
                  const clicked = c.sends.filter((s) => s.clickedAt).length;
                  const replied = c.sends.filter((s) => s.respondedAt).length;
                  const bounced = c.sends.filter((s) => s.bouncedAt).length;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-800/20 transition-colors cursor-pointer"
                      onClick={() => selectCampaign(c.id)}
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-white hover:text-[#eb9447]">{c.name}</div>
                        {c.industry && <div className="text-xs text-zinc-500">{c.industry}</div>}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-400">{sent}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={opened > 0 ? "text-green-400" : "text-zinc-500"}>{pct(opened, sent)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={clicked > 0 ? "text-purple-400" : "text-zinc-500"}>{pct(clicked, sent)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={replied > 0 ? "text-amber-400" : "text-zinc-500"}>{pct(replied, sent)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={bounced > 0 ? "text-red-400" : "text-zinc-500"}>{pct(bounced, sent)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* If campaign selected: step breakdown + per-contact detail */}
      {selectedCampaign && <CampaignDetail campaign={selectedCampaign} />}
      </>}
    </div>
  );
}

const OUTCOME_COLORS: Record<string, string> = {
  "No answer":          "bg-zinc-600",
  "Left voicemail":     "bg-blue-500",
  "Not interested":     "bg-red-500",
  "Callback requested": "bg-amber-500",
  "Interested":         "bg-green-500",
  "Converted":          "bg-purple-500",
  "No outcome logged":  "bg-zinc-700",
};

function CallsTab({ data }: { data: CallData }) {
  const statCards = [
    { label: "Total Calls", value: data.total, icon: Phone, color: "text-[#eb9447]" },
    { label: "Today", value: data.today, icon: Phone, color: "text-green-400" },
    { label: "This Week", value: data.thisWeek, icon: BarChart3, color: "text-blue-400" },
    { label: "Connect Rate", value: `${data.connectRate}%`, icon: TrendingUp, color: "text-amber-400" },
    { label: "Conversion Rate", value: `${data.conversionRate}%`, icon: TrendingUp, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
              <Icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-zinc-500">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outcome breakdown */}
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Outcome Breakdown</h2>
          </div>
          {data.outcomeBreakdown.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">No calls logged yet</div>
          ) : (
            <div className="p-5 space-y-3">
              {data.outcomeBreakdown.map(({ outcome, count, pct: p }) => (
                <div key={outcome}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-zinc-300">{outcome}</span>
                    <span className="text-zinc-500">{count} · {p}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${OUTCOME_COLORS[outcome] ?? "bg-zinc-500"}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily volume */}
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Daily Call Volume</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Last 30 days</p>
          </div>
          <div className="p-5">
            {data.total === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-sm">No calls logged yet</div>
            ) : (
              <div className="flex items-end gap-0.5 h-32">
                {data.dailyVolume.map(({ date, label, count, maxCount }) => (
                  <div
                    key={date}
                    className="flex-1 flex flex-col items-center justify-end group relative"
                  >
                    <div
                      className="w-full bg-[#eb9447]/70 hover:bg-[#eb9447] rounded-t transition-colors"
                      style={{ height: `${count > 0 ? Math.max((count / maxCount) * 100, 8) : 0}%` }}
                    />
                    {/* Tooltip */}
                    {count > 0 && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                        {label}: {count}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {data.total > 0 && (
              <div className="flex justify-between text-xs text-zinc-600 mt-2">
                <span>{data.dailyVolume[0]?.label}</span>
                <span>{data.dailyVolume[data.dailyVolume.length - 1]?.label}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Outcome detail table */}
      {data.outcomeBreakdown.length > 0 && (
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Outcome Detail</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Outcome</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Count</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.outcomeBreakdown.map(({ outcome, count, pct: p }) => (
                <tr key={outcome}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${OUTCOME_COLORS[outcome] ?? "bg-zinc-500"}`} />
                      <span className="text-zinc-300">{outcome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-400">{count}</td>
                  <td className="px-5 py-3 text-right text-zinc-400">{p}%</td>
                </tr>
              ))}
              <tr className="border-t border-zinc-700 bg-zinc-900/50">
                <td className="px-5 py-3 text-zinc-400 font-medium">Total</td>
                <td className="px-5 py-3 text-right text-white font-medium">{data.total}</td>
                <td className="px-5 py-3 text-right text-zinc-400">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CampaignDetail({ campaign }: { campaign: Campaign }) {
  const steps = campaign.steps;
  const sends = campaign.sends;

  // Collect unique contacts
  const contactMap = new Map<string, { firstName: string; lastName: string; email: string }>();
  for (const s of sends) {
    if (!contactMap.has(s.contactId)) {
      contactMap.set(s.contactId, s.contact);
    }
  }
  const contacts = Array.from(contactMap.entries()).map(([id, info]) => ({ id, ...info }));

  // Build lookup: contactId -> stepId -> send
  const sendLookup = new Map<string, Map<string, SendData>>();
  for (const s of sends) {
    if (!sendLookup.has(s.contactId)) sendLookup.set(s.contactId, new Map());
    sendLookup.get(s.contactId)!.set(s.stepId, s);
  }

  // Step summary stats
  const stepStats = steps.map((step) => {
    const stepSends = sends.filter((s) => s.stepId === step.id);
    const sent = stepSends.filter((s) => s.sentAt).length;
    const opened = stepSends.filter((s) => s.openedAt).length;
    const clicked = stepSends.filter((s) => s.clickedAt).length;
    const replied = stepSends.filter((s) => s.respondedAt).length;
    return { step, sent, opened, clicked, replied };
  });

  return (
    <div className="space-y-6">
      {/* Step summary */}
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="font-semibold text-white">Step Performance</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Step</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Sent</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Open %</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Click %</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Reply %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {stepStats.map(({ step, sent, opened, clicked, replied }) => (
              <tr key={step.id}>
                <td className="px-5 py-3">
                  <div className="text-white font-medium">Step {step.stepNumber}: {step.label}</div>
                  <div className="text-xs text-zinc-500 truncate">{step.subject}</div>
                </td>
                <td className="px-5 py-3 text-right text-zinc-400">{sent}</td>
                <td className="px-5 py-3 text-right">
                  <span className={opened > 0 ? "text-green-400" : "text-zinc-500"}>{pct(opened, sent)}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={clicked > 0 ? "text-purple-400" : "text-zinc-500"}>{pct(clicked, sent)}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={replied > 0 ? "text-amber-400" : "text-zinc-500"}>{pct(replied, sent)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-contact step detail */}
      {contacts.length > 0 && (
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h3 className="font-semibold text-white">Contact Engagement by Step</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Shows what action each contact took at each step</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider sticky left-0 bg-[#1a1a1a]">
                    Contact
                  </th>
                  {steps.map((step) => (
                    <th key={step.id} className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                      Step {step.stepNumber}
                      <div className="text-zinc-600 normal-case font-normal truncate max-w-[100px] mx-auto">{step.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {contacts.map((contact) => {
                  const name = `${contact.firstName} ${contact.lastName}`.trim() || contact.email;
                  const stepMap = sendLookup.get(contact.id);
                  return (
                    <tr key={contact.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-3 sticky left-0 bg-[#1a1a1a]">
                        <div className="font-medium text-white">{name}</div>
                        <div className="text-xs text-zinc-500">{contact.email}</div>
                      </td>
                      {steps.map((step) => {
                        const send = stepMap?.get(step.id);
                        if (!send || !send.sentAt) {
                          return (
                            <td key={step.id} className="px-4 py-3 text-center">
                              <span className="text-zinc-700 text-xs">—</span>
                            </td>
                          );
                        }
                        return (
                          <td key={step.id} className="px-4 py-3 text-center">
                            <StepBadge send={send} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-5 py-3 border-t border-zinc-800 flex flex-wrap gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Replied</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Clicked</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Opened</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" /> Sent</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Bounced</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBadge({ send }: { send: SendData }) {
  if (send.bouncedAt) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-medium">Bounced</span>;
  }
  if (send.respondedAt) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 text-xs font-medium">Replied</span>;
  }
  if (send.clickedAt) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-400/15 text-purple-400 text-xs font-medium">Clicked</span>;
  }
  if (send.openedAt) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-400/15 text-green-400 text-xs font-medium">Opened</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 text-xs font-medium">Sent</span>;
}
