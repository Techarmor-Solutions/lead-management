import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate, pct } from "@/lib/utils";
import { Plus, Mail, Copy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const all = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { steps: true, sends: true } },
      sends: {
        select: { sentAt: true, openedAt: true, respondedAt: true, bouncedAt: true },
      },
    },
  });

  const templates = all.filter((c) => c.isTemplate);
  const campaigns = all.filter((c) => !c.isTemplate);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-zinc-500 text-sm mt-1">{campaigns.length} campaigns · {templates.length} templates</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Templates section */}
      {templates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Copy className="w-3.5 h-3.5" />
            Templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {templates.map((t) => (
              <div key={t.id} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                <div>
                  <Link href={`/campaigns/${t.id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
                    {t.name}
                  </Link>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {t._count.steps} step{t._count.steps !== 1 ? "s" : ""} · created {formatDate(t.createdAt)}
                  </div>
                  {t.industry && (
                    <div className="text-xs text-zinc-600 mt-0.5">{t.industry}</div>
                  )}
                </div>
                <Link
                  href={`/campaigns/new?template=${t.id}`}
                  className="flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Use Template
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns table */}
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Mail className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No campaigns yet</p>
            <Link href="/campaigns/new" className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block">
              Create your first campaign →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Campaign</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Steps</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Sent</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Opens</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Replies</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {campaigns.map((c) => {
                const sent = c.sends.filter((s) => s.sentAt).length;
                const opened = c.sends.filter((s) => s.openedAt).length;
                const replied = c.sends.filter((s) => s.respondedAt).length;

                return (
                  <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/campaigns/${c.id}`} className="font-medium text-white hover:text-blue-400 transition-colors">
                        {c.name}
                      </Link>
                      <div className="text-xs text-zinc-500">{formatDate(c.createdAt)}</div>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{c._count.steps}</td>
                    <td className="px-5 py-3 text-zinc-400">{sent}</td>
                    <td className="px-5 py-3 text-zinc-400">{pct(opened, sent)}</td>
                    <td className="px-5 py-3 text-zinc-400">{pct(replied, sent)}</td>
                    <td className="px-5 py-3">
                      <CampaignStatusBadge status={c.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-zinc-800 text-zinc-400",
    READY: "bg-blue-900/40 text-blue-400",
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
