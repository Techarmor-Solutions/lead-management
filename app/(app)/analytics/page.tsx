import { prisma } from "@/lib/db";
import { pct } from "@/lib/utils";
import Link from "next/link";
import { BarChart3, TrendingUp, Mail, MousePointer, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      sends: { select: { sentAt: true, openedAt: true, clickedAt: true, respondedAt: true, bouncedAt: true, stepId: true } },
    },
  });

  // Overall stats
  const allSends = campaigns.flatMap((c) => c.sends);
  const totalSent = allSends.filter((s) => s.sentAt).length;
  const totalOpened = allSends.filter((s) => s.openedAt).length;
  const totalClicked = allSends.filter((s) => s.clickedAt).length;
  const totalReplied = allSends.filter((s) => s.respondedAt).length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">Campaign performance overview</p>
      </div>

      {/* Overall metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Sent", value: totalSent, icon: Mail, color: "text-[#eb9447]" },
          { label: "Open Rate", value: pct(totalOpened, totalSent), icon: BarChart3, color: "text-green-400" },
          { label: "Click Rate", value: pct(totalClicked, totalSent), icon: MousePointer, color: "text-purple-400" },
          { label: "Reply Rate", value: pct(totalReplied, totalSent), icon: MessageSquare, color: "text-amber-400" },
        ].map((stat) => {
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

      {/* Campaign breakdown */}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {campaigns.map((c) => {
                const sent = c.sends.filter((s) => s.sentAt).length;
                const opened = c.sends.filter((s) => s.openedAt).length;
                const clicked = c.sends.filter((s) => s.clickedAt).length;
                const replied = c.sends.filter((s) => s.respondedAt).length;

                return (
                  <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/campaigns/${c.id}`} className="font-medium text-white hover:text-[#eb9447]">
                        {c.name}
                      </Link>
                      {c.industry && <div className="text-xs text-zinc-500">{c.industry}</div>}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-400">{sent}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={opened > 0 ? "text-green-400" : "text-zinc-500"}>
                        {pct(opened, sent)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={clicked > 0 ? "text-purple-400" : "text-zinc-500"}>
                        {pct(clicked, sent)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={replied > 0 ? "text-amber-400" : "text-zinc-500"}>
                        {pct(replied, sent)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Step-by-step breakdown for completed campaigns */}
      {campaigns.filter((c) => c.sends.some((s) => s.sentAt)).map((c) => {
        const stepsWithStats = c.steps.map((step) => {
          const stepSends = c.sends.filter((s) => s.stepId === step.id);
          const sent = stepSends.filter((s) => s.sentAt).length;
          const opened = stepSends.filter((s) => s.openedAt).length;
          const replied = stepSends.filter((s) => s.respondedAt).length;
          return { step, sent, opened, replied };
        });

        return (
          <div key={c.id} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden mb-4">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h3 className="font-medium text-white">{c.name} — Step Breakdown</h3>
            </div>
            <div className="divide-y divide-zinc-800">
              {stepsWithStats.map(({ step, sent, opened, replied }) => (
                <div key={step.id} className="flex items-center px-5 py-3 gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-white">Step {step.stepNumber}: {step.label}</div>
                    <div className="text-xs text-zinc-500 truncate">{step.subject}</div>
                  </div>
                  <div className="flex gap-6 text-xs">
                    <div className="text-right">
                      <div className="text-white">{sent}</div>
                      <div className="text-zinc-500">sent</div>
                    </div>
                    <div className="text-right">
                      <div className={opened > 0 ? "text-green-400" : "text-zinc-500"}>{pct(opened, sent)}</div>
                      <div className="text-zinc-500">opened</div>
                    </div>
                    <div className="text-right">
                      <div className={replied > 0 ? "text-amber-400" : "text-zinc-500"}>{pct(replied, sent)}</div>
                      <div className="text-zinc-500">replied</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
