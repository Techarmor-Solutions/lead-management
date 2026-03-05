import { prisma } from "@/lib/db";
import LeadSearch from "./LeadSearch";
import SavedSearchList from "./SavedSearchList";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const savedSearches = await prisma.savedSearch.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Lead Discovery</h1>
        <p className="text-zinc-500 text-sm mt-1">Search for companies via Google Places</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <LeadSearch />
        </div>
        <div>
          <SavedSearchList savedSearches={savedSearches} />
        </div>
      </div>
    </div>
  );
}
