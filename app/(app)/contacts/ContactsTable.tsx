"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Linkedin, ChevronLeft, ChevronRight, Users } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
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
}

export default function ContactsTable({ contacts, total, page, limit, search: initialSearch, statusFilter }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const totalPages = Math.ceil(total / limit);

  function navigate(newSearch?: string, newStatus?: string, newPage?: number) {
    const params = new URLSearchParams();
    if (newSearch ?? search) params.set("search", newSearch ?? search);
    if (newStatus ?? statusFilter) params.set("status", newStatus ?? statusFilter);
    if (newPage && newPage > 1) params.set("page", String(newPage));
    router.push(`/contacts?${params}`);
  }

  async function updateStatus(contactId: string, status: string) {
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <form
          onSubmit={(e) => { e.preventDefault(); navigate(search); }}
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
          onChange={(e) => navigate(undefined, e.target.value, 1)}
          className="input"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

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
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {contacts.map((c) => (
                  <tr key={c.id} className={`hover:bg-zinc-800/20 transition-colors ${c.status === "DO_NOT_CONTACT" ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown"}
                      </div>
                      {c.title && <div className="text-xs text-zinc-500">{c.title}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/companies/${c.company.id}`} className="text-blue-400 hover:text-blue-300 text-xs">
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
                          <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-blue-400">
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
                    onClick={() => navigate(undefined, undefined, page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(undefined, undefined, page + 1)}
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
