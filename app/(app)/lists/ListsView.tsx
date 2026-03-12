"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ListChecks, Trash2 } from "lucide-react";

interface List {
  id: string;
  name: string;
  description: string;
  createdAt: Date | string;
  _count: { members: number };
}

export default function ListsView({ lists }: { lists: List[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function createList() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    setSaving(false);
    setShowNew(false);
    setName("");
    setDescription("");
    router.push(`/lists/${data.id}`);
  }

  async function deleteList(id: string) {
    if (!confirm("Delete this list? This will not delete the contacts.")) return;
    setDeletingId(id);
    await fetch(`/api/lists/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Lists</h1>
          <p className="text-zinc-500 text-sm mt-1">{lists.length} list{lists.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-sm bg-[#eb9447] hover:bg-[#d4833a] text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New List
        </button>
      </div>

      {/* New list form */}
      {showNew && (
        <div className="bg-[#1a1a1a] border border-zinc-700 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">Create New List</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createList()}
                className="input w-full max-w-sm"
                placeholder="e.g. Q1 Restaurant Prospects"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input w-full max-w-sm"
                placeholder="Brief note about this list"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={createList}
                disabled={saving || !name.trim()}
                className="text-sm bg-[#eb9447] hover:bg-[#d4833a] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create List"}
              </button>
              <button
                onClick={() => { setShowNew(false); setName(""); setDescription(""); }}
                className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lists grid */}
      {lists.length === 0 && !showNew && (
        <div className="text-center py-20">
          <ListChecks className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No lists yet</p>
          <p className="text-zinc-600 text-sm mt-1">Create a list to group contacts for campaigns</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((list) => (
          <div
            key={list.id}
            className="bg-[#1a1a1a] border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <a href={`/lists/${list.id}`} className="font-semibold text-white hover:text-[#eb9447] transition-colors">
                {list.name}
              </a>
              <button
                onClick={() => deleteList(list.id)}
                disabled={deletingId === list.id}
                className="text-zinc-600 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {list.description && (
              <p className="text-zinc-500 text-sm mb-3 line-clamp-2">{list.description}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-zinc-400">
                <span className="text-white font-medium">{list._count.members}</span> contact{list._count.members !== 1 ? "s" : ""}
              </span>
              <a
                href={`/lists/${list.id}`}
                className="text-xs text-[#eb9447] hover:text-[#f0a86a] transition-colors"
              >
                View →
              </a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
