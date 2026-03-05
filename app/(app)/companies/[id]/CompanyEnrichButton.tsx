"use client";

import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  companyId: string;
  enrichedAt: string | null;
}

export default function CompanyEnrichButton({ companyId, enrichedAt }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleEnrich() {
    setLoading(true);
    await fetch(`/api/companies/${companyId}/enrich`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleEnrich}
      disabled={loading}
      className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-400 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 flex-shrink-0"
    >
      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {enrichedAt ? "Re-enrich" : "AI Enrich"}
    </button>
  );
}
