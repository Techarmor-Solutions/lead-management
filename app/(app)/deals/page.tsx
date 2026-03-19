import { prisma } from "@/lib/db";
import DealsBoard from "./DealsBoard";

export const dynamic = "force-dynamic";

const dealInclude = {
  contacts: {
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: { select: { name: true } },
        },
      },
    },
  },
  stageHistory: {
    orderBy: { enteredAt: "asc" as const },
    include: {
      column: { select: { name: true, color: true, isClosedStage: true } },
    },
  },
};

const DEFAULT_COLUMNS = [
  { name: "Prospect", color: "#3b82f6", position: 0, isClosedStage: false },
  { name: "Proposal Sent", color: "#f59e0b", position: 1, isClosedStage: false },
  { name: "Closed Won", color: "#10b981", position: 2, isClosedStage: true },
];

export default async function DealsPage() {
  let columns = await prisma.pipelineColumn.findMany({
    orderBy: { position: "asc" },
    include: { deals: { orderBy: { position: "asc" }, include: dealInclude } },
  });

  if (columns.length === 0) {
    await prisma.pipelineColumn.createMany({ data: DEFAULT_COLUMNS });
    columns = await prisma.pipelineColumn.findMany({
      orderBy: { position: "asc" },
      include: { deals: { orderBy: { position: "asc" }, include: dealInclude } },
    });
  }

  return <DealsBoard initialColumns={columns as any} />;
}
