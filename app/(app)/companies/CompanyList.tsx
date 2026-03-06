"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Users, Globe, MapPin, Star, ChevronLeft, ChevronRight } from "lucide-react";

interface Company {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  website: string;
  industry: string;
  rating: number | null;
  enrichedAt: Date | null;
  _count: { contacts: number };
}

interface Props {
  companies: Company[];
  total: number;
  page: number;
  limit: number;
  search: string;
  industryFilter: string;
  industryOptions: string[];
}

export default function CompanyList({
  companies,
  total,
  page,
  limit,
  search: initialSearch,
  industryFilter,
  industryOptions,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const totalPages = Math.ceil(total / limit);

  function navigate(newSearch: string, newIndustry: string, newPage = 1) {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newIndustry) params.set("industry", newIndustry);
    if (newPage > 1) params.set("page", String(newPage));
    router.push(`/companies?${params}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(search, industryFilter);
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input flex-1"
            placeholder="Search companies..."
          />
          <button
            type="submit"
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Search
          </button>
        </form>

        <select
          value={industryFilter}
          onChange={(e) => navigate(search, e.target.value)}
          className="input"
        >
          <option value="">All categories</option>
          {industryOptions.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>

        {(search || industryFilter) && (
          <button
            onClick={() => { setSearch(""); navigate("", ""); }}
            className="text-sm text-zinc-500 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
        {companies.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No companies found</p>
            <Link href="/leads" className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block">
              Discover leads →
            </Link>
          </div>
        ) : (
          <>
            <div className="divide-y divide-zinc-800">
              {companies.map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{c.name}</span>
                      {c.industry && (
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                          {c.industry}
                        </span>
                      )}
                      {c.enrichedAt && (
                        <span className="text-xs bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded">
                          Enriched
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
                      {(c.city || c.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[c.city, c.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {c.website && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {c.website.replace(/^https?:\/\//, "").split("/")[0]}
                        </span>
                      )}
                      {c.rating && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <Star className="w-3 h-3" />
                          {c.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-500 ml-4">
                    <Users className="w-3.5 h-3.5" />
                    {c._count.contacts}
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">
                  {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(search, industryFilter, page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(search, industryFilter, page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
