"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Phone,
  ChevronRight,
  SkipForward,
  CheckCircle2,
  BarChart3,
  ArrowLeft,
  Building2,
  User,
  Copy,
  Check,
} from "lucide-react";

interface ListOption {
  id: string;
  name: string;
  _count: { members: number };
}

interface QueueContact {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  phone: string;
  status: string;
  notes: string;
  company: { id: string; name: string } | null;
  lastCall: { outcome: string; date: string } | null;
}

const OUTCOMES = [
  { value: "No answer",          label: "No Answer",       cls: "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700" },
  { value: "Left voicemail",     label: "Left Voicemail",  cls: "bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border-blue-800/50" },
  { value: "Not interested",     label: "Not Interested",  cls: "bg-red-900/30 text-red-300 hover:bg-red-900/50 border-red-800/50" },
  { value: "Callback requested", label: "Callback",        cls: "bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 border-amber-800/50" },
  { value: "Interested",         label: "Interested",      cls: "bg-green-900/30 text-green-300 hover:bg-green-900/50 border-green-800/50" },
  { value: "Converted",          label: "Converted",       cls: "bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 border-purple-800/50" },
];

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  RESPONDED: "Responded",
  QUALIFIED: "Qualified",
  CLOSED: "Closed",
  NOT_INTERESTED: "Not Interested",
  DO_NOT_CONTACT: "Do Not Contact",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-zinc-800 text-zinc-400",
  CONTACTED: "bg-blue-900/30 text-blue-400",
  RESPONDED: "bg-amber-900/30 text-amber-400",
  QUALIFIED: "bg-green-900/30 text-green-400",
  CLOSED: "bg-purple-900/30 text-purple-400",
  NOT_INTERESTED: "bg-red-900/30 text-red-400",
  DO_NOT_CONTACT: "bg-red-900/50 text-red-500",
};

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CallsView({ lists }: { lists: ListOption[] }) {
  const [mode, setMode] = useState<"setup" | "dialing" | "done">("setup");
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const [skipNoPhone, setSkipNoPhone] = useState(true);
  const [skipCalledToday, setSkipCalledToday] = useState(true);
  const [queue, setQueue] = useState<QueueContact[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<{ name: string; outcome: string }[]>([]);
  const [copied, setCopied] = useState(false);

  const contact = queue[currentIndex] ?? null;
  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;

  async function startCalling() {
    if (!listId) return;
    setLoadingQueue(true);
    const params = new URLSearchParams({
      listId,
      skipNoPhone: String(skipNoPhone),
      skipCalledToday: String(skipCalledToday),
    });
    const res = await fetch(`/api/calls/queue?${params}`);
    const data = await res.json();
    setLoadingQueue(false);
    if (!Array.isArray(data) || data.length === 0) return;
    setQueue(data);
    setCurrentIndex(0);
    setOutcome("");
    setNotes("");
    setCallbackDate("");
    setSessionLogs([]);
    setMode("dialing");
  }

  function resetDialer() {
    setOutcome("");
    setNotes("");
    setCallbackDate("");
  }

  async function logAndNext() {
    if (!contact || !outcome) return;
    setSaving(true);

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const fullNotes = [
      callbackDate ? `Callback scheduled for ${callbackDate}.` : "",
      notes.trim(),
    ].filter(Boolean).join(" ");

    await fetch(`/api/contacts/${contact.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CALL", date: dateStr, outcome, notes: fullNotes }),
    });

    const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Contact";
    setSessionLogs((prev) => [...prev, { name, outcome }]);
    setSaving(false);
    advance();
  }

  function skip() {
    advance();
  }

  function advance() {
    const next = currentIndex + 1;
    if (next >= queue.length) {
      setMode("done");
    } else {
      setCurrentIndex(next);
      resetDialer();
      setCopied(false);
    }
  }

  function copyPhone(phone: string) {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function doneForToday() {
    setMode("done");
  }

  function restart() {
    setMode("setup");
    setQueue([]);
    setCurrentIndex(0);
    setSessionLogs([]);
    resetDialer();
  }

  // ── Setup Mode ──────────────────────────────────────────────────────────
  if (mode === "setup") {
    const selectedList = lists.find((l) => l.id === listId);
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Power Dialer</h1>
          <p className="text-zinc-500 text-sm mt-1">Work through a call queue one contact at a time</p>
        </div>

        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wide">Call List</label>
            {lists.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No lists yet.{" "}
                <Link href="/lists" className="text-[#eb9447] hover:text-[#f0a86a]">Create a list first →</Link>
              </p>
            ) : (
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="input w-full"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l._count.members} contacts)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-xs text-zinc-500 uppercase tracking-wide">Queue Filters</label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={skipNoPhone}
                onChange={(e) => setSkipNoPhone(e.target.checked)}
                className="w-4 h-4 rounded accent-[#eb9447]"
              />
              <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                Skip contacts with no phone number
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={skipCalledToday}
                onChange={(e) => setSkipCalledToday(e.target.checked)}
                className="w-4 h-4 rounded accent-[#eb9447]"
              />
              <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                Skip contacts already called today
              </span>
            </label>
          </div>

          {selectedList && (
            <div className="text-xs text-zinc-500 bg-zinc-900 rounded-lg px-3 py-2">
              Queue will be filtered from{" "}
              <span className="text-zinc-300">{selectedList._count.members} contacts</span>{" "}
              in <span className="text-zinc-300">{selectedList.name}</span>
            </div>
          )}

          <button
            onClick={startCalling}
            disabled={!listId || loadingQueue || lists.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-[#eb9447] hover:bg-[#d4833a] disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
          >
            <Phone className="w-4 h-4" />
            {loadingQueue ? "Loading queue..." : "Start Calling"}
            {!loadingQueue && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  // ── Done Mode ────────────────────────────────────────────────────────────
  if (mode === "done") {
    const outcomeCounts: Record<string, number> = {};
    for (const log of sessionLogs) {
      outcomeCounts[log.outcome] = (outcomeCounts[log.outcome] || 0) + 1;
    }
    const outcomeEntries = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1]);

    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="mb-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Session Complete</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {sessionLogs.length === 0
              ? "No calls logged this session."
              : `${sessionLogs.length} call${sessionLogs.length === 1 ? "" : "s"} logged`}
          </p>
        </div>

        {outcomeEntries.length > 0 && (
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">Session Breakdown</h2>
            <div className="grid grid-cols-2 gap-3">
              {outcomeEntries.map(([o, count]) => (
                <div key={o} className="bg-zinc-900 rounded-lg px-3 py-2.5">
                  <div className="text-xl font-bold text-white">{count}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{o}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={restart}
            className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-sm transition-colors"
          >
            Start New Session
          </button>
          <Link
            href="/analytics?tab=calls"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#eb9447] hover:bg-[#d4833a] text-white text-sm font-medium transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            View Analytics
          </Link>
        </div>
      </div>
    );
  }

  // ── Dialing Mode ─────────────────────────────────────────────────────────
  if (!contact) return null;

  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown";
  const selectedOutcome = OUTCOMES.find((o) => o.value === outcome);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={restart}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Setup
        </button>
        <span className="text-sm text-zinc-500">
          <span className="text-white font-medium">{currentIndex + 1}</span> of {queue.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-6">
        <div
          className="bg-[#eb9447] h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Contact card */}
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{contactName}</h2>
            {contact.title && (
              <p className="text-zinc-400 text-sm mt-0.5">{contact.title}</p>
            )}
            {contact.company && (
              <Link
                href={`/companies/${contact.company.id}`}
                className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-[#eb9447] mt-1 transition-colors"
                target="_blank"
              >
                <Building2 className="w-3.5 h-3.5" />
                {contact.company.name}
              </Link>
            )}
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[contact.status] ?? "bg-zinc-800 text-zinc-400"}`}>
            {STATUS_LABELS[contact.status] ?? contact.status}
          </span>
        </div>

        {/* Phone — copy for Google Voice + tel: fallback for mobile */}
        {contact.phone ? (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => copyPhone(contact.phone)}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-900/20 hover:bg-green-900/35 border border-green-800/40 text-green-400 rounded-xl transition-colors text-sm font-medium"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : contact.phone}
            </button>
            <a
              href={`tel:${contact.phone.replace(/\D/g, "")}`}
              title="Open in phone app"
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-colors"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-600 rounded-xl text-sm mb-4">
            <Phone className="w-4 h-4" />
            No phone number
          </div>
        )}

        {/* Last call */}
        {contact.lastCall ? (
          <div className="text-xs text-zinc-500 mb-4">
            Last call:{" "}
            <span className="text-zinc-300">
              {contact.lastCall.outcome || "Logged"}
            </span>{" "}
            · {formatRelativeDate(contact.lastCall.date)}
          </div>
        ) : (
          <div className="text-xs text-zinc-600 mb-4">No previous calls</div>
        )}

        {/* Contact notes */}
        {contact.notes && (
          <div className="flex items-start gap-2 bg-zinc-900 rounded-lg px-3 py-2.5 text-xs text-zinc-400">
            <User className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-zinc-600" />
            <span className="line-clamp-3">{contact.notes}</span>
          </div>
        )}
      </div>

      {/* Outcome selection */}
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 mb-4">
        <label className="block text-xs text-zinc-500 uppercase tracking-wide mb-3">Log Outcome</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                setOutcome(o.value);
                if (o.value !== "Callback requested") setCallbackDate("");
              }}
              className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                outcome === o.value
                  ? o.cls + " ring-2 ring-offset-1 ring-offset-[#1a1a1a] ring-current"
                  : o.cls
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Callback date picker */}
        {outcome === "Callback requested" && (
          <div className="mb-4">
            <label className="block text-xs text-zinc-500 mb-1.5">Schedule callback for</label>
            <input
              type="date"
              value={callbackDate}
              onChange={(e) => setCallbackDate(e.target.value)}
              className="input w-full sm:w-48"
            />
          </div>
        )}

        {/* Notes */}
        {outcome && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened? What did they say?"
              className="input w-full resize-none h-20 text-sm"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={skip}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm transition-colors"
        >
          <SkipForward className="w-4 h-4" />
          Skip
        </button>
        <button
          onClick={doneForToday}
          className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm transition-colors"
        >
          Done for Today
        </button>
        <button
          onClick={logAndNext}
          disabled={!outcome || saving}
          className="flex-1 flex items-center justify-center gap-2 bg-[#eb9447] hover:bg-[#d4833a] disabled:opacity-40 text-white py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          {saving ? "Saving..." : (
            <>
              {selectedOutcome?.label ?? "Log"} & Next
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
