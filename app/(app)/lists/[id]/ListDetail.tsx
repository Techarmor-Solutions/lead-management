"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, UserMinus, Search } from "lucide-react";

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

interface List {
  id: string;
  name: string;
  description: string;
  members: Member[];
}

export default function ListDetail({ list, allContacts }: { list: List; allContacts: Contact[] }) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(list.members);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <a href="/lists" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            Lists
          </a>
          <h1 className="text-2xl font-bold text-white">{list.name}</h1>
          {list.description && <p className="text-zinc-500 text-sm mt-1">{list.description}</p>}
          <p className="text-zinc-600 text-sm mt-1">{members.length} contact{members.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 text-sm bg-[#eb9447] hover:bg-[#d4833a] text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contacts
        </button>
      </div>

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

      {/* Members table */}
      {members.length === 0 ? (
        <div className="text-center py-20 bg-[#1a1a1a] border border-zinc-800 rounded-xl">
          <p className="text-zinc-400 font-medium">No contacts in this list yet</p>
          <p className="text-zinc-600 text-sm mt-1">Click "Add Contacts" to get started</p>
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
    </>
  );
}
