"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, Linkedin, Building2, ListChecks,
  Edit2, Check, X, ExternalLink,
} from "lucide-react";
import ActivityLog, { Activity } from "./ActivityLog";

const STATUS_OPTIONS = [
  "NEW", "CONTACTED", "RESPONDED", "QUALIFIED", "CLOSED", "NOT_INTERESTED", "DO_NOT_CONTACT",
] as const;

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-zinc-700 text-zinc-300",
  CONTACTED: "bg-[#eb9447]/15 text-[#eb9447]",
  RESPONDED: "bg-purple-600/20 text-purple-400",
  QUALIFIED: "bg-green-600/20 text-green-400",
  CLOSED: "bg-green-700/30 text-green-300",
  NOT_INTERESTED: "bg-zinc-700 text-zinc-400",
  DO_NOT_CONTACT: "bg-red-600/20 text-red-400",
};

const SEND_STATUS_COLORS: Record<string, string> = {
  PENDING: "text-zinc-500",
  SCHEDULED: "text-[#eb9447]",
  SENT: "text-zinc-300",
  OPENED: "text-purple-400",
  CLICKED: "text-green-400",
  RESPONDED: "text-green-300",
  BOUNCED: "text-red-400",
  FAILED: "text-red-500",
  CANCELLED: "text-zinc-600",
};

type ContactStatus = (typeof STATUS_OPTIONS)[number];

interface Send {
  id: string;
  status: string;
  sentAt: Date | string | null;
  openedAt: Date | string | null;
  clickedAt: Date | string | null;
  respondedAt: Date | string | null;
  campaign: { id: string; name: string; status: string };
  step: { label: string; stepNumber: number; stepType: string };
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  status: ContactStatus;
  notes: string;
  enrichmentSummary: string;
  createdAt: Date | string;
  company: { id: string; name: string; website: string; industry: string };
  listMemberships: { list: { id: string; name: string } }[];
  sends: Send[];
  activities: Activity[];
}

function Field({
  label,
  value,
  icon,
  href,
  editing,
  editValue,
  onEdit,
  onSave,
  onCancel,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href?: string;
  editing: boolean;
  editValue: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-800 last:border-0 group">
      <span className="text-zinc-500 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-zinc-500 mb-0.5">{label}</div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type={type}
              value={editValue}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
              className="input text-sm flex-1"
              placeholder={placeholder}
            />
            <button onClick={onSave} className="text-green-400 hover:text-green-300 transition-colors"><Check className="w-4 h-4" /></button>
            <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {value ? (
              href ? (
                <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  className="text-sm text-[#eb9447] hover:text-[#f0a86a] transition-colors flex items-center gap-1 truncate">
                  {value}
                  {href.startsWith("http") && <ExternalLink className="w-3 h-3 flex-shrink-0" />}
                </a>
              ) : (
                <span className="text-sm text-white truncate">{value}</span>
              )
            ) : (
              <span className="text-sm text-zinc-600 italic">Not set</span>
            )}
            <button
              onClick={onEdit}
              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-all flex-shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContactProfile({ contact }: { contact: Contact }) {
  const router = useRouter();

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    linkedin: contact.linkedin,
  });
  const [status, setStatus] = useState<ContactStatus>(contact.status);
  const [notes, setNotes] = useState(contact.notes);
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  async function patch(data: Record<string, string>) {
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
  }

  function startEdit(field: string) { setEditingField(field); }
  function cancelEdit() { setEditingField(null); }

  async function saveField(field: string) {
    await patch({ [field]: editValues[field as keyof typeof editValues] });
    setEditingField(null);
  }

  async function saveStatus(s: ContactStatus) {
    setStatus(s);
    await patch({ status: s });
  }

  async function saveNotes() {
    setSavingNotes(true);
    await patch({ notes });
    setSavingNotes(false);
    setNotesDirty(false);
  }

  // Engagement stats
  const totalSent = contact.sends.filter((s) => ["SENT", "OPENED", "CLICKED", "RESPONDED"].includes(s.status)).length;
  const totalOpened = contact.sends.filter((s) => ["OPENED", "CLICKED", "RESPONDED"].includes(s.status)).length;
  const totalClicked = contact.sends.filter((s) => ["CLICKED", "RESPONDED"].includes(s.status)).length;
  const hasReplied = contact.sends.some((s) => s.status === "RESPONDED");

  const lastSentSend = contact.sends
    .filter((s) => s.sentAt)
    .sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime())[0];

  // Active campaigns: group sends by campaign, show most recent step status per campaign
  const campaignMap = new Map<string, { id: string; name: string; status: string; sends: Send[] }>();
  for (const send of contact.sends) {
    if (!campaignMap.has(send.campaign.id)) {
      campaignMap.set(send.campaign.id, { ...send.campaign, sends: [] });
    }
    campaignMap.get(send.campaign.id)!.sends.push(send);
  }
  const campaigns = [...campaignMap.values()];

  const fullName = [editValues.firstName, editValues.lastName].filter(Boolean).join(" ") || "Unknown";

  return (
    <>
      {/* Back */}
      <a href="/contacts" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" />
        Contacts
      </a>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{fullName}</h1>
            <select
              value={status}
              onChange={(e) => saveStatus(e.target.value as ContactStatus)}
              className={`text-xs px-2.5 py-1 rounded-full border-0 font-medium cursor-pointer ${STATUS_COLORS[status]}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          {contact.title && <p className="text-zinc-500 text-sm">{contact.title}</p>}
          <p className="text-zinc-600 text-xs mt-1">Added {new Date(contact.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contact info */}
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-1">Contact Info</h2>
            <Field
              label="First Name" value={editValues.firstName} icon={<span className="text-xs w-4">FN</span>}
              editing={editingField === "firstName"} editValue={editValues.firstName}
              onEdit={() => startEdit("firstName")} onSave={() => saveField("firstName")} onCancel={cancelEdit}
              onChange={(v) => setEditValues((p) => ({ ...p, firstName: v }))}
              placeholder="First name"
            />
            <Field
              label="Last Name" value={editValues.lastName} icon={<span className="text-xs w-4">LN</span>}
              editing={editingField === "lastName"} editValue={editValues.lastName}
              onEdit={() => startEdit("lastName")} onSave={() => saveField("lastName")} onCancel={cancelEdit}
              onChange={(v) => setEditValues((p) => ({ ...p, lastName: v }))}
              placeholder="Last name"
            />
            <Field
              label="Title" value={editValues.title} icon={<span className="text-xs w-4">T</span>}
              editing={editingField === "title"} editValue={editValues.title}
              onEdit={() => startEdit("title")} onSave={() => saveField("title")} onCancel={cancelEdit}
              onChange={(v) => setEditValues((p) => ({ ...p, title: v }))}
              placeholder="e.g. Owner, Manager"
            />
            <Field
              label="Email" value={editValues.email} icon={<Mail className="w-4 h-4" />}
              href={editValues.email ? `mailto:${editValues.email}` : undefined}
              editing={editingField === "email"} editValue={editValues.email}
              onEdit={() => startEdit("email")} onSave={() => saveField("email")} onCancel={cancelEdit}
              onChange={(v) => setEditValues((p) => ({ ...p, email: v }))}
              type="email" placeholder="email@example.com"
            />
            <Field
              label="Phone" value={editValues.phone} icon={<Phone className="w-4 h-4" />}
              href={editValues.phone ? `tel:${editValues.phone}` : undefined}
              editing={editingField === "phone"} editValue={editValues.phone}
              onEdit={() => startEdit("phone")} onSave={() => saveField("phone")} onCancel={cancelEdit}
              onChange={(v) => setEditValues((p) => ({ ...p, phone: v }))}
              type="tel" placeholder="+1 (555) 000-0000"
            />
            <Field
              label="LinkedIn" value={editValues.linkedin} icon={<Linkedin className="w-4 h-4" />}
              href={editValues.linkedin || undefined}
              editing={editingField === "linkedin"} editValue={editValues.linkedin}
              onEdit={() => startEdit("linkedin")} onSave={() => saveField("linkedin")} onCancel={cancelEdit}
              onChange={(v) => setEditValues((p) => ({ ...p, linkedin: v }))}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          {/* Notes */}
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Notes</h2>
              {notesDirty && (
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="text-xs bg-[#eb9447] hover:bg-[#d4833a] text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingNotes ? "Saving..." : "Save"}
                </button>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
              className="input w-full text-sm resize-none h-32"
              placeholder="Add notes about this contact..."
            />
          </div>

          {/* Activity log */}
          <ActivityLog contactId={contact.id} initial={contact.activities} onStatusChange={(s) => setStatus(s as ContactStatus)} />

          {/* Campaigns */}
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Campaigns</h2>
            {campaigns.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">Not in any campaigns yet</p>
            ) : (
              <div className="space-y-3">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="border border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <a href={`/campaigns/${camp.id}`} className="text-sm font-medium text-white hover:text-[#eb9447] transition-colors">
                        {camp.name}
                      </a>
                      <span className="text-xs text-zinc-500">{camp.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {camp.sends
                        .sort((a, b) => a.step.stepNumber - b.step.stepNumber)
                        .map((send) => (
                          <div key={send.id} className="flex items-center gap-1 text-xs bg-zinc-800 px-2 py-1 rounded">
                            <span className="text-zinc-400">Step {send.step.stepNumber}: {send.step.label}</span>
                            <span className={`font-medium ${SEND_STATUS_COLORS[send.status]}`}>· {send.status}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Engagement stats */}
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">Engagement</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-white">{totalSent}</div>
                <div className="text-xs text-zinc-500 mt-0.5">Emails Sent</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-400">{totalOpened}</div>
                <div className="text-xs text-zinc-500 mt-0.5">Opened</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-400">{totalClicked}</div>
                <div className="text-xs text-zinc-500 mt-0.5">Clicked</div>
              </div>
              <div className="bg-zinc-900 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${hasReplied ? "text-green-300" : "text-zinc-600"}`}>
                  {hasReplied ? "Yes" : "No"}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">Replied</div>
              </div>
            </div>
            {lastSentSend && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  Last contacted{" "}
                  <span className="text-zinc-300">
                    {new Date(lastSentSend.sentAt!).toLocaleDateString()}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Company */}
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Company</h2>
            <a href={`/companies/${contact.company.id}`} className="flex items-center gap-2 text-white hover:text-[#eb9447] transition-colors">
              <Building2 className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <span className="font-medium">{contact.company.name}</span>
            </a>
            {contact.company.industry && (
              <p className="text-xs text-zinc-500 mt-1 ml-6">{contact.company.industry}</p>
            )}
            {contact.company.website && (
              <a href={contact.company.website} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#eb9447] hover:text-[#f0a86a] mt-1 ml-6 flex items-center gap-1 transition-colors">
                {contact.company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Lists */}
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Lists</h2>
            {contact.listMemberships.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">Not in any lists</p>
            ) : (
              <div className="space-y-1.5">
                {contact.listMemberships.map((m) => (
                  <a key={m.list.id} href={`/lists/${m.list.id}`}
                    className="flex items-center gap-2 text-sm text-white hover:text-[#eb9447] transition-colors">
                    <ListChecks className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    {m.list.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Enrichment */}
          {contact.enrichmentSummary && (
            <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">AI Enrichment</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">{contact.enrichmentSummary}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
