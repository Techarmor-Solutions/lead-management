"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";

interface Props {
  companyId: string;
  industry: string;
  categories: string[];
}

export default function CategoryEditor({ companyId, industry: initial, categories }: Props) {
  const [industry, setIndustry] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      selectRef.current?.focus();
      inputRef.current?.focus();
    }
  }, [editing]);

  function startEdit() {
    setDraft(industry);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setDraft(industry);
  }

  async function save(value?: string) {
    const val = (value ?? draft).trim();
    setSaving(true);
    await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry: val }),
    });
    setIndustry(val);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        {categories.length > 0 ? (
          <select
            ref={selectRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className="text-xs bg-zinc-800 border border-zinc-600 text-white rounded px-2 py-1 outline-none focus:border-[#eb9447]"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            className="text-xs bg-zinc-800 border border-zinc-600 text-white rounded px-2 py-1 w-40 outline-none focus:border-[#eb9447]"
            placeholder="e.g. consumer services"
          />
        )}
        <button
          onClick={() => save()}
          disabled={saving}
          className="p-1 text-green-400 hover:bg-green-400/10 rounded transition-colors disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancel} className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="flex items-center gap-1.5 group text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-2 py-1 rounded transition-colors"
    >
      <span>{industry || "No category"}</span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
