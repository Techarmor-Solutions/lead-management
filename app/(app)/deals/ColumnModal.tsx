"use client";

import { useState } from "react";
import { X } from "lucide-react";

const PRESET_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

interface Props {
  initialName?: string;
  initialColor?: string;
  initialIsClosedStage?: boolean;
  onClose: () => void;
  onSave: (name: string, color: string, isClosedStage: boolean) => Promise<void>;
}

export default function ColumnModal({
  initialName = "",
  initialColor = "#3b82f6",
  initialIsClosedStage = false,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [isClosedStage, setIsClosedStage] = useState(initialIsClosedStage);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim(), color, isClosedStage);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">
            {initialName ? "Edit Stage" : "New Stage"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-zinc-400 text-sm block mb-1">Stage Name</label>
          <input
            className="input w-full"
            placeholder="e.g. Prospect"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
        </div>

        <div>
          <label className="text-zinc-400 text-sm block mb-2">Color</label>
          <div className="flex gap-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className="w-8 h-8 rounded-full transition-all"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `3px solid ${c}` : "none",
                  outlineOffset: "2px",
                }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setIsClosedStage((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              isClosedStage ? "bg-[#eb9447]" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                isClosedStage ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
          <div>
            <p className="text-white text-sm">Closed Stage</p>
            <p className="text-zinc-500 text-xs">Hides the time-in-stage timer on deals</p>
          </div>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#eb9447] text-black hover:bg-[#eb9447]/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
