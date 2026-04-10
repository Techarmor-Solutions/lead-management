"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, UserMinus, Search, Building2, Zap, Globe, ExternalLink } from "lucide-react";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  status: string;
  company: { id: string; name: string };
}

interface Member {
  id: string;
  contactId: string;
  contact: Contact;
}

interface CompanyMember {
  id: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    industry: string;
    website: string;
    enrichedAt: Date | string | null;
    _count: { contacts: number };
  };
}

interface List {
  id: string;
  name: string;
  description: string;
  members: Member[];
  companyMembers: CompanyMember[];
}

export default function ListDetail({ list, allContacts }: { list: List; allContacts: Contact[] }) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(list.members);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>(list.companyMembers);
  const [tab, setTab] = useState<"companies" | "contacts">("companies");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichingAll, setEnrichingAll] = useState(false);

  const memberContactIds = useMemo(() => new Set(members.map((m) => m.contactId)), [members]);

  const availableContacts = useMemo(() => {
    const q = pickerSearch.toLowerCase();
    return allContacts.filter((c) => {
      if (memberContactIds.has(c.id)) return false;
      if (!q) return true;
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.name.toLowerCase().includes(q)
      );
    });
  }, [allContacts, memberContactIds, pickerSearch]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addContacts() {
    if (!selectedIds.size) return;
    setSaving(true);
    await fetch(`/api/lists/${list.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: [...selectedIds] }),
    });
    setSaving(false);
    setShowPicker(false);
    setSelectedIds(new Set());
    setPickerSearch("");
    router.refresh();
  }

  async function removeContact(contactId: string) {
    setRemovingId(contactId);
    await fetch(`/api/lists/${list.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    setMembers((prev) => prev.filter((m) => m.contactId !== contactId));
    setRemovingId(null);
  }

  async function removeCompany(companyId: string) {
    setRemovingId(companyId);
    await fetch(`/api/lists/${list.id}/companies`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    setCompanyMembers((prev) => prev.filter((m) => m.companyId !== companyId));
    // Also remove the company's contacts from the local members state
    const removed = companyMembers.find((m) => m.companyId === companyId);
    if (removed) {
      // Refresh to get accurate contact list
      router.refresh();
    }
    setRemovingId(null);
  }

  async function enrichCompany(companyId: string) {
    setEnrichingId(companyId);
    await fetch(`/api/companies/${companyId}/enrich`, { method: "POST" });
    setEnrichingId(null);
    router.refresh();
  }

  async function enrichAll() {
    const unenriched = companyMembers.filter((m) => !m.company.enrichedAt);
    if (unenriched.length === 0) return;
    setEnrichingAll(true);
    await fetch("/api/companies/bulk-enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyIds: unenriched.map((m) => m.companyId) }),
    });
    setEnrichingAll(false);
    router.refresh();
  }

  const unenrichedCount = companyMembers.filter((m) => !m.company.enrichedAt).length;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <a href="/lists" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            Lists
          </a>
          <h1 className="text-2xl font-bold text-white">{list.name}</h1>
          {list.description && <p className="text-zinc-500 text-sm mt-1">{list.description}</p>}
          <p className="text-zinc-600 text-sm mt-1">
            {companyMembers.length} compan{companyMembers.length !== 1 ? "ies" : "y"} · {members.length} contact{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 text-sm bg-[#eb9447] hover:bg-[#d4833a] text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contacts
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-zinc-900 p-1 rounded-lg w-fit">
        {(["companies", "contacts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "companies"
              ? `Companies (${companyMembers.length})`
              : `Contacts (${members.length})`}
          </button>
        ))}
      </div>

      {/* Companies Tab */}
      {tab === "companies" && (
        <div>
          {companyMembers.length > 0 && unenrichedCount > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-500">{unenrichedCount} not yet enriched</span>
              <button
                onClick={enrichAll}
                disabled={enrichingAll}
                className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${enrichingAll ? "animate-pulse text-[#eb9447]" : ""}`} />
                {enrichingAll ? "Enriching..." : `Enrich All (${unenrichedCount})`}
              </button>
            </div>
          )}

          {companyMembers.length === 0 ? (
            <div className="text-center py-20 bg-[#1a1a1a] border border-zinc-800 rounded-xl">
              <Building2 className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">No companies in this list yet</p>
              <p className="text-zinc-600 text-sm mt-1">Add companies from the lead search to get started</p>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Industry</th>
                    <th className="px-4 py-3 text-left">Website</th>
                    <th className="px-4 py-3 text-left">Contacts</th>
                    <th className="px-4 py-3 text-left">Enriched</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {companyMembers.map((m) => {
                    const c = m.company;
                    const isEnriched = !!c.enrichedAt;
                    return (
                      <tr key={m.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/companies/${c.id}`}
                            className="text-sm text-white hover:text-[#eb9447] transition-colors font-medium"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{c.industry || "—"}</td>
                        <td className="px-4 py-3">
                          {c.website ? (
                            <a
                              href={c.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-[#eb9447] hover:text-[#f0a86a] transition-colors"
                            >
                              <Globe className="w-3 h-3" />
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-700 flex items-center gap-1">
                              <Globe className="w-3 h-3" /> No website
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${c._count.contacts > 0 ? "text-white font-medium" : "text-zinc-600"}`}>
                            {c._count.contacts}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isEnriched ? (
                            <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">Done</span>
                          ) : (
                            <button
                              onClick={() => enrichCompany(c.id)}
                              disabled={enrichingId === c.id}
                              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                            >
                              <Zap className={`w-3 h-3 ${enrichingId === c.id ? "animate-pulse text-[#eb9447]" : ""}`} />
                              {enrichingId === c.id ? "..." : "Enrich"}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeCompany(c.id)}
                            disabled={removingId === c.id}
                            className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Remove company and its contacts from list"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Contacts Tab */}
      {tab === "contacts" && (
        <div>
          {members.length === 0 ? (
            <div className="text-center py-20 bg-[#1a1a1a] border border-zinc-800 rounded-xl">
              <p className="text-zinc-400 font-medium">No contacts in this list yet</p>
              <p className="text-zinc-600 text-sm mt-1">Enrich the companies above to discover contacts automatically</p>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const c = m.contact;
                    const isDNC = c.status === "DO_NOT_CONTACT";
                    return (
                      <tr key={m.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/contacts/${c.id}`} className="text-sm text-white hover:text-[#eb9447] transition-colors font-medium">
                            {[c.firstName, c.lastName].filter(Boolean).join(" ") || "(no name)"}
                          </Link>
                          {c.title && <span className="text-xs text-zinc-500 ml-1">· {c.title}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{c.email}</td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{c.company.name}</td>
                        <td className="px-4 py-3">
                          {isDNC && (
                            <span className="text-xs text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded">DNC</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeContact(c.id)}
                            disabled={removingId === c.id}
                            className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Remove from list"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add contacts picker modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-zinc-700 rounded-xl w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h3 className="font-semibold text-white">Add Contacts to List</h3>
              <button onClick={() => { setShowPicker(false); setSelectedIds(new Set()); setPickerSearch(""); }} className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-4 border-b border-zinc-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="input w-full pl-9"
                  placeholder="Search by name, email, or company..."
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {availableContacts.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-8">
                  {allContacts.length === memberContactIds.size ? "All contacts are already in this list" : "No contacts match"}
                </p>
              )}
              {availableContacts.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="w-4 h-4 rounded accent-[#eb9447]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">
                      {[c.firstName, c.lastName].filter(Boolean).join(" ") || "(no name)"}
                      {c.title && <span className="text-zinc-500 ml-1">· {c.title}</span>}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">{c.email} · {c.company.name}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-sm text-zinc-500">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowPicker(false); setSelectedIds(new Set()); setPickerSearch(""); }}
                  className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addContacts}
                  disabled={saving || !selectedIds.size}
                  className="text-sm bg-[#eb9447] hover:bg-[#d4833a] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "Adding..." : `Add ${selectedIds.size || ""} Contact${selectedIds.size !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
