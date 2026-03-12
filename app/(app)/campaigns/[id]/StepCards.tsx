"use client";

import { useState } from "react";
import { Clock, X, Mail, Linkedin, Phone, CheckSquare, MessageSquare } from "lucide-react";

interface Step {
  id: string;
  stepNumber: number;
  stepType: string;
  label: string;
  delayDays: number;
  subject: string;
  body: string;
}

const TYPE_COLORS: Record<string, string> = {
  EMAIL: "bg-[#eb9447]/15 text-[#eb9447]",
  LINKEDIN_CONNECT: "bg-sky-900/30 text-sky-400",
  LINKEDIN_MESSAGE: "bg-sky-900/30 text-sky-400",
  CALL: "bg-green-900/30 text-green-400",
  TASK: "bg-amber-900/30 text-amber-400",
};

const TYPE_LABELS: Record<string, string> = {
  EMAIL: "Email",
  LINKEDIN_CONNECT: "LinkedIn Connect",
  LINKEDIN_MESSAGE: "LinkedIn Message",
  CALL: "Cold Call",
  TASK: "Task",
};

function StepIcon({ type, cls = "w-3.5 h-3.5" }: { type: string; cls?: string }) {
  switch (type) {
    case "EMAIL": return <Mail className={`${cls} text-[#eb9447]`} />;
    case "LINKEDIN_CONNECT": return <Linkedin className={`${cls} text-sky-400`} />;
    case "LINKEDIN_MESSAGE": return <MessageSquare className={`${cls} text-sky-400`} />;
    case "CALL": return <Phone className={`${cls} text-green-400`} />;
    case "TASK": return <CheckSquare className={`${cls} text-amber-400`} />;
    default: return <Mail className={cls} />;
  }
}

export default function StepCards({ steps }: { steps: Step[] }) {
  const [selected, setSelected] = useState<Step | null>(null);

  return (
    <>
      <div className="space-y-3">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => setSelected(step)}
            className="w-full text-left bg-[#1a1a1a] border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <StepIcon type={step.stepType} />
                Step {step.stepNumber}: {step.label}
              </div>
              <div className="flex items-center gap-2">
                {step.stepType !== "EMAIL" && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[step.stepType] || "bg-zinc-800 text-zinc-400"}`}>
                    {TYPE_LABELS[step.stepType] || step.stepType}
                  </span>
                )}
                {step.delayDays > 0 && (
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    +{step.delayDays}d
                  </div>
                )}
                <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">View →</span>
              </div>
            </div>
            {step.stepType === "EMAIL" ? (
              <>
                <div className="text-xs font-medium text-zinc-400 mb-1">{step.subject}</div>
                <div className="text-xs text-zinc-500 whitespace-pre-wrap line-clamp-3">{step.body}</div>
              </>
            ) : (
              step.body && (
                <div className="text-xs text-zinc-500 whitespace-pre-wrap line-clamp-3">{step.body}</div>
              )
            )}
          </button>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#1a1a1a] border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <StepIcon type={selected.stepType} cls="w-4 h-4" />
                <span className="font-semibold text-white">
                  Step {selected.stepNumber}: {selected.label}
                </span>
                {selected.stepType !== "EMAIL" && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[selected.stepType] || "bg-zinc-800 text-zinc-400"}`}>
                    {TYPE_LABELS[selected.stepType]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {selected.delayDays > 0 && (
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="w-3.5 h-3.5" />
                    Sends +{selected.delayDays} day{selected.delayDays !== 1 ? "s" : ""} after previous
                  </div>
                )}
                {selected.delayDays === 0 && (
                  <span className="text-xs text-zinc-500">Sends immediately</span>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              {selected.stepType === "EMAIL" && selected.subject && (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Subject</div>
                  <div className="text-sm font-medium text-white bg-zinc-800/50 rounded-lg px-3 py-2">
                    {selected.subject}
                  </div>
                </div>
              )}
              {selected.body && (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">
                    {selected.stepType === "EMAIL" ? "Body" : selected.stepType === "CALL" ? "Call Script" : "Notes"}
                  </div>
                  <div className="text-sm text-zinc-200 whitespace-pre-wrap bg-zinc-800/50 rounded-lg px-3 py-3 leading-relaxed">
                    {selected.body}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
