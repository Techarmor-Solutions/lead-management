"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Sparkles, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { AgencyProfile, Contact } from "@prisma/client";

interface ContactWithCompany extends Contact {
  company: { name: string; industry: string; website: string };
}

interface Step {
  label: string;
  delayDays: number;
  subject: string;
  body: string;
}

interface Props {
  contacts: ContactWithCompany[];
  agencyProfile: AgencyProfile | null;
}

const TAGS = ["{{first_name}}", "{{company_name}}", "{{sender_name}}"];

export default function CampaignBuilder({ contacts, agencyProfile }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [steps, setSteps] = useState<Step[]>([
    { label: "Initial Outreach", delayDays: 0, subject: "", body: "" },
    { label: "Follow-up #1", delayDays: 3, subject: "", body: "" },
    { label: "Final Follow-up", delayDays: 7, subject: "", body: "" },
  ]);
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

  function updateStep(index: number, field: keyof Step, value: string | number) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { label: `Follow-up #${prev.length}`, delayDays: prev.length * 3, subject: "", body: "" },
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
        stepCount: steps.length,
      }),
    });

    const data = await res.json();
    if (data.steps) {
      setSteps((prev) =>
        prev.map((step, i) => ({
          ...step,
          label: data.steps[i]?.label || step.label,
          subject: data.steps[i]?.subject || step.subject,
          body: data.steps[i]?.body || step.body,
        }))
      );
    }
    setGenerating(false);
  }

  async function handleSave(status: "DRAFT" | "READY") {
    if (!name.trim()) { alert("Campaign name required"); return; }
    if (selectedContactIds.size === 0) { alert("Select at least one contact"); return; }
    if (steps.some((s) => !s.subject.trim() || !s.body.trim())) {
      alert("All steps need a subject and body");
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

  return (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Campaign Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="Q1 Outreach — Restaurants" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Industry (for AI copy)</label>
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} className="input w-full" placeholder="Restaurants, Dentists, etc." />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Contact Selector */}
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Contacts ({selectedContactIds.size} selected)</h3>
          </div>
          <input
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            className="input w-full mb-3"
            placeholder="Search contacts..."
          />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {filteredContacts.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">No contacts with emails found</p>
            )}
            {filteredContacts.map((c) => {
              const isDNC = c.status === "DO_NOT_CONTACT";
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${
                    isDNC ? "opacity-40 cursor-not-allowed" : "hover:bg-zinc-800/50 cursor-pointer"
                  }`}
                  title={isDNC ? "Do Not Contact — cannot add to campaign" : undefined}
                >
                  <input
                    type="checkbox"
                    checked={selectedContactIds.has(c.id)}
                    onChange={() => !isDNC && toggleContact(c.id)}
                    disabled={isDNC}
                    className="w-4 h-4 rounded accent-blue-500 disabled:cursor-not-allowed"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate flex items-center gap-2">
                      {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                      {isDNC && <span className="text-xs text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded">DNC</span>}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">{c.email} · {c.company.name}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Step Editor */}
        <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Email Steps</h3>
            <div className="flex gap-2">
              <button
                onClick={generateWithAI}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generating ? "Generating..." : "Generate with AI"}
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
            {steps.map((step, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  activeStep === i
                    ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {i === activeStep ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Step {i + 1}
              </button>
            ))}
          </div>

          {/* Active step form */}
          {steps[activeStep] && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Label</label>
                  <input
                    value={steps[activeStep].label}
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
                    value={steps[activeStep].delayDays}
                    onChange={(e) => updateStep(activeStep, "delayDays", parseInt(e.target.value))}
                    className="input w-full text-sm"
                    disabled={activeStep === 0}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Subject Line</label>
                <input
                  value={steps[activeStep].subject}
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
                  value={steps[activeStep].body}
                  onChange={(e) => updateStep(activeStep, "body", e.target.value)}
                  className="input w-full text-sm resize-none h-40"
                  placeholder="Hi {{first_name}},&#10;&#10;..."
                />
              </div>
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
      </div>
    </div>
  );
}
