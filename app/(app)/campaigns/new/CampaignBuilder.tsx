"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Sparkles, ChevronDown, ChevronUp, Mail, Linkedin, Phone, CheckSquare, MessageSquare, Copy } from "lucide-react";
import { AgencyProfile, Contact } from "@prisma/client";

type StepType = "EMAIL" | "LINKEDIN_CONNECT" | "LINKEDIN_MESSAGE" | "CALL" | "TASK";

interface ContactWithCompany extends Contact {
  company: { name: string; industry: string; website: string };
}

interface ContactList {
  id: string;
  name: string;
  _count: { members: number };
  members: { contactId: string }[];
}

interface Step {
  label: string;
  stepType: StepType;
  delayDays: number;
  subject: string;
  body: string;
}

interface TemplateStep {
  label: string;
  stepType: string;
  delayDays: number;
  subject: string;
  body: string;
}

interface Props {
  contacts: ContactWithCompany[];
  agencyProfile: AgencyProfile | null;
  lists: ContactList[];
  initialSteps?: TemplateStep[];
  initialIndustry?: string;
}

const DEFAULT_STEPS: Step[] = [
  { label: "Initial Outreach", stepType: "EMAIL", delayDays: 0, subject: "", body: "" },
  { label: "Follow-up #1", stepType: "EMAIL", delayDays: 3, subject: "", body: "" },
  { label: "Final Follow-up", stepType: "EMAIL", delayDays: 7, subject: "", body: "" },
];

const TAGS = ["{{first_name}}", "{{company_name}}", "{{sender_name}}"];

const STEP_TYPES: { type: StepType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: "EMAIL", label: "Email", icon: <Mail className="w-3.5 h-3.5" />, color: "blue" },
  { type: "LINKEDIN_CONNECT", label: "LinkedIn Connect", icon: <Linkedin className="w-3.5 h-3.5" />, color: "sky" },
  { type: "LINKEDIN_MESSAGE", label: "LinkedIn Message", icon: <MessageSquare className="w-3.5 h-3.5" />, color: "sky" },
  { type: "CALL", label: "Cold Call", icon: <Phone className="w-3.5 h-3.5" />, color: "green" },
  { type: "TASK", label: "Task", icon: <CheckSquare className="w-3.5 h-3.5" />, color: "amber" },
];

const TYPE_COLORS: Record<StepType, string> = {
  EMAIL: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  LINKEDIN_CONNECT: "bg-sky-600/20 text-sky-400 border-sky-600/30",
  LINKEDIN_MESSAGE: "bg-sky-600/20 text-sky-400 border-sky-600/30",
  CALL: "bg-green-600/20 text-green-400 border-green-600/30",
  TASK: "bg-amber-600/20 text-amber-400 border-amber-600/30",
};

function toSteps(raw: TemplateStep[]): Step[] {
  return raw.map((s) => ({
    label: s.label,
    stepType: (s.stepType as StepType) || "EMAIL",
    delayDays: s.delayDays,
    subject: s.subject,
    body: s.body,
  }));
}

export default function CampaignBuilder({ contacts, agencyProfile, lists, initialSteps, initialIndustry }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"campaign" | "template">("campaign");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState(initialIndustry || "");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [steps, setSteps] = useState<Step[]>(initialSteps ? toSteps(initialSteps) : DEFAULT_STEPS);
  const [activeStep, setActiveStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    return (
      !q ||
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.name.toLowerCase().includes(q)
    );
  });

  function toggleContact(id: string) {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function importFromList(listId: string) {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    const eligible = list.members
      .map((m) => contacts.find((c) => c.id === m.contactId))
      .filter((c) => c && c.status !== "DO_NOT_CONTACT" && c.email)
      .map((c) => c!.id);
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      eligible.forEach((id) => next.add(id));
      return next;
    });
    setSelectedListId("");
  }

  function updateStep(index: number, field: keyof Step, value: string | number) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { label: `Follow-up #${prev.length}`, stepType: "EMAIL", delayDays: prev.length * 3, subject: "", body: "" },
    ]);
    setActiveStep(steps.length);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    setActiveStep(Math.max(0, activeStep - 1));
  }

  function insertTag(tag: string) {
    const textarea = document.querySelector<HTMLTextAreaElement>(`#step-body-${activeStep}`);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = steps[activeStep].body.slice(0, start) + tag + steps[activeStep].body.slice(end);
    updateStep(activeStep, "body", newBody);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
      textarea.focus();
    }, 0);
  }

  async function generateWithAI() {
    if (!agencyProfile) {
      alert("Please set up your Agency Profile in Settings first.");
      return;
    }

    const selectedContacts = contacts.filter((c) => selectedContactIds.has(c.id));
    const sampleCompany = selectedContacts[0]?.company || {
      name: "your target company",
      industry: industry || "local business",
      website: "",
    };

    const emailStepCount = steps.filter((s) => s.stepType === "EMAIL").length;
    if (emailStepCount === 0) {
      alert("Add at least one Email step to generate AI copy.");
      return;
    }

    setGenerating(true);

    const res = await fetch("/api/campaigns/generate-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agencyProfile: {
          name: agencyProfile.name,
          services: agencyProfile.services,
          valueProposition: agencyProfile.valueProposition,
          targetIndustries: agencyProfile.targetIndustries,
          painPoints: agencyProfile.painPoints,
        },
        targetCompany: sampleCompany,
        stepCount: emailStepCount,
      }),
    });

    const data = await res.json();
    if (data.steps) {
      let emailIdx = 0;
      setSteps((prev) =>
        prev.map((step) => {
          if (step.stepType !== "EMAIL") return step;
          const ai = data.steps[emailIdx++];
          if (!ai) return step;
          return { ...step, label: ai.label || step.label, subject: ai.subject || step.subject, body: ai.body || step.body };
        })
      );
    }
    setGenerating(false);
  }

  async function handleSave(status: "DRAFT" | "READY") {
    if (!name.trim()) { alert("Campaign name required"); return; }
    if (selectedContactIds.size === 0) { alert("Select at least one contact"); return; }

    const invalidEmail = steps.find((s) => s.stepType === "EMAIL" && (!s.subject.trim() || !s.body.trim()));
    if (invalidEmail) {
      alert(`Email step "${invalidEmail.label}" needs a subject and body.`);
      return;
    }

    setSaving(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, industry, status, contactIds: [...selectedContactIds], steps }),
    });
    const data = await res.json();
    router.push(`/campaigns/${data.id}`);
  }

  async function handleSaveTemplate() {
    if (!name.trim()) { alert("Template name required"); return; }

    const invalidEmail = steps.find((s) => s.stepType === "EMAIL" && (!s.subject.trim() || !s.body.trim()));
    if (invalidEmail) {
      alert(`Email step "${invalidEmail.label}" needs a subject and body.`);
      return;
    }

    setSaving(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, industry, status: "DRAFT", isTemplate: true, contactIds: [], steps }),
    });
    const data = await res.json();
    router.push(`/campaigns/${data.id}`);
  }

  const step = steps[activeStep];

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("campaign")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "campaign" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Campaign
        </button>
        <button
          onClick={() => setMode("template")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "template" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
          Save as Template
        </button>
      </div>

      {mode === "template" && (
        <div className="bg-purple-900/20 border border-purple-600/30 rounded-xl px-4 py-3 text-sm text-purple-300">
          Template mode: no contacts needed. Save the sequence to reuse later when creating campaigns.
        </div>
      )}

      {/* Campaign Name */}
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              {mode === "template" ? "Template Name" : "Campaign Name"}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder={mode === "template" ? "e.g. Restaurant Outreach Sequence" : "Q1 Outreach — Restaurants"}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Industry (for AI copy)</label>
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} className="input w-full" placeholder="Restaurants, Dentists, etc." />
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${mode === "campaign" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
        {/* Contact Selector — only in campaign mode */}
        {mode === "campaign" && (
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Contacts ({selectedContactIds.size} selected)</h3>
              {lists.length > 0 && (
                <select
                  value={selectedListId}
                  onChange={(e) => { setSelectedListId(e.target.value); if (e.target.value) importFromList(e.target.value); }}
                  className="input text-xs py-1 px-2"
                >
                  <option value="">Import from list…</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l._count.members})</option>
                  ))}
                </select>
              )}
            </div>
            <input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="input w-full mb-3"
              placeholder="Search contacts..."
            />
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {filteredContacts.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">No contacts found</p>
              )}
              {filteredContacts.map((c) => {
                const isDNC = c.status === "DO_NOT_CONTACT";
                const noEmail = !c.email;
                const disabled = isDNC || noEmail;
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${
                      disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-zinc-800/50 cursor-pointer"
                    }`}
                    title={isDNC ? "Do Not Contact" : noEmail ? "No email address" : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(c.id)}
                      onChange={() => !disabled && toggleContact(c.id)}
                      disabled={disabled}
                      className="w-4 h-4 rounded accent-blue-500 disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate flex items-center gap-2">
                        {[c.firstName, c.lastName].filter(Boolean).join(" ") || "(no name)"}
                        {isDNC && <span className="text-xs text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded">DNC</span>}
                        {noEmail && <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">no email</span>}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">{c.email || "—"} · {c.company.name}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Step Editor */}
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Steps ({steps.length})</h3>
            <div className="flex gap-2">
              <button
                onClick={generateWithAI}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generating ? "Generating..." : "AI Copy"}
              </button>
              <button
                onClick={addStep}
                className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Step
              </button>
            </div>
          </div>

          {/* Step tabs */}
          <div className="flex gap-1 mb-4 flex-wrap">
            {steps.map((s, i) => {
              const typeInfo = STEP_TYPES.find((t) => t.type === s.stepType);
              return (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors border ${
                    activeStep === i
                      ? TYPE_COLORS[s.stepType]
                      : "bg-zinc-800 text-zinc-400 hover:text-white border-transparent"
                  }`}
                >
                  {activeStep === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {typeInfo?.icon}
                  Step {i + 1}
                </button>
              );
            })}
          </div>

          {/* Active step form */}
          {step && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Step Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {STEP_TYPES.map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => updateStep(activeStep, "stepType", t.type)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                        step.stepType === t.type
                          ? TYPE_COLORS[t.type]
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
                  <label className="block text-xs text-zinc-500 mb-1">Label</label>
                  <input
                    value={step.label}
                    onChange={(e) => updateStep(activeStep, "label", e.target.value)}
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">
                    Delay {activeStep === 0 ? "(send immediately)" : "(days after previous)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={step.delayDays}
                    onChange={(e) => updateStep(activeStep, "delayDays", parseInt(e.target.value))}
                    className="input w-full text-sm"
                    disabled={activeStep === 0}
                  />
                </div>
              </div>

              {step.stepType === "EMAIL" ? (
                <>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Subject Line</label>
                    <input
                      value={step.subject}
                      onChange={(e) => updateStep(activeStep, "subject", e.target.value)}
                      className="input w-full text-sm"
                      placeholder="Quick question, {{first_name}}"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-zinc-500">Body</label>
                      <div className="flex gap-1">
                        {TAGS.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => insertTag(tag)}
                            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      id={`step-body-${activeStep}`}
                      value={step.body}
                      onChange={(e) => updateStep(activeStep, "body", e.target.value)}
                      className="input w-full text-sm resize-none h-40"
                      placeholder="Hi {{first_name}},&#10;&#10;..."
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">
                    {step.stepType === "CALL" ? "Call Script / Talking Points" : "Notes / Instructions"}
                  </label>
                  <textarea
                    id={`step-body-${activeStep}`}
                    value={step.body}
                    onChange={(e) => updateStep(activeStep, "body", e.target.value)}
                    className="input w-full text-sm resize-none h-40"
                    placeholder={
                      step.stepType === "LINKEDIN_CONNECT"
                        ? "Send a connection request mentioning..."
                        : step.stepType === "LINKEDIN_MESSAGE"
                        ? "Message template or talking points..."
                        : step.stepType === "CALL"
                        ? "Introduction: Hi, my name is...\n\nKey points to cover:\n1.\n2.\n\nCTA: ..."
                        : "What to do for this step..."
                    }
                  />
                </div>
              )}

              {activeStep > 0 && (
                <button
                  onClick={() => removeStep(activeStep)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove step
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {mode === "campaign" ? (
          <>
            <button
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave("READY")}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Mark as Ready for Review"}
            </button>
          </>
        ) : (
          <button
            onClick={handleSaveTemplate}
            disabled={saving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
            {saving ? "Saving..." : "Save Template"}
          </button>
        )}
      </div>
    </div>
  );
}
