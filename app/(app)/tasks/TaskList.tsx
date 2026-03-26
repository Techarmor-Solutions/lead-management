"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Linkedin, CheckSquare, MessageSquare, Check, ChevronDown, ChevronUp, Trash2, User } from "lucide-react";
import Link from "next/link";
import type { TaskSend } from "./page";

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

function dueBadge(isOverdue: boolean, isDueToday: boolean, dueAt: Date | string) {
  if (isOverdue) return <span className="text-xs bg-red-900/30 text-red-400 border border-red-700/30 px-1.5 py-0.5 rounded">Overdue</span>;
  if (isDueToday) return <span className="text-xs bg-[#eb9447]/15 text-[#eb9447] border border-[#eb9447]/30 px-1.5 py-0.5 rounded">Due today</span>;
  return (
    <span className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded">
      Due {new Date(dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
function ManualTaskCard({ task, onComplete, onDelete }: {
  task: ManualTaskItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[task.type] ?? TYPE_CONFIG.TASK;
  const contactName = task.contact
    ? [task.contact.firstName, task.contact.lastName].filter(Boolean).join(" ") || "Unknown"
    : null;

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

  // Merge campaign + manual into unified sorted list
  const allTasks: AnyTask[] = [
    ...tasks.map((t) => ({ kind: "campaign" as const, data: t, isOverdue: t.isOverdue, isDueToday: t.isDueToday, dueAt: t.dueAt })),
    ...manualTasks.map((t) => ({ kind: "manual" as const, data: t, isOverdue: t.isOverdue, isDueToday: t.isDueToday, dueAt: new Date(t.dueDate ?? t.createdAt) })),
  ].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  const overdue = allTasks.filter((t) => t.isOverdue);
  const today = allTasks.filter((t) => t.isDueToday);
  const upcoming = allTasks.filter((t) => !t.isOverdue && !t.isDueToday);

  function renderTask(t: AnyTask) {
    if (t.kind === "campaign") return <CampaignTaskCard key={t.data.id} task={t.data} />;
    return <ManualTaskCard key={t.data.id} task={t.data} onComplete={handleComplete} onDelete={handleDelete} />;
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
