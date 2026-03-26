"use client";

import { useState } from "react";
import { CheckSquare, Plus, Check, Trash2, Phone, Linkedin, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "TASK", label: "Task" },
  { value: "CALL", label: "Call" },
  { value: "LINKEDIN_CONNECT", label: "LinkedIn Connect" },
  { value: "LINKEDIN_MESSAGE", label: "LinkedIn Message" },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
  CALL: <Phone className="w-3.5 h-3.5" />,
  LINKEDIN_CONNECT: <Linkedin className="w-3.5 h-3.5" />,
  LINKEDIN_MESSAGE: <MessageSquare className="w-3.5 h-3.5" />,
  TASK: <CheckSquare className="w-3.5 h-3.5" />,
};

const TYPE_COLOR: Record<string, string> = {
  CALL: "text-green-400 bg-green-900/20 border-green-700/30",
  LINKEDIN_CONNECT: "text-sky-400 bg-sky-900/20 border-sky-700/30",
  LINKEDIN_MESSAGE: "text-sky-400 bg-sky-900/20 border-sky-700/30",
  TASK: "text-amber-400 bg-amber-900/20 border-amber-700/30",
};

export interface ManualTask {
  id: string;
  type: string;
  title: string;
  description: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

function dueBadge(dueDate: string | null, completedAt: string | null) {
  if (completedAt) return null;
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const isOverdue = due < now && due.toDateString() !== now.toDateString();
  const isToday = due.toDateString() === now.toDateString();
  if (isOverdue) return <span className="text-xs bg-red-900/30 text-red-400 border border-red-700/30 px-1.5 py-0.5 rounded">Overdue</span>;
  if (isToday) return <span className="text-xs bg-[#eb9447]/15 text-[#eb9447] border border-[#eb9447]/30 px-1.5 py-0.5 rounded">Today</span>;
  return (
    <span className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded">
      {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}

function TaskRow({ task, onComplete, onDelete }: {
  task: ManualTask;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = !!task.completedAt;
  const color = TYPE_COLOR[task.type] ?? TYPE_COLOR.TASK;

  return (
    <div className={`border rounded-lg p-3 transition-colors ${isCompleted ? "border-zinc-800 opacity-50" : "border-zinc-800 hover:border-zinc-700"}`}>
      <div className="flex items-start gap-2">
        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border flex-shrink-0 mt-0.5 ${color}`}>
          {TYPE_ICON[task.type] ?? TYPE_ICON.TASK}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isCompleted ? "line-through text-zinc-500" : "text-white"}`}>{task.title}</span>
            {dueBadge(task.dueDate, task.completedAt)}
            {isCompleted && (
              <span className="text-xs text-zinc-600">
                Done {new Date(task.completedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          {task.description && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-0.5 mt-1 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Hide" : "Notes"}
            </button>
          )}
          {expanded && task.description && (
            <p className="text-xs text-zinc-400 mt-1.5 bg-zinc-800/50 rounded px-2 py-1.5 whitespace-pre-wrap leading-relaxed">
              {task.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!isCompleted && (
            <button
              onClick={() => onComplete(task.id)}
              title="Mark complete"
              className="text-green-400 hover:text-green-300 transition-colors p-1 rounded hover:bg-green-900/20"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
            title="Delete"
            className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-900/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactTasks({ contactId, initial }: { contactId: string; initial: ManualTask[] }) {
  const [tasks, setTasks] = useState<ManualTask[]>(initial);
  const [showCompleted, setShowCompleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", type: "TASK", description: "", dueDate: "" });

  const active = tasks.filter((t) => !t.completedAt);
  const done = tasks.filter((t) => t.completedAt);

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/manual-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        type: form.type,
        description: form.description,
        dueDate: form.dueDate || null,
        contactId,
      }),
    });
    const task = await res.json();
    setTasks((prev) => [task, ...prev]);
    setForm({ title: "", type: "TASK", description: "", dueDate: "" });
    setCreating(false);
    setSaving(false);
  }

  async function handleComplete(id: string) {
    const res = await fetch(`/api/manual-tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complete: true }),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/manual-tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          Tasks {active.length > 0 && <span className="text-xs bg-[#eb9447]/15 text-[#eb9447] px-1.5 py-0.5 rounded-full normal-case font-normal">{active.length}</span>}
        </h2>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add task
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-4 border border-zinc-700 rounded-lg p-3 space-y-2 bg-zinc-900/50">
          <input
            autoFocus
            type="text"
            placeholder="Task title..."
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
            className="input w-full text-sm"
          />
          <div className="flex gap-2">
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="input text-sm flex-1"
            >
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="input text-sm flex-1"
            />
          </div>
          <textarea
            placeholder="Notes (optional)..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="input w-full text-sm resize-none h-16"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="text-xs text-zinc-500 hover:text-white px-3 py-1.5 rounded transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.title.trim()}
              className="text-xs bg-[#eb9447] hover:bg-[#d4833a] text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save task"}
            </button>
          </div>
        </div>
      )}

      {/* Active tasks */}
      {active.length === 0 && !creating ? (
        <p className="text-sm text-zinc-600 italic">No tasks yet</p>
      ) : (
        <div className="space-y-2">
          {active.map((t) => (
            <TaskRow key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Completed tasks */}
      {done.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
          >
            {showCompleted ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {done.length} completed
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-2">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
