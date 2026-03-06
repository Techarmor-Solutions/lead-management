"use client";

import { useState, useMemo } from "react";
import { Search, Star, Globe, Phone, MapPin, Plus, Save, SlidersHorizontal } from "lucide-react";

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  rating: number | null;
  totalRatings: number | null;
}

interface SearchResults {
  results: PlaceResult[];
  nextPageToken?: string;
}

export default function LeadSearch() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxRating, setMaxRating] = useState("");
  const [websiteFilter, setWebsiteFilter] = useState<"any" | "yes" | "no">("any");
  const [phoneFilter, setPhoneFilter] = useState<"any" | "yes" | "no">("any");
  const [minReviews, setMinReviews] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [allResults, setAllResults] = useState<PlaceResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Client-side filters applied to API results
  const filteredResults = useMemo(() => {
    return allResults.filter((p) => {
      if (minRating && (p.rating ?? 0) < parseFloat(minRating)) return false;
      if (maxRating && (p.rating ?? 0) > parseFloat(maxRating)) return false;
      if (websiteFilter === "yes" && !p.website) return false;
      if (websiteFilter === "no" && p.website) return false;
      if (phoneFilter === "yes" && !p.phone) return false;
      if (phoneFilter === "no" && p.phone) return false;
      if (minReviews && (p.totalRatings ?? 0) < parseInt(minReviews)) return false;
      return true;
    });
  }, [allResults, minRating, maxRating, websiteFilter, phoneFilter, minReviews]);

  async function handleSearch(e: React.FormEvent, pageToken?: string) {
    e?.preventDefault();
    setLoading(true);

    const params = new URLSearchParams({ query, location });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`/api/leads/search?${params}`);
    const data = await res.json();

    if (pageToken) {
      setAllResults((prev) => [...prev, ...data.results]);
    } else {
      setAllResults(data.results);
    }
    setNextPageToken(data.nextPageToken);
    setLoading(false);
  }

  async function saveCompany(place: PlaceResult) {
    setSaving((prev) => new Set(prev).add(place.placeId));
    await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(place),
    });
    setSaving((prev) => { const n = new Set(prev); n.delete(place.placeId); return n; });
    setSaved((prev) => new Set(prev).add(place.placeId));
  }

  async function saveAllFiltered() {
    const unsaved = filteredResults.filter((p) => !saved.has(p.placeId));
    for (const place of unsaved) {
      await saveCompany(place);
    }
  }

  async function saveSearch() {
    if (!saveName.trim()) return;
    await fetch("/api/leads/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveName,
        query,
        filters: { location, minRating, maxRating, websiteFilter, phoneFilter, minReviews },
      }),
    });
    setShowSaveModal(false);
    setSaveName("");
  }

  const hasActiveFilters = minRating || maxRating || websiteFilter !== "any" || phoneFilter !== "any" || minReviews;

  return (
    <div>
      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Keyword / Business Type</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input w-full"
              placeholder="plumbers, dentists, law firms..."
              required
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input w-full"
              placeholder="Houston TX, nationwide..."
            />
          </div>
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 text-xs mb-3 px-2 py-1 rounded-lg transition-colors ${
            hasActiveFilters
              ? "text-blue-400 bg-blue-900/20"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters{hasActiveFilters ? " (active)" : ""}
        </button>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Min Rating</label>
              <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="input w-full text-xs">
                <option value="">Any</option>
                <option value="3">3+</option>
                <option value="3.5">3.5+</option>
                <option value="4">4+</option>
                <option value="4.5">4.5+</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Max Rating</label>
              <select value={maxRating} onChange={(e) => setMaxRating(e.target.value)} className="input w-full text-xs">
                <option value="">Any</option>
                <option value="3">≤ 3</option>
                <option value="3.5">≤ 3.5</option>
                <option value="4">≤ 4</option>
                <option value="4.5">≤ 4.5</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Min Reviews</label>
              <input
                type="number"
                min="0"
                value={minReviews}
                onChange={(e) => setMinReviews(e.target.value)}
                className="input w-full text-xs"
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Website</label>
              <select value={websiteFilter} onChange={(e) => setWebsiteFilter(e.target.value as never)} className="input w-full text-xs">
                <option value="any">Any</option>
                <option value="yes">Has website</option>
                <option value="no">No website</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Phone</label>
              <select value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value as never)} className="input w-full text-xs">
                <option value="any">Any</option>
                <option value="yes">Has phone</option>
                <option value="no">No phone</option>
              </select>
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => { setMinRating(""); setMaxRating(""); setWebsiteFilter("any"); setPhoneFilter("any"); setMinReviews(""); }}
                  className="text-xs text-zinc-500 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Search
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Search className="w-4 h-4" />
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {/* Results */}
      {allResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-500">
              {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}
              {filteredResults.length !== allResults.length && ` (filtered from ${allResults.length})`}
            </span>
            {filteredResults.length > 1 && (
              <button
                onClick={saveAllFiltered}
                className="text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                Save all ({filteredResults.filter((p) => !saved.has(p.placeId)).length} unsaved)
              </button>
            )}
          </div>

          {filteredResults.map((place) => (
            <div key={place.placeId} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white mb-1">{place.name}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {place.address && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{place.address}</span>
                    )}
                    {place.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{place.phone}</span>
                    )}
                    {place.website ? (
                      <a href={place.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                        <Globe className="w-3 h-3" />Website
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-zinc-700"><Globe className="w-3 h-3" />No website</span>
                    )}
                    {place.rating && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3 h-3" />{place.rating} ({place.totalRatings})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => saveCompany(place)}
                  disabled={saving.has(place.placeId) || saved.has(place.placeId)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ${
                    saved.has(place.placeId)
                      ? "bg-green-900/40 text-green-400 cursor-default"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {saved.has(place.placeId) ? "Saved" : saving.has(place.placeId) ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ))}

          {nextPageToken && (
            <button
              onClick={(e) => handleSearch(e as never, nextPageToken)}
              disabled={loading}
              className="w-full py-2 text-sm text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more results"}
            </button>
          )}
        </div>
      )}

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-zinc-700 rounded-xl p-5 w-full max-w-sm">
            <h3 className="font-semibold text-white mb-3">Save Search</h3>
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="input w-full mb-3"
              placeholder="Search name..."
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={saveSearch} className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
