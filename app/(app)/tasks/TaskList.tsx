"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Linkedin, CheckSquare, MessageSquare, Check, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import type { TaskSend } from "./page";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CALL: { label: "Cold Call", icon: <Phone className="w-4 h-4" />, color: "text-green-400 bg-green-900/20 border-green-700/30" },
  LINKEDIN_CONNECT: { label: "LinkedIn Connect", icon: <Linkedin className="w-4 h-4" />, color: "text-sky-400 bg-sky-900/20 border-sky-700/30" },
  LINKEDIN_MESSAGE: { label: "LinkedIn Message", icon: <MessageSquare className="w-4 h-4" />, color: "text-sky-400 bg-sky-900/20 border-sky-700/30" },
  TASK: { label: "Task", icon: <CheckSquare className="w-4 h-4" />, color: "text-amber-400 bg-amber-900/20 border-amber-700/30" },
};

function dueBadge(task: TaskSend) {
  if (task.isOverdue) return <span className="text-xs bg-red-900/30 text-red-400 border border-red-700/30 px-1.5 py-0.5 rounded">Overdue</span>;
  if (task.isDueToday) return <span className="text-xs bg-[#eb9447]/15 text-[#eb9447] border border-[#eb9447]/30 px-1.5 py-0.5 rounded">Due today</span>;
  return (
    <span className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded">
      Due {task.dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}

function TaskCard({ task }: { task: TaskSend }) {
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
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 opacity-40 transition-opacity flex items-center gap-3">
        <Check className="w-5 h-5 text-green-400" />
        <span className="text-sm text-zinc-400">Marked complete</span>
      </div>
    );
  }

  return (
    <div className={`bg-[#1a1a1a] border rounded-xl p-4 transition-colors ${task.isOverdue ? "border-red-900/40" : task.isDueToday ? "border-[#eb9447]/30" : "border-zinc-800"}`}>
      <div className="flex items-start gap-3">
        {/* Type badge */}
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border flex-shrink-0 mt-0.5 ${cfg.color}`}>
          {cfg.icon}
          <span>{cfg.label}</span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-white">{contactName}</div>
              <div className="text-xs text-zinc-500">{task.contact.company.name}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {dueBadge(task)}
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
            <span>{task.step.label}</span>
            <span>·</span>
            <Link href={`/campaigns/${task.campaign.id}`} className="hover:text-zinc-300 transition-colors truncate max-w-[160px]">
              {task.campaign.name}
            </Link>
          </div>

          {/* Notes/script */}
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

        {/* Complete button */}
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

export default function TaskList({ tasks }: { tasks: TaskSend[] }) {
  const overdue = tasks.filter((t) => t.isOverdue);
  const today = tasks.filter((t) => t.isDueToday);
  const upcoming = tasks.filter((t) => !t.isOverdue && !t.isDueToday);

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-red-400 mb-3">Overdue ({overdue.length})</h2>
          <div className="space-y-2">
            {overdue.map((t) => <TaskCard key={t.id} task={t} />)}
          </div>
        </section>
      )}

      {today.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-[#eb9447] mb-3">Due Today ({today.length})</h2>
          <div className="space-y-2">
            {today.map((t) => <TaskCard key={t.id} task={t} />)}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-zinc-500 mb-3">Upcoming ({upcoming.length})</h2>
          <div className="space-y-2">
            {upcoming.map((t) => <TaskCard key={t.id} task={t} />)}
          </div>
        </section>
      )}
    </div>
  );
}
