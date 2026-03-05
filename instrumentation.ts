export async function register() {
  // Only run in Node.js runtime (not Edge), and only in the server process
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronJobs } = await import("./lib/cron");
    startCronJobs();
  }
}
