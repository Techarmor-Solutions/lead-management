import { prisma } from "@/lib/db";
import { formatDate, pct } from "@/lib/utils";
import Link from "next/link";
import { Building2, Users, Mail, TrendingUp, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    companyCount,
    contactCount,
    campaigns,
    recentSends,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.contact.count(),
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { sends: true } } },
    }),
    prisma.send.aggregate({
      _count: { id: true },
      where: { sentAt: { not: null } },
    }),
  ]);

  const openCount = await prisma.send.count({ where: { openedAt: { not: null } } });
  const responseCount = await prisma.send.count({ where: { respondedAt: { not: null } } });
  const totalSent = recentSends._count.id;

  const stats = [
    { label: "Companies", value: companyCount, icon: Building2, href: "/companies", color: "text-blue-400" },
    { label: "Contacts", value: contactCount, icon: Users, href: "/contacts", color: "text-purple-400" },
    { label: "Emails Sent", value: totalSent, icon: Mail, href: "/campaigns", color: "text-green-400" },
    {
      label: "Avg Open Rate",
      value: pct(openCount, totalSent),
      icon: TrendingUp,
      href: "/analytics",
      color: "text-amber-400",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">Welcome back, Caleb</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-5 h-5 ${stat.color}`} />
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-zinc-500">{stat.label}</div>
            </Link>
          );
        })}
      </div>

      {/* Recent Campaigns */}
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-white">Recent Campaigns</h2>
          <Link href="/campaigns" className="text-sm text-blue-400 hover:text-blue-300">
            View all →
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-500">
            <Mail className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No campaigns yet</p>
            <Link href="/campaigns/new" className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block">
              Create your first campaign →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-white">{c.name}</div>
                  <div className="text-xs text-zinc-500">{formatDate(c.createdAt)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-400">{c._count.sends} sends</span>
                  <CampaignStatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
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
