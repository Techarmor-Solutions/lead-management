"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, Search, Clock } from "lucide-react";
import { Column, Deal, DealContactEntry, StageHistory } from "./types";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  company: { name: string } | null;
}

interface Props {
  deal?: Deal;
  columns: Column[];
  defaultColumnId?: string;
  onClose: () => void;
  onSave: (data: Partial<Deal>) => Promise<Deal>;
  onDelete?: () => Promise<void>;
}

function formatDuration(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0 && hours === 0) return "< 1 hour";
  if (days === 0) return `${hours}h`;
  if (days === 1) return "1 day";
  return `${days} days`;
}

function stageDuration(h: StageHistory): string {
  const end = h.exitedAt ? new Date(h.exitedAt).getTime() : Date.now();
  return formatDuration(end - new Date(h.enteredAt).getTime());
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DealModal({ deal, columns, defaultColumnId, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(deal?.title ?? "");
  const [value, setValue] = useState(deal?.value != null ? String(deal.value) : "");
  const [notes, setNotes] = useState(deal?.notes ?? "");
  const [columnId, setColumnId] = useState(deal?.columnId ?? defaultColumnId ?? columns[0]?.id ?? "");
  const [closeDate, setCloseDate] = useState(
    deal?.closeDate ? new Date(deal.closeDate).toISOString().split("T")[0] : ""
  );
  const [contacts, setContacts] = useState<DealContactEntry[]>(deal?.contacts ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Contact search
  const [contactSearch, setContactSearch] = useState("");
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!contactSearch.trim()) {
      setContactOptions([]);
      setShowDropdown(false);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(contactSearch)}`);
      if (res.ok) {
        const data = await res.json();
        setContactOptions(data.contacts ?? []);
        setShowDropdown(true);
      }
    }, 300);
  }, [contactSearch]);

  async function addContact(c: ContactOption) {
    if (!deal) return;
    if (contacts.some((dc) => dc.contactId === c.id)) return;
    const res = await fetch(`/api/deals/${deal.id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: c.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setContacts((prev) => [...prev, data.dealContact]);
    }
    setContactSearch("");
    setShowDropdown(false);
  }

  async function removeContact(dc: DealContactEntry) {
    if (!deal) return;
    await fetch(`/api/deals/${deal.id}/contacts/${dc.contactId}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c.contactId !== dc.contactId));
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      value: value ? parseFloat(value) : null,
      notes: notes || null,
      closeDate: closeDate || null,
      columnId,
    });
    setSaving(false);
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  const stageHistory = deal?.stageHistory ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">{deal ? "Edit Deal" : "New Deal"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Created date (edit mode only) */}
        {deal && (
          <p className="text-zinc-500 text-xs">
            Created {fmtDate(deal.createdAt)}
          </p>
        )}

        {/* Title */}
        <div>
          <label className="text-zinc-400 text-sm block mb-1">Title *</label>
          <input
            className="input w-full"
            placeholder="Deal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        {/* Value + Close Date side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-zinc-400 text-sm block mb-1">Deal Value</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
              <input
                className="input w-full pl-7"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-zinc-400 text-sm block mb-1">Expected Close</label>
            <input
              className="input w-full"
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
            />
          </div>
        </div>

        {/* Column */}
        <div>
          <label className="text-zinc-400 text-sm block mb-1">Stage</label>
          <select
            className="input w-full"
            value={columnId}
            onChange={(e) => setColumnId(e.target.value)}
          >
            {columns.map((col) => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="text-zinc-400 text-sm block mb-1">Notes</label>
          <textarea
            className="input w-full min-h-[80px] resize-y"
            placeholder="Add notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Contacts */}
        {deal && (
          <div>
            <label className="text-zinc-400 text-sm block mb-2">Contacts</label>
            {contacts.length > 0 && (
              <ul className="mb-3 space-y-2">
                {contacts.map((dc) => (
                  <li key={dc.contactId} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#eb9447]/20 text-[#eb9447] flex items-center justify-center text-xs font-semibold">
                        {dc.contact.firstName?.[0] ?? "?"}
                      </div>
                      <span className="text-sm text-white">
                        {dc.contact.firstName} {dc.contact.lastName}
                        {dc.contact.company && (
                          <span className="text-zinc-400 ml-1">· {dc.contact.company.name}</span>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => removeContact(dc)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                className="input w-full pl-9"
                placeholder="Search contacts to add…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                onFocus={() => contactOptions.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              />
              {showDropdown && contactOptions.length > 0 && (
                <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                  {contactOptions.map((c) => (
                    <li
                      key={c.id}
                      className="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-sm text-white flex items-center gap-2"
                      onMouseDown={() => addContact(c)}
                    >
                      <div className="w-6 h-6 rounded-full bg-[#eb9447]/20 text-[#eb9447] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {c.firstName?.[0] ?? "?"}
                      </div>
                      <span>{c.firstName} {c.lastName}</span>
                      {c.company && <span className="text-zinc-400">· {c.company.name}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Stage History */}
        {deal && stageHistory.length > 0 && (
          <div>
            <label className="text-zinc-400 text-sm flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5" />
              Stage History
            </label>
            <ol className="relative border-l border-zinc-700 space-y-4 ml-2">
              {stageHistory.map((h, i) => {
                const isCurrent = !h.exitedAt;
                return (
                  <li key={h.id} className="ml-4">
                    <span
                      className="absolute -left-1.5 w-3 h-3 rounded-full border-2 border-zinc-900"
                      style={{ backgroundColor: h.column.color }}
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isCurrent ? "text-white" : "text-zinc-300"}`}>
                        {h.column.name}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full">
                            current
                          </span>
                        )}
                      </span>
                      <span className={`text-xs ${h.column.isClosedStage ? "text-zinc-600" : "text-zinc-400"}`}>
                        {h.column.isClosedStage ? "—" : stageDuration(h)}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {fmtDate(h.enteredAt)}
                      {h.exitedAt && ` → ${fmtDate(h.exitedAt)}`}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {deal && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#eb9447] text-black hover:bg-[#eb9447]/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
