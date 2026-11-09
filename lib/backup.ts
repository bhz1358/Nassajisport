// Nightly copy of the site's data (not the photos) sent by the Bale bot to the admins who
// registered their chat with a code from the panel. Keeps a copy off the server.

import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { hasBaleToken, sendBaleDocument } from "./bale-login";
import { DATA_DIR, readStore, writeStore } from "./store";
import { BACKUP_HOUR, nightlyDue, tehranDay } from "./backup-plan.ts";

export { BACKUP_HOUR };

export type BackupState = {
  enabled: boolean;
  /** Bale chats that receive the file. */
  chats: { id: number; name?: string; addedAt: string }[];
  /** One-time code to register a chat (valid 15 minutes). */
  code?: { value: string; until: number };
  lastDay?: string;
  lastSent?: string;
  lastSize?: number;
  lastError?: string;
  /** Last failed attempt (a failed night is retried hourly). */
  lastTry?: string;
};

const MAX_BYTES = 45 * 1024 * 1024;

export const backupState = () => readStore<BackupState>("backup", () => ({ enabled: true, chats: [] }));
export const saveBackupState = (patch: Partial<BackupState>) => writeStore("backup", { ...backupState(), ...patch });

export function newBackupCode(): string {
  const value = String(crypto.randomInt(100000, 1000000));
  saveBackupState({ code: { value, until: Date.now() + 15 * 60_000 } });
  return value;
}

/** Called by the bot for «پشتیبان 123456»: registers the chat when the code is right. */
export function registerBackupChat(chatId: number, code: string, name?: string): "ok" | "known" | "bad" {
  const s = backupState();
  if (!s.code || s.code.value !== code || Date.now() > s.code.until) return "bad";
  if (s.chats.some((c) => c.id === chatId)) {
    saveBackupState({ code: undefined });
    return "known";
  }
  saveBackupState({ code: undefined, chats: [...s.chats, { id: chatId, name, addedAt: new Date().toISOString() }] });
  return "ok";
}


/** The data folder as .tar.gz, without photos, temporary files or the session key. */
function archive(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(
      "tar",
      ["-czf", "-", "--exclude=./uploads", "--exclude=./.session-secret", "--exclude=*.tmp", "-C", DATA_DIR, "."],
      { encoding: "buffer", maxBuffer: 200 * 1024 * 1024 },
      (err, stdout) => (err ? reject(err) : resolve(stdout)),
    );
  });
}

let running = false;

/** Sends the backup now (to every registered chat); returns a message for the panel. */
export async function sendBackup(now = Date.now()): Promise<{ ok: boolean; message: string }> {
  if (running) return { ok: false, message: "ارسال پشتیبان در جریان است." };
  if (!hasBaleToken()) return { ok: false, message: "توکن بازوی بله تنظیم نشده است." };
  const s = backupState();
  if (!s.chats.length) return { ok: false, message: "هنوز گیرنده‌ای ثبت نشده است." };
  running = true;
  try {
    const buf = await archive();
    if (buf.length > MAX_BYTES) throw new Error(`حجم پشتیبان (${Math.round(buf.length / 1048576)} مگابایت) برای بله زیاد است.`);
    const day = tehranDay(now);
    const name = `nassajisport-data-${day}.tar.gz`;
    const caption = `🗄 پشتیبان داده‌های نساجی اسپرت — ${new Date(now).toLocaleDateString("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", dateStyle: "long" })}\nخبرها، جدول، بازیکنان، کاربران، هواداران و تنظیمات (بدون عکس‌ها). این فایل را جایی امن نگه دارید.`;
    let sent = 0;
    const errors: string[] = [];
    for (const c of s.chats) {
      try {
        await sendBaleDocument(c.id, buf, name, caption);
        sent++;
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    if (sent) saveBackupState({ lastDay: day, lastSent: new Date(now).toISOString(), lastSize: buf.length, lastError: errors[0], lastTry: undefined });
    else saveBackupState({ lastError: errors[0], lastTry: new Date(now).toISOString() });
    return sent
      ? { ok: true, message: `پشتیبان (${Math.max(1, Math.round(buf.length / 1024))} کیلوبایت) برای ${sent} گیرنده فرستاده شد.` }
      : { ok: false, message: errors[0] ?? "ارسال نشد." };
  } catch (e) {
    saveBackupState({ lastError: (e as Error).message, lastTry: new Date(now).toISOString() });
    return { ok: false, message: (e as Error).message };
  } finally {
    running = false;
  }
}

/** Once a night, from 3 a.m. Tehran time (the scheduler checks every 5 minutes). */
export async function maybeNightlyBackup(now = Date.now()) {
  if (nightlyDue(backupState(), now, hasBaleToken())) await sendBackup(now);
}
