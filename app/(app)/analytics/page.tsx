import { prisma } from "@/lib/db";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { campaign?: string };
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

  return (
    <AnalyticsClient
      campaigns={serialized}
      selectedId={selectedId}
      stats={{ totalSent, totalOpened, totalClicked, totalReplied, totalBounced }}
    />
  );
}
