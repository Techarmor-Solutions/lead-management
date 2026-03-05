"use client";

import { useState } from "react";
import { AgencyProfile } from "@prisma/client";

interface Props {
  profile: AgencyProfile | null;
}

export default function SettingsForm({ profile }: Props) {
  const [form, setForm] = useState({
    name: profile?.name || "Tech Armor Solutions",
    services: (profile?.services || []).join(", "),
    valueProposition: profile?.valueProposition || "",
    targetIndustries: (profile?.targetIndustries || []).join(", "),
    targetCompanySize: profile?.targetCompanySize || "",
    painPoints: (profile?.painPoints || []).join(", "),
    targetGeography: (profile?.targetGeography || []).join(", "),
    additionalNotes: profile?.additionalNotes || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
        targetIndustries: form.targetIndustries.split(",").map((s) => s.trim()).filter(Boolean),
        painPoints: form.painPoints.split(",").map((s) => s.trim()).filter(Boolean),
        targetGeography: form.targetGeography.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSave} className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 space-y-5">
      <Field label="Agency Name">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
          required
        />
      </Field>

      <Field label="Services Offered" hint="Comma-separated">
        <input
          value={form.services}
          onChange={(e) => setForm({ ...form, services: e.target.value })}
          className="input"
          placeholder="Web design, SEO, PPC, branding"
        />
      </Field>

      <Field label="Value Proposition">
        <textarea
          value={form.valueProposition}
          onChange={(e) => setForm({ ...form, valueProposition: e.target.value })}
          className="input resize-none h-20"
          placeholder="What makes Tech Armor unique?"
        />
      </Field>

      <div className="border-t border-zinc-800 pt-5">
        <div className="text-sm font-medium text-zinc-300 mb-4">Ideal Client Profile (ICP)</div>
        <div className="space-y-4">
          <Field label="Target Industries" hint="Comma-separated">
            <input
              value={form.targetIndustries}
              onChange={(e) => setForm({ ...form, targetIndustries: e.target.value })}
              className="input"
              placeholder="Restaurants, medical offices, law firms"
            />
          </Field>

          <Field label="Target Company Size">
            <input
              value={form.targetCompanySize}
              onChange={(e) => setForm({ ...form, targetCompanySize: e.target.value })}
              className="input"
              placeholder="1–50 employees, small local business"
            />
          </Field>

          <Field label="Pain Points We Solve" hint="Comma-separated">
            <input
              value={form.painPoints}
              onChange={(e) => setForm({ ...form, painPoints: e.target.value })}
              className="input"
              placeholder="Outdated website, no online presence, poor local SEO"
            />
          </Field>

          <Field label="Target Geography" hint="Comma-separated cities/states">
            <input
              value={form.targetGeography}
              onChange={(e) => setForm({ ...form, targetGeography: e.target.value })}
              className="input"
              placeholder="Houston TX, Dallas TX, nationwide"
            />
          </Field>
        </div>
      </div>

      <Field label="Additional Notes">
        <textarea
          value={form.additionalNotes}
          onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
          className="input resize-none h-20"
          placeholder="Anything else Claude should know when generating copy..."
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && <span className="text-sm text-green-400">Saved!</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1.5">
        {label}
        {hint && <span className="text-zinc-600 ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
