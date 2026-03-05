"use client";

import { Mail, CheckCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function GmailConnectInner({ email, connected }: { email: string | null; connected: boolean }) {
  const params = useSearchParams();
  const justConnected = params.get("gmail") === "connected";

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-zinc-400" />
          <div>
            <div className="text-sm font-medium text-white">
              {connected ? "Gmail Connected" : "Gmail Not Connected"}
            </div>
            {email && (
              <div className="text-xs text-zinc-500">{email}</div>
            )}
          </div>
          {(connected || justConnected) && (
            <CheckCircle className="w-4 h-4 text-green-400" />
          )}
        </div>
        <a
          href="/api/auth/gmail"
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {connected ? "Reconnect Gmail" : "Connect Gmail"}
        </a>
      </div>
      {!connected && (
        <p className="text-xs text-zinc-500 mt-3">
          Connect your Google Workspace Gmail account to send campaigns. You&apos;ll be redirected to Google to authorize access.
        </p>
      )}
    </div>
  );
}

export default function GmailConnect(props: { email: string | null; connected: boolean }) {
  return (
    <Suspense fallback={<div />}>
      <GmailConnectInner {...props} />
    </Suspense>
  );
}
