"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

const TYPE_OPTIONS = [
  { value: "TASK", label: "Task" },
  { value: "CALL", label: "Call" },
  { value: "LINKEDIN_CONNECT", label: "LinkedIn Connect" },
  { value: "LINKEDIN_MESSAGE", label: "LinkedIn Message" },
];

interface ContactResult {
  id: string;
  firstName: string;
  lastName: string;
  company: { name: string };
}

export default function CreateTaskModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", type: "TASK", description: "", dueDate: "" });
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<ContactResult[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setForm({ title: "", type: "TASK", description: "", dueDate: "" });
      setContactQuery("");
      setContactResults([]);
      setSelectedContact(null);
    }
  }, [open]);

  function handleContactSearch(q: string) {
    setContactQuery(q);
    setSelectedContact(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setContactResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setContactResults(data.contacts ?? []);
    }, 250);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/manual-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        type: form.type,
        description: form.description,
        dueDate: form.dueDate || null,
        contactId: selectedContact?.id ?? null,
      }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-[#eb9447] hover:bg-[#d4833a] text-white text-sm px-4 py-2 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Task
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#141414] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white">New Task</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Title *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Follow up call with John"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  className="input w-full text-sm"
                />
              </div>

              {/* Type + Due Date */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="input w-full text-sm"
                  >
                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 mb-1 block">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="input w-full text-sm"
                  />
                </div>
              </div>

              {/* Contact search */}
              <div className="relative">
                <label className="text-xs text-zinc-500 mb-1 block">Linked Contact (optional)</label>
                {selectedContact ? (
                  <div className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-sm text-white">
                        {[selectedContact.firstName, selectedContact.lastName].filter(Boolean).join(" ")}
                      </span>
                      <span className="text-xs text-zinc-500 ml-2">{selectedContact.company.name}</span>
                    </div>
                    <button onClick={() => { setSelectedContact(null); setContactQuery(""); }} className="text-zinc-500 hover:text-white transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={contactQuery}
                      onChange={(e) => handleContactSearch(e.target.value)}
                      className="input w-full text-sm"
                    />
                    {contactResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-[#1a1a1a] border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                        {contactResults.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedContact(c); setContactQuery(""); setContactResults([]); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                          >
                            <span className="text-sm text-white">{[c.firstName, c.lastName].filter(Boolean).join(" ")}</span>
                            <span className="text-xs text-zinc-500 ml-2">{c.company.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Notes (optional)</label>
                <textarea
                  placeholder="Add any notes or context..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="input w-full text-sm resize-none h-20"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-zinc-800">
              <button onClick={() => setOpen(false)} className="text-sm text-zinc-500 hover:text-white px-4 py-2 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="text-sm bg-[#eb9447] hover:bg-[#d4833a] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
