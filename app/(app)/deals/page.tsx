import { prisma } from "@/lib/db";
import DealsBoard from "./DealsBoard";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const DEFAULT_COLUMNS = [
    { name: "Prospect", color: "#3b82f6", position: 0 },
    { name: "Proposal Sent", color: "#f59e0b", position: 1 },
    { name: "Closed Won", color: "#10b981", position: 2 },
  ];

  let columns = await prisma.pipelineColumn.findMany({
    orderBy: { position: "asc" },
    include: {
      deals: {
        orderBy: { position: "asc" },
        include: {
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
        },
      },
    },
  });

  if (columns.length === 0) {
    await prisma.pipelineColumn.createMany({ data: DEFAULT_COLUMNS });
    columns = await prisma.pipelineColumn.findMany({
      orderBy: { position: "asc" },
      include: {
        deals: {
          orderBy: { position: "asc" },
          include: {
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
          },
        },
      },
    });
  }

  return <DealsBoard initialColumns={columns as any} />;
}
