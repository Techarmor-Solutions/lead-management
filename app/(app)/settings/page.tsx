import { prisma } from "@/lib/db";
import SettingsForm from "./SettingsForm";
import GmailConnect from "./GmailConnect";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [profile, gmailCred] = await Promise.all([
    prisma.agencyProfile.findFirst(),
    prisma.gmailCredential.findFirst(),
  ]);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Agency profile & integrations</p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Agency Profile & ICP</h2>
          <SettingsForm profile={profile} />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Gmail Integration</h2>
          <GmailConnect email={gmailCred?.email || null} connected={!!gmailCred} />
        </section>
      </div>
    </div>
  );
}
