"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Users, Globe, MapPin, Star, ChevronLeft, ChevronRight, Plus, X, Upload, Trash2 } from "lucide-react";
import CsvImportModal from "@/components/CsvImportModal";

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

const emptyForm = {
  name: "",
  industry: "",
  website: "",
  phone: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
};

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
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const totalPages = Math.ceil(total / limit);

  async function handleDelete(e: React.MouseEvent, companyId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this company and all its contacts?")) return;
    setDeleting(companyId);
    await fetch(`/api/companies/${companyId}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

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

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setForm(emptyForm);
    router.refresh();
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

        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import CSV
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#eb9447] hover:bg-[#d4833a] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
        {companies.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No companies found</p>
            <Link href="/leads" className="text-sm text-[#eb9447] hover:text-[#f0a86a] mt-2 inline-block">
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
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Users className="w-3.5 h-3.5" />
                      {c._count.contacts}
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, c.id)}
                      disabled={deleting === c.id}
                      className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

      {showImport && <CsvImportModal type="companies" onClose={() => setShowImport(false)} />}

      {/* Add Company Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="font-semibold text-white">Add Company</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Company Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  className="input w-full"
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Industry</label>
                  <input
                    value={form.industry}
                    onChange={(e) => updateForm("industry", e.target.value)}
                    className="input w-full"
                    placeholder="Restaurants"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Website</label>
                  <input
                    value={form.website}
                    onChange={(e) => updateForm("website", e.target.value)}
                    className="input w-full"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    className="input w-full"
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">City</label>
                  <input
                    value={form.city}
                    onChange={(e) => updateForm("city", e.target.value)}
                    className="input w-full"
                    placeholder="Austin"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">State</label>
                  <input
                    value={form.state}
                    onChange={(e) => updateForm("state", e.target.value)}
                    className="input w-full"
                    placeholder="TX"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">ZIP</label>
                  <input
                    value={form.zip}
                    onChange={(e) => updateForm("zip", e.target.value)}
                    className="input w-full"
                    placeholder="78701"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  className="input w-full resize-none h-20"
                  placeholder="Any notes about this company..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="bg-[#eb9447] hover:bg-[#d4833a] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
