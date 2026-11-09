// Jobs that run on their own while the server is up (started once from instrumentation.ts).

import { maybeNightlyBackup } from "./backup";
import { runReminders } from "./reminders";

const EVERY_MS = 5 * 60_000;

export function startScheduler() {
  const g = globalThis as { __nassajiScheduler?: boolean };
  if (g.__nassajiScheduler) return;
  g.__nassajiScheduler = true;
  const tick = async () => {
    await runReminders().catch((e) => console.error("reminders:", (e as Error).message));
    await maybeNightlyBackup().catch((e) => console.error("backup:", (e as Error).message));
  };
  setTimeout(tick, 30_000).unref();
  setInterval(tick, EVERY_MS).unref();
}
