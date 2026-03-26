import { prisma } from "@/lib/db";
import TaskList, { ManualTaskItem } from "./TaskList";
import CreateTaskModal from "./CreateTaskModal";
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
  const now = new Date();

  const [scheduled, manualRaw] = await Promise.all([
    prisma.send.findMany({
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
    }),
    prisma.manualTask.findMany({
      where: { completedAt: null },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } } },
      },
    }),
  ]);

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

  const manualTasks: ManualTaskItem[] = manualRaw.map((t) => {
    const dueDate = t.dueDate ? t.dueDate.toISOString() : null;
    const isOverdue = !!dueDate && new Date(dueDate) < now && new Date(dueDate).toDateString() !== now.toDateString();
    const isDueToday = !!dueDate && new Date(dueDate).toDateString() === now.toDateString();
    return {
      id: t.id,
      type: t.type,
      title: t.title,
      description: t.description,
      dueDate,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      isOverdue,
      isDueToday,
      contact: t.contact,
    };
  });

  const totalDue = tasks.filter((t) => t.isOverdue || t.isDueToday).length
    + manualTasks.filter((t) => t.isOverdue || t.isDueToday).length;
  const totalCount = tasks.length + manualTasks.length;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#eb9447]" />
            Tasks
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {totalDue > 0 ? (
              <span className="text-[#eb9447]">{totalDue} task{totalDue !== 1 ? "s" : ""} due</span>
            ) : (
              "All caught up"
            )}
            {totalCount > totalDue && ` · ${totalCount - totalDue} upcoming`}
          </p>
        </div>
        <CreateTaskModal />
      </div>

      {totalCount === 0 ? (
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl py-16 text-center">
          <CheckSquare className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-400 font-medium">No tasks right now</p>
          <p className="text-zinc-600 text-sm mt-1">Create a task or they will appear from active campaigns</p>
        </div>
      ) : (
        <TaskList tasks={tasks} manualTasks={manualTasks} />
      )}
    </div>
  );
}
