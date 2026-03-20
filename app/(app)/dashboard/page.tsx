import { prisma } from "@/lib/db";
import { formatDate, pct } from "@/lib/utils";
import Link from "next/link";
import { Building2, Users, Mail, TrendingUp, ArrowRight, Phone, Linkedin, CheckSquare, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [companyCount, contactCount, campaigns, recentSends, scheduledTasks] = await Promise.all([
    prisma.company.count(),
    prisma.contact.count(),
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { sends: true } } },
    }),
    prisma.send.aggregate({
      _count: { id: true },
      where: { sentAt: { not: null }, step: { stepType: "EMAIL" } },
    }),
    prisma.send.findMany({
      where: {
        status: "SCHEDULED",
        step: { stepType: { in: ["CALL", "TASK", "LINKEDIN_CONNECT", "LINKEDIN_MESSAGE"] } },
        campaign: { status: "ACTIVE" },
      },
      include: {
        contact: { include: { company: { select: { name: true } } } },
        step: { select: { stepNumber: true, stepType: true, label: true } },
        campaign: { select: { id: true, name: true, sentAt: true, steps: { select: { stepNumber: true, delayDays: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const now = new Date();
  const dueTasks = scheduledTasks
    .map((send) => {
      const totalDelayDays = send.campaign.steps
        .filter((s) => s.stepNumber <= send.step.stepNumber)
        .reduce((sum, s) => sum + s.delayDays, 0);
      const dueAt = new Date((send.campaign.sentAt?.getTime() ?? Date.now()) + totalDelayDays * 86400000);
      return { ...send, dueAt, isOverdue: dueAt < now, isDueToday: dueAt.toDateString() === now.toDateString() };
    })
    .filter((t) => t.isOverdue || t.isDueToday)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 5);

  const openCount = await prisma.send.count({ where: { openedAt: { not: null } } });
  const responseCount = await prisma.send.count({ where: { respondedAt: { not: null } } });
  const totalSent = recentSends._count.id;

  const stats = [
    { label: "Companies", value: companyCount, icon: Building2, href: "/companies", color: "text-[#eb9447]" },
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

      {/* Due Tasks */}
      {dueTasks.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#eb9447]/30 rounded-xl mb-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#eb9447]" />
              Tasks Due
              <span className="text-xs bg-[#eb9447]/15 text-[#eb9447] px-1.5 py-0.5 rounded-full ml-1">{dueTasks.length}</span>
            </h2>
            <Link href="/tasks" className="text-sm text-[#eb9447] hover:text-[#f0a86a]">View all →</Link>
          </div>
          <div className="divide-y divide-zinc-800">
            {dueTasks.map((task) => {
              const icons: Record<string, React.ReactNode> = {
                CALL: <Phone className="w-3.5 h-3.5 text-green-400" />,
                LINKEDIN_CONNECT: <Linkedin className="w-3.5 h-3.5 text-sky-400" />,
                LINKEDIN_MESSAGE: <MessageSquare className="w-3.5 h-3.5 text-sky-400" />,
                TASK: <CheckSquare className="w-3.5 h-3.5 text-amber-400" />,
              };
              const contactName = [task.contact.firstName, task.contact.lastName].filter(Boolean).join(" ") || task.contact.email;
              return (
                <Link key={task.id} href="/tasks" className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex-shrink-0">{icons[task.step.stepType]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{contactName} — {task.contact.company.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{task.step.label} · {task.campaign.name}</div>
                  </div>
                  {task.isOverdue && <span className="text-xs text-red-400 flex-shrink-0">Overdue</span>}
                  {task.isDueToday && !task.isOverdue && <span className="text-xs text-[#eb9447] flex-shrink-0">Today</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Campaigns */}
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-white">Recent Campaigns</h2>
          <Link href="/campaigns" className="text-sm text-[#eb9447] hover:text-[#f0a86a]">
            View all →
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-500">
            <Mail className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No campaigns yet</p>
            <Link href="/campaigns/new" className="text-sm text-[#eb9447] hover:text-[#f0a86a] mt-2 inline-block">
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
