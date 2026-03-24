"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Linkedin, ChevronLeft, ChevronRight, Users, Upload, Trash2, SlidersHorizontal, ChevronDown } from "lucide-react";
import CsvImportModal from "@/components/CsvImportModal";
import { ContactStatus } from "@prisma/client";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  linkedin: string;
  status: ContactStatus;
  company: { id: string; name: string };
}

const STATUSES = ["", "NEW", "CONTACTED", "RESPONDED", "QUALIFIED", "CLOSED", "NOT_INTERESTED", "DO_NOT_CONTACT"];
const STATUS_LABELS: Record<string, string> = {
  "": "All",
  NEW: "New",
  CONTACTED: "Contacted",
  RESPONDED: "Responded",
  QUALIFIED: "Qualified",
  CLOSED: "Closed",
  NOT_INTERESTED: "Not Interested",
  DO_NOT_CONTACT: "Do Not Contact",
};

interface Props {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
  search: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
  lastContactedFrom: string;
  lastContactedTo: string;
}

export default function ContactsTable({
  contacts,
  total,
  page,
  limit,
  search: initialSearch,
  statusFilter,
  dateFrom: initialDateFrom,
  dateTo: initialDateTo,
  lastContactedFrom: initialLastFrom,
  lastContactedTo: initialLastTo,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [showImport, setShowImport] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const totalPages = Math.ceil(total / limit);

  // Advanced filter state
  const [showFilters, setShowFilters] = useState(!!(initialDateFrom || initialDateTo || initialLastFrom || initialLastTo));
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [lastContactedFrom, setLastContactedFrom] = useState(initialLastFrom);
  const [lastContactedTo, setLastContactedTo] = useState(initialLastTo);

  async function handleDelete(contactId: string) {
    if (!confirm("Delete this contact?")) return;
    setDeleting(contactId);
    await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  function navigate(opts: {
    s?: string;
    st?: string;
    pg?: number;
    df?: string;
    dt?: string;
    lcf?: string;
    lct?: string;
  } = {}) {
    const params = new URLSearchParams();
    const s = opts.s ?? search;
    const st = opts.st ?? statusFilter;
    const pg = opts.pg ?? 1;
    const df = opts.df ?? dateFrom;
    const dt = opts.dt ?? dateTo;
    const lcf = opts.lcf ?? lastContactedFrom;
    const lct = opts.lct ?? lastContactedTo;
    if (s) params.set("search", s);
    if (st) params.set("status", st);
    if (pg > 1) params.set("page", String(pg));
    if (df) params.set("dateFrom", df);
    if (dt) params.set("dateTo", dt);
    if (lcf) params.set("lastContactedFrom", lcf);
    if (lct) params.set("lastContactedTo", lct);
    router.push(`/contacts?${params}`);
  }

  function applyFilters() {
    navigate({ df: dateFrom, dt: dateTo, lcf: lastContactedFrom, lct: lastContactedTo, pg: 1 });
  }

  function clearAllFilters() {
    setDateFrom(""); setDateTo(""); setLastContactedFrom(""); setLastContactedTo("");
    navigate({ s: "", st: "", pg: 1, df: "", dt: "", lcf: "", lct: "" });
  }

  async function updateStatus(contactId: string, status: string) {
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  const hasActiveFilters = !!(search || statusFilter || dateFrom || dateTo || lastContactedFrom || lastContactedTo);

  return (
    <div>
      {showImport && <CsvImportModal type="contacts" onClose={() => setShowImport(false)} />}

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <form
          onSubmit={(e) => { e.preventDefault(); navigate({ s: search, pg: 1 }); }}
          className="flex gap-2 flex-1 min-w-0"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input flex-1"
            placeholder="Search contacts..."
          />
          <button type="submit" className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Search
          </button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => navigate({ st: e.target.value, pg: 1 })}
          className="input"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            showFilters || (dateFrom || dateTo || lastContactedFrom || lastContactedTo)
              ? "bg-[#eb9447]/15 text-[#eb9447] border border-[#eb9447]/30"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-zinc-500 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Clear all
          </button>
        )}
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Upload className="w-4 h-4" />
          Import CSV
        </button>
      </div>

      {/* Advanced filter panel */}
      {showFilters && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-4 mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Date Added — From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Date Added — To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Last Contacted — From</label>
              <input
                type="date"
                value={lastContactedFrom}
                onChange={(e) => setLastContactedFrom(e.target.value)}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Last Contacted — To</label>
              <input
                type="date"
                value={lastContactedTo}
                onChange={(e) => setLastContactedTo(e.target.value)}
                className="input w-full text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={applyFilters}
              className="bg-[#eb9447] hover:bg-[#d4833a] text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setLastContactedFrom(""); setLastContactedTo(""); }}
              className="text-xs text-zinc-500 hover:text-white transition-colors px-2"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
        {contacts.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No contacts found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {contacts.map((c) => (
                  <tr key={c.id} className={`hover:bg-zinc-800/20 transition-colors ${c.status === "DO_NOT_CONTACT" ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3">
                      <Link href={`/contacts/${c.id}`} className="font-medium text-white hover:text-[#eb9447] transition-colors">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown"}
                      </Link>
                      {c.title && <div className="text-xs text-zinc-500">{c.title}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/companies/${c.company.id}`} className="text-[#eb9447] hover:text-[#f0a86a] text-xs">
                        {c.company.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {c.email}
                          </a>
                        )}
                        {c.linkedin && (
                          <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-[#eb9447]">
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={c.status}
                        onChange={(e) => updateStatus(c.id, e.target.value)}
                        className="bg-transparent text-xs border-none outline-none cursor-pointer"
                      >
                        {STATUSES.slice(1).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">
                  {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate({ pg: page - 1 })}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate({ pg: page + 1 })}
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
