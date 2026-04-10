import { prisma } from "@/lib/db";
import ListsView from "./ListsView";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const lists = await prisma.contactList.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true, companyMembers: true } } },
  });

  return (
    <div className="p-8">
      <ListsView lists={lists} />
    </div>
  );
}
