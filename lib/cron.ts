let started = false;

export function startCronJobs() {
  if (started) return;
  started = true;

  // Dynamic import to avoid edge runtime issues
  import("node-cron").then((cron) => {
    // Poll Gmail for replies every 10 minutes
    cron.schedule("*/10 * * * *", async () => {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await fetch(`${appUrl}/api/cron/poll-replies`, { method: "POST" });
      } catch (err) {
        console.error("[cron] poll-replies error:", err);
      }
    });

    // Process scheduled follow-up steps every hour
    cron.schedule("0 * * * *", async () => {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await fetch(`${appUrl}/api/cron/process-scheduled`, { method: "POST" });
      } catch (err) {
        console.error("[cron] process-scheduled error:", err);
      }
    });

    console.log("[cron] Scheduled jobs started");
  });
}
