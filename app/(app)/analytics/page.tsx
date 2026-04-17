import { prisma } from "@/lib/db";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { campaign?: string; tab?: string };
}) {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      sends: {
        select: {
          contactId: true,
          stepId: true,
          sentAt: true,
          openedAt: true,
          clickedAt: true,
          respondedAt: true,
          bouncedAt: true,
          contact: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  const selectedId = searchParams.campaign ?? null;
  const selectedCampaign = selectedId
    ? campaigns.find((c) => c.id === selectedId) ?? null
    : null;

  // Compute stats for selected campaign or all
  const statsSource = selectedCampaign ? [selectedCampaign] : campaigns;
  const allSends = statsSource.flatMap((c) => c.sends);
  const totalSent = allSends.filter((s) => s.sentAt).length;
  const totalOpened = allSends.filter((s) => s.openedAt).length;
  const totalClicked = allSends.filter((s) => s.clickedAt).length;
  const totalReplied = allSends.filter((s) => s.respondedAt).length;
  const totalBounced = allSends.filter((s) => s.bouncedAt).length;

  // Serialize dates as ISO strings for the client component
  const serialized = campaigns.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    approvedAt: c.approvedAt?.toISOString() ?? null,
    sentAt: c.sentAt?.toISOString() ?? null,
    steps: c.steps.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    sends: c.sends.map((s) => ({
      ...s,
      sentAt: s.sentAt?.toISOString() ?? null,
      openedAt: s.openedAt?.toISOString() ?? null,
      clickedAt: s.clickedAt?.toISOString() ?? null,
      respondedAt: s.respondedAt?.toISOString() ?? null,
      bouncedAt: s.bouncedAt?.toISOString() ?? null,
    })),
  }));

  // ── Call analytics ────────────────────────────────────────────────────
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const callActivities = await prisma.activity.findMany({
    where: { type: "CALL" },
    select: { outcome: true, date: true },
    orderBy: { date: "desc" },
  });

  const totalCalls = callActivities.length;
  const todayCalls = callActivities.filter((a) => a.date >= todayStart).length;
  const weekCalls = callActivities.filter((a) => a.date >= weekStart).length;

  const CONNECTED_OUTCOMES = new Set(["Connected", "Callback requested", "Interested", "Converted", "Not interested"]);
  const connected = callActivities.filter((a) => CONNECTED_OUTCOMES.has(a.outcome)).length;
  const converted = callActivities.filter((a) => a.outcome === "Interested" || a.outcome === "Converted").length;
  const connectRate = totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0;
  const conversionRate = connected > 0 ? Math.round((converted / connected) * 100) : 0;

  const outcomeCounts: Record<string, number> = {};
  for (const a of callActivities) {
    const o = a.outcome || "No outcome logged";
    outcomeCounts[o] = (outcomeCounts[o] || 0) + 1;
  }
  const outcomeBreakdown = Object.entries(outcomeCounts)
    .map(([outcome, count]) => ({ outcome, count, pct: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  const dailyMap: Record<string, number> = {};
  for (const a of callActivities) {
    if (a.date >= thirtyDaysAgo) {
      const dateStr = a.date.toISOString().split("T")[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
    }
  }
  const dailyVolume = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split("T")[0];
    return {
      date: dateStr,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: dailyMap[dateStr] || 0,
    };
  });
  const maxDailyCount = Math.max(...dailyVolume.map((d) => d.count), 1);

  const callData = {
    total: totalCalls,
    today: todayCalls,
    thisWeek: weekCalls,
    connectRate,
    conversionRate,
    outcomeBreakdown,
    dailyVolume: dailyVolume.map((d) => ({ ...d, maxCount: maxDailyCount })),
  };

  return (
    <AnalyticsClient
      campaigns={serialized}
      selectedId={selectedId}
      stats={{ totalSent, totalOpened, totalClicked, totalReplied, totalBounced }}
      callData={callData}
      initialTab={(searchParams.tab === "calls" ? "calls" : "email") as "email" | "calls"}
    />
  );
}
