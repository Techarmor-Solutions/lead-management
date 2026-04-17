import { prisma } from "@/lib/db";
import CallsView from "./CallsView";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const lists = await prisma.contactList.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      _count: { select: { members: true } },
    },
  });

  return <CallsView lists={lists} />;
}
