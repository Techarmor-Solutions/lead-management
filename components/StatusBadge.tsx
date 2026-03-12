import { ContactStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const statusConfig: Record<ContactStatus, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-zinc-800 text-zinc-400" },
  CONTACTED: { label: "Contacted", className: "bg-[#eb9447]/15 text-[#eb9447]" },
  RESPONDED: { label: "Responded", className: "bg-green-900/40 text-green-400" },
  QUALIFIED: { label: "Qualified", className: "bg-purple-900/40 text-purple-400" },
  CLOSED: { label: "Closed", className: "bg-emerald-900/40 text-emerald-400" },
  NOT_INTERESTED: { label: "Not Interested", className: "bg-red-900/40 text-red-400" },
  DO_NOT_CONTACT: { label: "Do Not Contact", className: "bg-red-950/60 text-red-300 border border-red-800/50" },
};

export default function StatusBadge({ status }: { status: ContactStatus }) {
  const config = statusConfig[status] || statusConfig.NEW;
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full flex-shrink-0", config.className)}>
      {config.label}
    </span>
  );
}
