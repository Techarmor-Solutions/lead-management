let started = false;

export function startCronJobs() {
  if (started) return;
  started = true;

  import("node-cron").then((cron) => {
    // Poll Gmail for replies every 10 minutes — runs in-process, no HTTP
    cron.schedule("*/10 * * * *", async () => {
      try {
        const { runPollReplies } = await import("./jobs");
        const result = await runPollReplies();
        console.log(`[cron] poll-replies: checked=${result.checked} replied=${result.replied}`);
      } catch (err) {
        console.error("[cron] poll-replies error:", err);
      }
    });

    // Poll Gmail for bounces every 30 minutes
    cron.schedule("*/30 * * * *", async () => {
      try {
        const { runPollBounces } = await import("./jobs");
        const result = await runPollBounces();
        console.log(`[cron] poll-bounces: bounced=${result.bounced}`);
      } catch (err) {
        console.error("[cron] poll-bounces error:", err);
      }
    });

    // Process scheduled follow-up steps every hour — runs in-process, no HTTP
    cron.schedule("0 * * * *", async () => {
      try {
        const { runProcessScheduled } = await import("./jobs");
        const result = await runProcessScheduled();
        console.log(`[cron] process-scheduled: processed=${result.processed}`);
      } catch (err) {
        console.error("[cron] process-scheduled error:", err);
      }
    });

    console.log("[cron] Scheduled jobs started");
  });
}
