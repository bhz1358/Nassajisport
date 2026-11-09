// Runs once when the server starts: background jobs (Bale reminders for the prediction contest).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
