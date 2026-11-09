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
import { channelName, parseWebPage } from "./telegram-web.ts";
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

/** One channel post, from the bot or from the channel's web page. */
type Source = { id: number; date: number; text: string; media: (title: string) => Promise<{ photos: string[]; videos: string[] }> };

/** Builds (or rebuilds) the news post for one channel post. */
async function buildPost(src: Source, existing: Post | undefined, state: TelegramState): Promise<Post> {
  const parsed = parsePost(src.text);
  const title = parsed.title || "خبر";
  // Media only when the post is new: edits change text, not pictures already saved.
  const media = existing ? { photos: [], videos: [] } : await src.media(title);
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
    const base = slugify(title).slice(0, 80) || `news-${src.id}`;
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
    date: existing?.date ?? new Date(src.date * 1000).toISOString(),
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

/**
 * The same channel post has one key whether the bot or the web page found it
 * ("@channel:123"); posts of a channel without a public name keep "chatId:123".
 */
const keyOf = (chat: { id?: number; username?: string }, messageId: number) =>
  chat.username ? `@${chat.username.toLowerCase()}:${messageId}` : `${chat.id}:${messageId}`;
const findProcessed = (processed: Record<string, number>, chat: { id?: number; username?: string }, messageId: number) =>
  processed[keyOf(chat, messageId)] ?? (chat.id !== undefined ? processed[`${chat.id}:${messageId}`] : undefined);

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
        const main = g.messages.find((x) => x.caption || x.text) ?? g.messages[0];
        const existingId = g.messages.map((x) => findProcessed(processed, x.chat, x.message_id)).find(Boolean);
        const text = main.caption ?? main.text ?? "";
        const existing = existingId ? getAllPosts().find((p) => p.id === existingId) : undefined;
        const src: Source = { id: main.message_id, date: main.date, text, media: (title) => saveMedia(g.messages, title) };
        if (existing && isForSite(text)) {
          const post = await buildPost(src, existing, state);
          savePosts(getAllPosts().map((p) => (p.id === post.id ? post : p)));
          log.unshift({ at: new Date().toISOString(), postId: post.id, title: post.title, action: "updated" });
          updated++;
        } else if (!existing && isForSite(text)) {
          const post = await buildPost(src, undefined, state);
          savePosts([post, ...getAllPosts()]);
          processed[keyOf(main.chat, main.message_id)] = post.id;
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

// ---------------------------------------------------------------- first import from the channel's past posts

export type BackfillItem = {
  id: number;
  date: string;
  title: string;
  text: string;
  photos: string[];
  videos: string[];
  postId?: number;
  /** Already news before this import (made by the bot or an earlier run). */
  existed?: boolean;
  /** Left out of this run (not ticked in the list). */
  skip?: boolean;
  error?: string;
};
export type Backfill = {
  status: "idle" | "preview" | "running" | "done";
  from?: string;
  to?: string;
  /** How many channel posts were looked at while searching the range. */
  scanned?: number;
  items: BackfillItem[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  /** This run's choice: publish the posts or keep them as drafts. */
  mode?: "publish" | "draft";
};
export const backfillState = (): Backfill => ({ status: "idle", items: [], ...readStore<Partial<Backfill>>("telegram-backfill", () => ({})) });
const saveBackfill = (b: Backfill) => writeStore("telegram-backfill", b);

const web = () => (process.env.TELEGRAM_WEB || "https://t.me").replace(/\/$/, "");
const MAX_PAGES = 300; // about 6,000 posts

async function webPage(channel: string, before?: number) {
  let res: Response;
  try {
    res = await fetchRetry(`${web()}/s/${encodeURIComponent(channel)}${before ? `?before=${before}` : ""}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", "Accept-Language": "fa" },
      cache: "no-store",
    });
  } catch (e) {
    throw new Error(`صفحه‌ی کانال در t.me باز نشد (${networkReason(e)}).`);
  }
  if (!res.ok) throw new Error(`صفحه‌ی کانال در t.me جواب نداد (HTTP ${res.status}).`);
  return parseWebPage(await res.text());
}

/**
 * Looks through the channel's past posts (newest to oldest) for those between `from`
 * and `to` that end with 🌍, and keeps them as a list to check before anything is made.
 */
export async function previewBackfill(from: string, to: string): Promise<{ ok: true; found: number; scanned: number } | { ok: false; error: string }> {
  const state = telegramState();
  const channel = channelName(state.channel);
  if (!channel || /^-?\d+$/.test(channel)) return { ok: false, error: "برای خواندن پست‌های قبلی، آیدی عمومی کانال (مثل @nassajisport) را در تنظیمات وارد کنید." };
  if (backfilling) return { ok: false, error: "ساخت خبرها هنوز در جریان است؛ صبر کنید تا تمام شود." };
  const start = Date.parse(from);
  const end = Date.parse(to);
  const found = new Map<number, BackfillItem>();
  let scanned = 0;
  let before: number | undefined;
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const posts = await webPage(channel, before);
      if (!posts.length) {
        if (page === 0) return { ok: false, error: "در صفحه‌ی وب کانال پستی پیدا نشد. کانال باید عمومی باشد (آیدی داشته باشد) و آیدی در تنظیمات درست باشد." };
        break;
      }
      scanned += posts.length;
      for (const p of posts) {
        const t = Date.parse(p.date);
        if (t < start || t > end || !isForSite(p.text)) continue;
        const postId = findProcessed(state.processed, { username: channel }, p.id);
        found.set(p.id, { id: p.id, date: p.date, title: parsePost(p.text).title || "خبر", text: p.text, photos: p.photos, videos: p.videos, postId, existed: !!postId });
      }
      const oldest = Math.min(...posts.map((p) => p.id));
      // Pages go back in time: once the oldest post on a page is before the range, stop.
      if (Math.min(...posts.map((p) => Date.parse(p.date))) < start || oldest <= 1 || oldest === before) break;
      before = oldest;
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const items = [...found.values()].sort((a, b) => a.id - b.id);
  saveBackfill({ status: "preview", from, to, scanned, items });
  return { ok: true, found: items.length, scanned };
}

/** Photos and videos of a web post, saved on the site (photos fitted to the 16:9 frame). */
async function saveWebMedia(item: BackfillItem, title: string) {
  const photos: string[] = [];
  const videos: string[] = [];
  const name = slugify(title).slice(0, 40) || "telegram";
  for (const url of item.photos) {
    const res = await fetchRetry(url, { cache: "no-store", timeoutMs: 60_000 });
    if (!res.ok) continue;
    photos.push(await saveNewsPhoto(new File([new Uint8Array(await res.arrayBuffer())], `${name}.jpg`, { type: "image/jpeg" })));
  }
  for (const url of item.videos) {
    const res = await fetchRetry(url, { cache: "no-store", timeoutMs: 120_000 });
    if (!res.ok) continue;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > 25 * 1024 * 1024) continue;
    videos.push(await saveUpload(new File([buf], `${name}.mp4`, { type: "video/mp4" })));
  }
  return { photos, videos };
}

let backfilling = false;

/** Is a run going on in this server process? ("running" in the store may be left from a restart.) */
export const backfillRunning = () => backfilling;

/** Makes the news posts of the previewed list, oldest first, in the background. */
export function startBackfill(ids: number[], mode: "publish" | "draft"): { ok: true } | { ok: false; error: string } {
  const prev = backfillState();
  if (backfilling) return { ok: false, error: "ساخت خبرها در جریان است." };
  // Only the ticked posts are made; a post with an error can be ticked to try again.
  const chosen = new Set(ids);
  const b: Backfill = { ...prev, mode, items: prev.items.map((i) => (i.postId ? i : { ...i, skip: !chosen.has(i.id), error: chosen.has(i.id) ? undefined : i.error })) };
  saveBackfill(b);
  if (!chosen.size) return { ok: false, error: "هیچ پستی تیک نخورده است." };
  // "running" left over from a restart counts as a list that can be continued.
  if (!["preview", "running", "done"].includes(b.status) || !b.items.some((i) => !i.postId && !i.skip)) return { ok: false, error: "اول «پیش‌نمایش» را بزنید؛ خبر تازه‌ای برای ساختن در فهرست نیست." };
  backfilling = true;
  saveBackfill({ ...b, status: "running", startedAt: new Date().toISOString(), finishedAt: undefined, error: undefined });
  void (async () => {
    const channel = channelName(telegramState().channel);
    try {
      const runMode = backfillState().mode ?? telegramState().mode;
      for (const item of backfillState().items) {
        if (item.postId || item.skip) continue;
        // This run's publish/draft choice wins over the channel setting.
        const state = { ...telegramState(), mode: runMode };
        // Made meanwhile by the bot (or an earlier run)?
        const already = findProcessed(state.processed, { username: channel }, item.id);
        let postId = already;
        let error: string | undefined;
        if (!already) {
          try {
            const post = await buildPost({ id: item.id, date: Date.parse(item.date) / 1000, text: item.text, media: (title) => saveWebMedia(item, title) }, undefined, state);
            savePosts([post, ...getAllPosts()]);
            postId = post.id;
            const s2 = telegramState();
            saveState({
              processed: { ...s2.processed, [keyOf({ username: channel }, item.id)]: post.id },
              log: [{ at: new Date().toISOString(), postId: post.id, title: post.title, action: "created" as const }, ...s2.log].slice(0, 30),
            });
          } catch (e) {
            error = (e as Error).message;
          }
        }
        const cur = backfillState();
        saveBackfill({ ...cur, items: cur.items.map((i) => (i.id === item.id ? { ...i, postId, error, existed: !!already } : i)) });
      }
      saveBackfill({ ...backfillState(), status: "done", finishedAt: new Date().toISOString() });
    } catch (e) {
      saveBackfill({ ...backfillState(), status: "done", finishedAt: new Date().toISOString(), error: (e as Error).message });
    } finally {
      backfilling = false;
    }
  })();
  return { ok: true };
}
