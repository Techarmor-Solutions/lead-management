"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Send, Pause, Play, Trash2, Plus, Pencil, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Props {
  campaign: { id: string; status: string; name: string; isTemplate?: boolean };
}

export default function CampaignActions({ campaign }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"approve" | "send" | "delete" | null>(null);

  async function updateStatus(status: string) {
    setLoading(true);
    await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    setConfirm(null);
    router.refresh();
  }

  async function launchCampaign() {
    setLoading(true);
    await fetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" });
    setLoading(false);
    setConfirm(null);
    router.refresh();
  }

  async function syncReplies() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/cron/poll-replies", { method: "POST" });
    const data = await res.json();
    setSyncResult(`Checked ${data.checked ?? 0} contacts, found ${data.replied ?? 0} repl${data.replied === 1 ? "y" : "ies"}`);
    setSyncing(false);
    router.refresh();
  }

  async function deleteCampaign() {
    setLoading(true);
    await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
    router.push("/campaigns");
  }

  // Template view: "Edit", "Use Template" + delete
  if (campaign.isTemplate) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href={`/campaigns/${campaign.id}/edit`}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </Link>
        <Link
          href={`/campaigns/new?template=${campaign.id}`}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Use Template
        </Link>
        {confirm === "delete" ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Delete template?</span>
            <button onClick={deleteCampaign} className="text-sm bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition-colors">
              Delete
            </button>
            <button onClick={() => setConfirm(null)} className="text-sm text-zinc-400 hover:text-white px-2 py-1.5">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm("delete")}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {["ACTIVE", "SENDING", "PAUSED", "COMPLETED"].includes(campaign.status) && (
        <div className="flex items-center gap-2">
          {syncResult && <span className="text-xs text-zinc-400">{syncResult}</span>}
          <button
            onClick={syncReplies}
            disabled={syncing}
            className="flex items-center gap-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            title="Check Gmail for replies now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Checking..." : "Sync Replies"}
          </button>
        </div>
      )}
      {campaign.status === "READY" && (
        <>
          {confirm === "approve" ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Approve campaign?</span>
              <button onClick={() => updateStatus("APPROVED")} className="text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                Confirm
              </button>
              <button onClick={() => setConfirm(null)} className="text-sm text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirm("approve")}
              className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}
        </>
      )}

      {campaign.status === "APPROVED" && (
        <>
          {confirm === "send" ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Launch sending?</span>
              <button onClick={launchCampaign} disabled={loading} className="text-sm bg-[#eb9447] hover:bg-[#d4833a] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                {loading ? "Launching..." : "Launch"}
              </button>
              <button onClick={() => setConfirm(null)} className="text-sm text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirm("send")}
              className="flex items-center gap-2 bg-[#eb9447] hover:bg-[#d4833a] text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Send className="w-4 h-4" />
              Launch Campaign
            </button>
          )}
        </>
      )}

      {(campaign.status === "ACTIVE" || campaign.status === "SENDING") && (
        <button
          onClick={() => updateStatus("PAUSED")}
          disabled={loading}
          className="flex items-center gap-2 bg-amber-600/20 border border-amber-600/30 text-amber-400 px-3 py-2 rounded-lg text-sm transition-colors"
        >
          <Pause className="w-4 h-4" />
          Pause
        </button>
      )}

      {campaign.status === "PAUSED" && (
        <button
          onClick={() => updateStatus("ACTIVE")}
          disabled={loading}
          className="flex items-center gap-2 bg-green-600/20 border border-green-600/30 text-green-400 px-3 py-2 rounded-lg text-sm transition-colors"
        >
          <Play className="w-4 h-4" />
          Resume
        </button>
      )}

      {confirm === "delete" ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Delete campaign?</span>
          <button onClick={deleteCampaign} className="text-sm bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition-colors">
            Delete
          </button>
          <button onClick={() => setConfirm(null)} className="text-sm text-zinc-400 hover:text-white px-2 py-1.5">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm("delete")}
          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
