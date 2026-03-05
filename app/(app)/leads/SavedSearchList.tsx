"use client";

import { SavedSearch } from "@prisma/client";
import { useState } from "react";
import { Play, Trash2, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Props {
  savedSearches: SavedSearch[];
}

export default function SavedSearchList({ savedSearches: initial }: Props) {
  const [searches, setSearches] = useState(initial);
  const router = useRouter();

  async function deleteSearch(id: string) {
    await fetch(`/api/leads/saved-searches/${id}`, { method: "DELETE" });
    setSearches((prev) => prev.filter((s) => s.id !== id));
  }

  async function runSearch(search: SavedSearch) {
    await fetch(`/api/leads/saved-searches/${search.id}/run`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Saved Searches</h3>
      </div>
      {searches.length === 0 ? (
        <div className="px-4 py-8 text-center text-zinc-500 text-sm">
          No saved searches yet
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {searches.map((s) => {
            const filters = s.filters as Record<string, string>;
            return (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{s.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {s.query}
                      {filters.location ? ` · ${filters.location}` : ""}
                    </div>
                    {s.lastRunAt && (
                      <div className="flex items-center gap-1 text-xs text-zinc-600 mt-1">
                        <Clock className="w-3 h-3" />
                        Last run {formatDate(s.lastRunAt)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => runSearch(s)}
                      className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Run search"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSearch(s.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
