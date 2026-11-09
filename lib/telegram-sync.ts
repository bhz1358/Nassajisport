// Turns posts of the site's Telegram channel into news posts. A bot (admin of the
// channel) receives the channel's posts; every few minutes on page views (or with the
// admin's «بررسی همین الان») they are read with getUpdates. Posts ending with 🌍 become
// news; their photo is fitted to the 16:9 frame, a post without one gets a cover.
//
// TELEGRAM_BOT_TOKEN (in /etc/nassaji.env) is the bot's token; TELEGRAM_API can point at
// a relay when api.telegram.org can't be reached from the server.

import { getAllPosts, getCategories, normalizePath, nextPostId, savePosts } from "./content";
import { logoPath, makeCover } from "./cover.ts";
import { getLeague } from "./league";
import { saveNewsPhoto, saveUpload } from "./media";
import { sanitizeHtml } from "./sanitize.ts";
import { autoExcerpt, fillImageAlts, findTags, firstImage, plainText } from "./seo-auto.ts";
import { getSettings, logoUrl } from "./settings";
import { HOME_TEAM } from "./site";
import { slugify } from "./slug.ts";
import { getSquad } from "./squad";
import { fetchRetry, networkReason } from "./net-tuning.ts";
import { readStore, UPLOADS_DIR, writeStore } from "./store";
import { isForSite, paragraphsToHtml, parsePost } from "./telegram-parse.ts";
import { resolveTheme } from "./themes";
import type { Post } from "./types";

export type TelegramState = {
  enabled: boolean;
  /** Channel @username (without @) or numeric id; posts from other chats are ignored. */
  channel: string;
  mode: "publish" | "draft";
  /** Minutes between checks. */
  every: number;
  offset?: number;
  /** "chatId:messageId" → post id, so a post is never made twice and edits update it. */
  processed: Record<string, number>;
  lastSync?: string;
  lastError?: string;
  /** What the last check saw, so the admin can tell the bot is reading the channel. */
  lastSeen?: { posts: number; withoutMark: number; otherChats: string[] };
  log: { at: string; postId: number; title: string; action: "created" | "updated" }[];
};

const DEFAULT: TelegramState = { enabled: true, channel: "", mode: "publish", every: 30, processed: {}, log: [] };
export const telegramState = (): TelegramState => ({ ...DEFAULT, ...readStore<Partial<TelegramState>>("telegram", () => ({})) });
const saveState = (patch: Partial<TelegramState>) => writeStore("telegram", { ...telegramState(), ...patch });

const token = () => process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
const api = () => (process.env.TELEGRAM_API || "https://api.telegram.org").replace(/\/$/, "");
export const hasToken = () => !!token();
/** Never let the token reach a message shown in the panel. */
const hide = (s: string) => (token() ? s.split(token()).join("***") : s);

async function call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetchRetry(`${api()}/bot${token()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      cache: "no-store",
    });
  } catch (e) {
    throw new Error(hide(`اتصال به تلگرام برقرار نشد، حتی بعد از ۳ بار تلاش (${networkReason(e)}). اگر این تکرار شد، اتصال سرور به تلگرام ناپایدار است و به پروکسی یا واسط نیاز دارد.`));
  }
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!data.ok) {
    const why = data.description ?? `HTTP ${res.status}`;
    if (res.status === 401) throw new Error("توکن ربات درست نیست (TELEGRAM_BOT_TOKEN را بررسی کنید).");
    if (res.status === 409) throw new Error("برای این ربات webhook تنظیم شده؛ باید برداشته شود (deleteWebhook) تا سایت بتواند پیام‌ها را بخواند.");
    throw new Error(hide(`تلگرام خطا داد: ${why}`));
  }
  return data.result as T;
}

async function download(fileId: string): Promise<{ buffer: Buffer; name: string }> {
  const f = await call<{ file_path?: string; file_size?: number }>("getFile", { file_id: fileId });
  if (!f.file_path) throw new Error("فایل در تلگرام پیدا نشد (فایل‌های بیشتر از ۲۰ مگابایت را ربات نمی‌تواند بگیرد).");
  let res: Response;
  try {
    res = await fetchRetry(`${api()}/file/bot${token()}/${f.file_path}`, { cache: "no-store", timeoutMs: 90_000 });
  } catch (e) {
    throw new Error(hide(`دانلود فایل از تلگرام انجام نشد (${networkReason(e)}).`));
  }
  if (!res.ok) throw new Error(`دانلود فایل از تلگرام انجام نشد (HTTP ${res.status}).`);
  return { buffer: Buffer.from(await res.arrayBuffer()), name: f.file_path.split("/").pop() || "file" };
}

/** Who the bot is: for the panel's «تست اتصال». */
export const botInfo = () => call<{ username: string; first_name: string }>("getMe");

type TgMessage = {
  message_id: number;
  chat: { id: number; username?: string; title?: string };
  date: number;
  text?: string;
  caption?: string;
  photo?: { file_id: string; width: number; height: number; file_size?: number }[];
  video?: { file_id: string; file_size?: number; mime_type?: string };
  media_group_id?: string;
};
type TgUpdate = { update_id: number; channel_post?: TgMessage; edited_channel_post?: TgMessage };

const fromChannel = (m: TgMessage, channel: string) => {
  const c = channel.trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "").toLowerCase();
  return !c || m.chat.username?.toLowerCase() === c || String(m.chat.id) === c;
};

/** Photos and videos of the post (an album arrives as several messages), saved on the site. */
async function saveMedia(messages: TgMessage[], title: string) {
  const photos: string[] = [];
  const videos: string[] = [];
  for (const m of messages) {
    if (m.photo?.length) {
      const best = [...m.photo].sort((a, b) => b.width * b.height - a.width * a.height)[0];
      const { buffer } = await download(best.file_id);
      photos.push(await saveNewsPhoto(new File([new Uint8Array(buffer)], `${slugify(title).slice(0, 40) || "telegram"}.jpg`, { type: "image/jpeg" })));
    } else if (m.video && (m.video.file_size ?? 0) <= 20 * 1024 * 1024 && /mp4|webm/.test(m.video.mime_type ?? "video/mp4")) {
      const { buffer, name } = await download(m.video.file_id);
      const ext = name.endsWith(".webm") ? ".webm" : ".mp4";
      videos.push(await saveUpload(new File([new Uint8Array(buffer)], `${slugify(title).slice(0, 40) || "telegram"}${ext}`)));
    }
  }
  return { photos, videos };
}

async function coverFor(title: string): Promise<string> {
  const settings = getSettings();
  const { brand, accent } = resolveTheme(settings.theme);
  const buf = await makeCover(title, logoPath(logoUrl(settings), UPLOADS_DIR), brand, accent);
  return saveUpload(new File([new Uint8Array(buf)], `cover-${slugify(title).slice(0, 30) || "news"}.webp`, { type: "image/webp" }));
}

/** Builds (or rebuilds) the news post for one channel post. */
async function buildPost(messages: TgMessage[], existing: Post | undefined, state: TelegramState): Promise<Post> {
  const main = messages.find((m) => m.caption || m.text) ?? messages[0];
  const text = main.caption ?? main.text ?? "";
  const parsed = parsePost(text);
  const title = parsed.title || "خبر";
  // Media only when the post is new: edits change text, not pictures already saved.
  const media = existing ? { photos: [], videos: [] } : await saveMedia(messages, title);
  const featuredImage = existing?.featuredImage ?? media.photos[0] ?? (await coverFor(title));
  const extra = [
    ...media.photos.slice(1).map((u) => `<p><img src="${u}" alt=""></p>`),
    ...media.videos.map((u) => `<video src="${u}" controls playsinline preload="metadata"></video>`),
  ].join("");
  const content = fillImageAlts(sanitizeHtml(paragraphsToHtml(parsed.paragraphs) + extra), title);
  const squad = getSquad();
  const tags = [
    ...new Set([
      ...parsed.tags,
      ...findTags(`${title} ${plainText(content)}`, [HOME_TEAM, ...getLeague().standings.map((r) => r.team)], [...squad.players.map((p) => p.name), ...squad.staff.map((s) => s.name)]),
    ]),
  ];
  const cats = getCategories();
  const category = (cats.find((c) => c.slug === "news") ?? cats[0])?.slug;
  const posts = getAllPosts();
  let path = existing?.path;
  if (!path) {
    const base = slugify(title).slice(0, 80) || `news-${main.message_id}`;
    path = normalizePath(`/${base}/`);
    for (let n = 2; posts.some((p) => normalizePath(p.path) === path); n++) path = normalizePath(`/${base}-${n}/`);
  }
  return {
    ...(existing ?? {}),
    id: existing?.id ?? nextPostId(),
    type: "post",
    title,
    slug: path.split("/").filter(Boolean).pop() ?? slugify(title),
    path,
    date: existing?.date ?? new Date(main.date * 1000).toISOString(),
    modified: new Date().toISOString(),
    author: existing?.author ?? "تحریریه نساجی اسپرت",
    excerpt: autoExcerpt(content),
    content,
    categories: existing?.categories ?? (category ? [category] : []),
    tags,
    featuredImage: featuredImage ?? firstImage(content),
    status: existing?.status ?? (state.mode === "draft" ? "draft" : "publish"),
    createdBy: existing?.createdBy ?? "telegram",
  };
}

/** Reads new channel posts and makes or updates news posts. */
export type SyncResult = { ok: true; created: number; updated: number; seen: number; withoutMark: number; otherChats: string[] } | { ok: false; error: string };

export async function syncTelegram(): Promise<SyncResult> {
  if (!hasToken()) return { ok: false, error: "توکن ربات تنظیم نشده (TELEGRAM_BOT_TOKEN در فایل /etc/nassaji.env)." };
  const state = telegramState();
  let created = 0;
  let updated = 0;
  let seen = 0;
  let withoutMark = 0;
  const otherChats = new Set<string>();
  try {
    const updates = await call<TgUpdate[]>("getUpdates", { offset: state.offset, timeout: 0, limit: 100, allowed_updates: ["channel_post", "edited_channel_post"] });
    // An album arrives as several messages with the same media_group_id: handled together.
    const groups = new Map<string, { messages: TgMessage[]; edited: boolean; lastUpdate: number }>();
    for (const u of updates) {
      const m = u.channel_post ?? u.edited_channel_post;
      if (!m) continue;
      if (!fromChannel(m, state.channel)) {
        otherChats.add(m.chat.username ? `@${m.chat.username}` : m.chat.title ?? String(m.chat.id));
        continue;
      }
      if (u.channel_post && (m.caption || m.text)) {
        seen++;
        if (!isForSite(m.caption ?? m.text ?? "")) withoutMark++;
      }
      const key = m.media_group_id ? `g${m.chat.id}:${m.media_group_id}` : `${m.chat.id}:${m.message_id}`;
      const g = groups.get(key) ?? { messages: [], edited: false, lastUpdate: u.update_id };
      g.messages.push(m);
      g.edited ||= !!u.edited_channel_post;
      g.lastUpdate = Math.max(g.lastUpdate, u.update_id);
      groups.set(key, g);
    }
    let offset = state.offset;
    const processed = { ...state.processed };
    const log = [...state.log];
    for (const u of updates) {
      const m = u.channel_post ?? u.edited_channel_post;
      const key = m ? (m.media_group_id ? `g${m.chat.id}:${m.media_group_id}` : `${m.chat.id}:${m.message_id}`) : "";
      const g = groups.get(key);
      if (g && g.lastUpdate === u.update_id) {
        const main = g.messages.find((x) => x.caption || x.text);
        const doneKey = `${g.messages[0].chat.id}:${(main ?? g.messages[0]).message_id}`;
        const existingId = processed[doneKey] ?? g.messages.map((x) => processed[`${x.chat.id}:${x.message_id}`]).find(Boolean);
        const text = main?.caption ?? main?.text ?? "";
        const posts = getAllPosts();
        const existing = existingId ? posts.find((p) => p.id === existingId) : undefined;
        if (existing && isForSite(text)) {
          const post = await buildPost(g.messages, existing, state);
          savePosts(getAllPosts().map((p) => (p.id === post.id ? post : p)));
          log.unshift({ at: new Date().toISOString(), postId: post.id, title: post.title, action: "updated" });
          updated++;
        } else if (!existing && isForSite(text)) {
          const post = await buildPost(g.messages, undefined, state);
          savePosts([post, ...getAllPosts()]);
          processed[doneKey] = post.id;
          log.unshift({ at: new Date().toISOString(), postId: post.id, title: post.title, action: "created" });
          created++;
        }
      }
      // Advance past each handled update, so a failure later retries only what's left.
      offset = u.update_id + 1;
      saveState({ offset, processed, log: log.slice(0, 30) });
    }
    const lastSeen = { posts: seen, withoutMark, otherChats: [...otherChats] };
    saveState({ lastSync: new Date().toISOString(), lastError: undefined, lastSeen });
    return { ok: true, created, updated, seen, withoutMark, otherChats: lastSeen.otherChats };
  } catch (e) {
    const error = hide((e as Error).message);
    saveState({ lastSync: new Date().toISOString(), lastError: error });
    return { ok: false, error };
  }
}

let running = false;

/** Called on page views: checks the channel every few minutes when switched on. */
export function maybeTelegramSync() {
  const s = telegramState();
  if (!s.enabled || !hasToken() || running) return;
  if (s.lastSync && Date.now() - Date.parse(s.lastSync) < Math.max(5, s.every) * 60_000) return;
  running = true;
  saveState({ lastSync: new Date().toISOString() });
  syncTelegram()
    .catch(() => {})
    .finally(() => {
      running = false;
    });
}
