"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";

const emptyForm = {
  firstName: "",
  lastName: "",
  title: "",
  email: "",
  phone: "",
  linkedin: "",
  notes: "",
};

export default function AddContactButton({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, companyId }),
    });
    setSaving(false);
    setShowModal(false);
    setForm(emptyForm);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Add Contact
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="font-semibold text-white">Add Contact</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">First Name</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => updateForm("firstName", e.target.value)}
                    className="input w-full"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Last Name</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => updateForm("lastName", e.target.value)}
                    className="input w-full"
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  className="input w-full"
                  placeholder="Owner / CEO / Marketing Director"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  className="input w-full"
                  placeholder="jane@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    className="input w-full"
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">LinkedIn URL</label>
                  <input
                    value={form.linkedin}
                    onChange={(e) => updateForm("linkedin", e.target.value)}
                    className="input w-full"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  className="input w-full resize-none h-16"
                  placeholder="Any notes about this contact..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
