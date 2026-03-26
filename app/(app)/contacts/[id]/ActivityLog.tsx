"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Linkedin, Users, MessageSquare, FileText, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export type ActivityType = "CALL" | "EMAIL" | "LINKEDIN" | "MEETING" | "TEXT" | "NOTE";

export interface Activity {
  id: string;
  type: ActivityType;
  date: Date | string;
  notes: string;
  outcome: string;
}

const TYPES: { value: ActivityType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "CALL",     label: "Call",     icon: <Phone className="w-3.5 h-3.5" />,         color: "text-green-400 bg-green-600/10" },
  { value: "EMAIL",    label: "Email",    icon: <Mail className="w-3.5 h-3.5" />,          color: "text-[#eb9447] bg-[#eb9447]/10" },
  { value: "LINKEDIN", label: "LinkedIn", icon: <Linkedin className="w-3.5 h-3.5" />,      color: "text-sky-400 bg-sky-600/10" },
  { value: "MEETING",  label: "Meeting",  icon: <Users className="w-3.5 h-3.5" />,         color: "text-purple-400 bg-purple-600/10" },
  { value: "TEXT",     label: "Text",     icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-amber-400 bg-amber-600/10" },
  { value: "NOTE",     label: "Note",     icon: <FileText className="w-3.5 h-3.5" />,      color: "text-zinc-400 bg-zinc-700/40" },
];

const OUTCOMES = ["", "Left voicemail", "No answer", "Connected", "Not interested", "Callback requested", "Interested", "Converted"];

function typeInfo(type: ActivityType) {
  return TYPES.find((t) => t.value === type) ?? TYPES[5];
}

function parseLocalDate(d: Date | string): Date {
  // Extract the date portion and build a local date to avoid UTC-offset day shifts
  const iso = typeof d === "string" ? d : d.toISOString();
  const [year, month, day] = iso.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(d: Date | string) {
  const date = parseLocalDate(d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

export default function ActivityLog({ contactId, initial, onStatusChange }: {
  contactId: string;
  initial: Activity[];
  onStatusChange?: (status: string) => void;
}) {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ActivityType>("CALL");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function logActivity() {
    if (!type) return;
    setSaving(true);
    const res = await fetch(`/api/contacts/${contactId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, date, notes, outcome }),
    });
    const created = await res.json();
    if (created.newStatus) onStatusChange?.(created.newStatus);
    setActivities((prev) => [created, ...prev]);
    setShowForm(false);
    setNotes("");
    setOutcome("");
    const d = new Date();
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setSaving(false);
    router.refresh();
  }

  async function deleteActivity(id: string) {
    setDeletingId(id);
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    setActivities((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Activity Log</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          Log Activity
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div className="mb-4 p-4 bg-zinc-900 border border-zinc-700 rounded-xl space-y-3">
          {/* Type selector */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    type === t.value
                      ? `${t.color} border-current`
                      : "bg-zinc-800/50 text-zinc-500 border-transparent hover:text-zinc-300"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Outcome</label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="input w-full text-sm"
              >
                {OUTCOMES.map((o) => <option key={o} value={o}>{o || "— select outcome —"}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened? What did they say?"
              className="input w-full text-sm resize-none h-20"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={logActivity}
              disabled={saving}
              className="text-sm bg-[#eb9447] hover:bg-[#d4833a] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {activities.length === 0 ? (
        <p className="text-sm text-zinc-600 italic">No activity logged yet</p>
      ) : (
        <div className="space-y-0">
          {activities.map((a, i) => {
            const info = typeInfo(a.type);
            return (
              <div key={a.id} className="flex gap-3 group">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${info.color}`}>
                    {info.icon}
                  </div>
                  {i < activities.length - 1 && (
                    <div className="w-px flex-1 bg-zinc-800 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${i < activities.length - 1 ? "pb-4" : "pb-1"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium text-white">{info.label}</span>
                      {a.outcome && (
                        <span className="ml-2 text-xs text-zinc-500">· {a.outcome}</span>
                      )}
                      <span className="ml-2 text-xs text-zinc-600">{formatDate(a.date)}</span>
                    </div>
                    <button
                      onClick={() => deleteActivity(a.id)}
                      disabled={deletingId === a.id}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {a.notes && (
                    <p className="text-sm text-zinc-400 mt-0.5 leading-relaxed">{a.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
