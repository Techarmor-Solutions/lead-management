"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Phone, Linkedin, CheckSquare, MessageSquare, Check, ChevronDown, ChevronUp, Trash2, User, Pencil, X } from "lucide-react";
import Link from "next/link";
import type { TaskSend } from "./page";

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

export interface ManualTaskItem {
  id: string;
  type: string;
  title: string;
  description: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  isOverdue: boolean;
  isDueToday: boolean;
  contact: { id: string; firstName: string; lastName: string; company: { name: string } } | null;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CALL: { label: "Call", icon: <Phone className="w-4 h-4" />, color: "text-green-400 bg-green-900/20 border-green-700/30" },
  LINKEDIN_CONNECT: { label: "LinkedIn Connect", icon: <Linkedin className="w-4 h-4" />, color: "text-sky-400 bg-sky-900/20 border-sky-700/30" },
  LINKEDIN_MESSAGE: { label: "LinkedIn Message", icon: <MessageSquare className="w-4 h-4" />, color: "text-sky-400 bg-sky-900/20 border-sky-700/30" },
  TASK: { label: "Task", icon: <CheckSquare className="w-4 h-4" />, color: "text-amber-400 bg-amber-900/20 border-amber-700/30" },
};

function parseLocalDate(d: Date | string): Date {
  const iso = typeof d === "string" ? d : d.toISOString();
  const [year, month, day] = iso.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dueBadge(isOverdue: boolean, isDueToday: boolean, dueAt: Date | string) {
  if (isOverdue) return <span className="text-xs bg-red-900/30 text-red-400 border border-red-700/30 px-1.5 py-0.5 rounded">Overdue</span>;
  if (isDueToday) return <span className="text-xs bg-[#eb9447]/15 text-[#eb9447] border border-[#eb9447]/30 px-1.5 py-0.5 rounded">Due today</span>;
  return (
    <span className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded">
      Due {parseLocalDate(dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}

// Campaign task card (existing behavior)
function CampaignTaskCard({ task }: { task: TaskSend }) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cfg = TYPE_CONFIG[task.step.stepType] ?? TYPE_CONFIG.TASK;
  const contactName = [task.contact.firstName, task.contact.lastName].filter(Boolean).join(" ") || task.contact.email;

  async function handleComplete() {
    setCompleting(true);
    await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" });
    setDone(true);
    setCompleting(false);
    setTimeout(() => router.refresh(), 600);
  }

  if (done) {
    return (
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 opacity-40 flex items-center gap-3">
        <Check className="w-5 h-5 text-green-400" />
        <span className="text-sm text-zinc-400">Marked complete</span>
      </div>
    );
  }

  return (
    <div className={`bg-[#1a1a1a] border rounded-xl p-4 transition-colors ${task.isOverdue ? "border-red-900/40" : task.isDueToday ? "border-[#eb9447]/30" : "border-zinc-800"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border flex-shrink-0 mt-0.5 ${cfg.color}`}>
          {cfg.icon}
          <span>{cfg.label}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-white">{contactName}</div>
              <div className="text-xs text-zinc-500">{task.contact.company.name}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {dueBadge(task.isOverdue, task.isDueToday, task.dueAt)}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
            <span>{task.step.label}</span>
            <span>·</span>
            <Link href={`/campaigns/${task.campaign.id}`} className="hover:text-zinc-300 transition-colors truncate max-w-[160px]">
              {task.campaign.name}
            </Link>
          </div>
          {task.step.body && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "Hide notes" : "View notes"}
              </button>
              {expanded && (
                <div className="mt-2 text-xs text-zinc-400 bg-zinc-800/50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">
                  {task.step.body}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleComplete}
          disabled={completing}
          className="flex items-center gap-1.5 text-xs bg-green-900/20 hover:bg-green-900/40 border border-green-700/40 text-green-400 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
        >
          <Check className="w-3.5 h-3.5" />
          {completing ? "..." : "Done"}
        </button>
      </div>
    </div>
  );
}

// Manual task card
function ManualTaskCard({ task, onComplete, onDelete, onUpdate }: {
  task: ManualTaskItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updated: ManualTaskItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: task.title,
    type: task.type,
    description: task.description,
    dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
  });
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<ContactResult[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(
    task.contact ? { id: task.contact.id, firstName: task.contact.firstName, lastName: task.contact.lastName, company: task.contact.company } : null
  );
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cfg = TYPE_CONFIG[task.type] ?? TYPE_CONFIG.TASK;
  const contactName = task.contact
    ? [task.contact.firstName, task.contact.lastName].filter(Boolean).join(" ") || "Unknown"
    : null;

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
    if (!editForm.title.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/manual-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title.trim(),
        type: editForm.type,
        description: editForm.description,
        dueDate: editForm.dueDate || null,
        contactId: selectedContact?.id ?? null,
      }),
    });
    const updated = await res.json();
    const now = new Date();
    const dueDate = updated.dueDate ?? null;
    const isOverdue = !!dueDate && parseLocalDate(dueDate) < now && parseLocalDate(dueDate).toDateString() !== now.toDateString();
    const isDueToday = !!dueDate && parseLocalDate(dueDate).toDateString() === now.toDateString();
    onUpdate(task.id, { ...updated, dueDate, completedAt: updated.completedAt ?? null, createdAt: updated.createdAt, isOverdue, isDueToday });
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="bg-[#1a1a1a] border border-zinc-700 rounded-xl p-4 space-y-3">
        <input
          autoFocus
          type="text"
          value={editForm.title}
          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
          onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
          className="input w-full text-sm"
          placeholder="Task title..."
        />
        <div className="flex gap-3">
          <select
            value={editForm.type}
            onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
            className="input text-sm flex-1"
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            type="date"
            value={editForm.dueDate}
            onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
            className="input text-sm flex-1"
          />
        </div>
        {/* Contact */}
        <div className="relative">
          {selectedContact ? (
            <div className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
              <span className="text-sm text-white">
                {[selectedContact.firstName, selectedContact.lastName].filter(Boolean).join(" ")}
                <span className="text-zinc-500 ml-2 text-xs">{selectedContact.company.name}</span>
              </span>
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
        <textarea
          placeholder="Notes (optional)..."
          value={editForm.description}
          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
          className="input w-full text-sm resize-none h-16"
        />
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(false)} className="text-xs text-zinc-500 hover:text-white px-3 py-1.5 rounded transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editForm.title.trim()}
            className="text-xs bg-[#eb9447] hover:bg-[#d4833a] text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#1a1a1a] border rounded-xl p-4 transition-colors ${task.isOverdue ? "border-red-900/40" : task.isDueToday ? "border-[#eb9447]/30" : "border-zinc-800"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border flex-shrink-0 mt-0.5 ${cfg.color}`}>
          {cfg.icon}
          <span>{cfg.label}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-white">{task.title}</div>
              {contactName && task.contact && (
                <Link href={`/contacts/${task.contact.id}`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3" />
                  {contactName} · {task.contact.company.name}
                </Link>
              )}
              {!contactName && <div className="text-xs text-zinc-600 italic mt-0.5">No contact linked</div>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {task.dueDate && dueBadge(task.isOverdue, task.isDueToday, task.dueDate)}
            </div>
          </div>
          {task.description && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "Hide notes" : "View notes"}
              </button>
              {expanded && (
                <div className="mt-2 text-xs text-zinc-400 bg-zinc-800/50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">
                  {task.description}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-2 rounded-lg hover:bg-zinc-800"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onComplete(task.id)}
            className="flex items-center gap-1.5 text-xs bg-green-900/20 hover:bg-green-900/40 border border-green-700/40 text-green-400 px-3 py-2 rounded-lg transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Done
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-zinc-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-900/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

type AnyTask =
  | { kind: "campaign"; data: TaskSend; isOverdue: boolean; isDueToday: boolean; dueAt: Date }
  | { kind: "manual"; data: ManualTaskItem; isOverdue: boolean; isDueToday: boolean; dueAt: Date };

export default function TaskList({ tasks, manualTasks: initialManual }: { tasks: TaskSend[]; manualTasks: ManualTaskItem[] }) {
  const router = useRouter();
  const [manualTasks, setManualTasks] = useState<ManualTaskItem[]>(initialManual);

  async function handleComplete(id: string) {
    await fetch(`/api/manual-tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complete: true }),
    });
    setManualTasks((prev) => prev.filter((t) => t.id !== id));
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/manual-tasks/${id}`, { method: "DELETE" });
    setManualTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleUpdate(id: string, updated: ManualTaskItem) {
    setManualTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  // Merge campaign + manual into unified sorted list
  const allTasks: AnyTask[] = [
    ...tasks.map((t) => ({ kind: "campaign" as const, data: t, isOverdue: t.isOverdue, isDueToday: t.isDueToday, dueAt: t.dueAt })),
    ...manualTasks.map((t) => ({ kind: "manual" as const, data: t, isOverdue: t.isOverdue, isDueToday: t.isDueToday, dueAt: t.dueDate ? parseLocalDate(t.dueDate) : new Date(t.createdAt) })),
  ].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  const overdue = allTasks.filter((t) => t.isOverdue);
  const today = allTasks.filter((t) => t.isDueToday);
  const upcoming = allTasks.filter((t) => !t.isOverdue && !t.isDueToday);

  function renderTask(t: AnyTask) {
    if (t.kind === "campaign") return <CampaignTaskCard key={t.data.id} task={t.data} />;
    return <ManualTaskCard key={t.data.id} task={t.data} onComplete={handleComplete} onDelete={handleDelete} onUpdate={handleUpdate} />;
  }

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-red-400 mb-3">Overdue ({overdue.length})</h2>
          <div className="space-y-2">{overdue.map(renderTask)}</div>
        </section>
      )}
      {today.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-[#eb9447] mb-3">Due Today ({today.length})</h2>
          <div className="space-y-2">{today.map(renderTask)}</div>
        </section>
      )}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-500 mb-3">Upcoming ({upcoming.length})</h2>
          <div className="space-y-2">{upcoming.map(renderTask)}</div>
        </section>
      )}
    </div>
  );
}
