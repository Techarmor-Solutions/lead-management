import { prisma } from "@/lib/db";
import TaskList from "./TaskList";
import { CheckSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export type TaskSend = {
  id: string;
  contactId: string;
  dueAt: Date;
  isOverdue: boolean;
  isDueToday: boolean;
  contact: { firstName: string; lastName: string; email: string; company: { name: string } };
  step: { stepType: string; label: string; body: string };
  campaign: { id: string; name: string };
};

export default async function TasksPage() {
  const scheduled = await prisma.send.findMany({
    where: {
      status: "SCHEDULED",
      step: { stepType: { in: ["CALL", "TASK", "LINKEDIN_CONNECT", "LINKEDIN_MESSAGE"] } },
      campaign: { status: "ACTIVE" },
    },
    include: {
      contact: { include: { company: { select: { name: true } } } },
      step: { select: { stepNumber: true, stepType: true, label: true, body: true } },
      campaign: {
        select: {
          id: true,
          name: true,
          sentAt: true,
          steps: { select: { stepNumber: true, delayDays: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const tasks: TaskSend[] = scheduled
    .map((send) => {
      const totalDelayDays = send.campaign.steps
        .filter((s) => s.stepNumber <= send.step.stepNumber)
        .reduce((sum, s) => sum + s.delayDays, 0);
      const dueAt = new Date((send.campaign.sentAt?.getTime() ?? Date.now()) + totalDelayDays * 86400000);
      const isOverdue = dueAt < now;
      const isDueToday = !isOverdue && dueAt.toDateString() === now.toDateString();
      return {
        id: send.id,
        contactId: send.contactId,
        dueAt,
        isOverdue,
        isDueToday,
        contact: send.contact,
        step: send.step,
        campaign: { id: send.campaign.id, name: send.campaign.name },
      };
    })
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  const dueCount = tasks.filter((t) => t.isOverdue || t.isDueToday).length;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-[#eb9447]" />
          Tasks
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          {dueCount > 0 ? (
            <span className="text-[#eb9447]">{dueCount} task{dueCount !== 1 ? "s" : ""} due</span>
          ) : (
            "All caught up"
          )}
          {tasks.length > dueCount && ` · ${tasks.length - dueCount} upcoming`}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl py-16 text-center">
          <CheckSquare className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-400 font-medium">No tasks right now</p>
          <p className="text-zinc-600 text-sm mt-1">Tasks from active campaigns will appear here</p>
        </div>
      ) : (
        <TaskList tasks={tasks} />
      )}
    </div>
  );
}
