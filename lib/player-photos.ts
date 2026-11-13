// Applies the site's player-photo look (lib/player-photo.ts) to the squad: photos uploaded in the
// panel, photos already there, and photos shipped with the site for a player by name.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveUpload } from "./media";
import { bundledPhoto, PHOTO_STYLE, stylePlayerPhoto } from "./player-photo.ts";
import { getSquad, saveSquad } from "./squad";
import { readStore, UPLOADS_DIR, writeStore } from "./store";
import type { Player } from "./types";
import { applySquadAdditions } from "./squad-additions";
import { applyStaffPhotos } from "./staff-photos";

const DIR = path.join(UPLOADS_DIR, "players");

/** A photo address on disk: an upload, or a file under public/. */
function fileOf(url: string): string | undefined {
  const clean = url.split("?")[0];
  if (clean.startsWith("/uploads/")) return resolveUpload(clean) ?? undefined;
  if (clean.startsWith("/")) {
    const f = path.join(process.cwd(), "public", clean);
    return f.startsWith(path.join(process.cwd(), "public")) ? f : undefined;
  }
}

function save(buf: Buffer, name: string): string {
  fs.mkdirSync(DIR, { recursive: true });
  const file = `${name}-${crypto.randomBytes(3).toString("hex")}.webp`;
  fs.writeFileSync(path.join(DIR, file), buf);
  return `/uploads/players/${file}`;
}

/** The styled photo for this player from their original; the player unchanged if it can't be read. */
export async function stylePlayer(p: Player): Promise<Player> {
  const original = p.photoOriginal ?? p.photo;
  const file = original && fileOf(original);
  if (!file || !fs.existsSync(file)) return p;
  const styled = await stylePlayerPhoto(fs.readFileSync(file), p.number);
  return { ...p, photoOriginal: original, photo: save(styled, p.slug), photoStyle: PHOTO_STYLE };
}

/** The look is on unless the admin put the original photos back. */
export const photoLookOn = () => readStore<{ enabled: boolean }>("player-photo-look", () => ({ enabled: true })).enabled;
export const setPhotoLook = (enabled: boolean) => writeStore("player-photo-look", { enabled });

let running = false;

/**
 * Brings every player's photo to the current look (and gives a player without a photo the one
 * shipped for them, if any). Returns how many photos were made.
 */
export async function styleSquadPhotos(force = false): Promise<number> {
  if (running) return 0;
  // Players shipped with the update come first, so their photos can follow.
  try {
    applySquadAdditions();
  } catch {
    /* a bad entry mustn't stop the photos */
  }
  try {
    await applyStaffPhotos();
  } catch {
    /* nor a bad staff photo */
  }
  if (!photoLookOn()) return 0;
  running = true;
  try {
    let squad = getSquad();
    let made = 0;
    // A photo shipped for a player replaces theirs once; a later upload in the panel stays.
    const used = new Set(readStore<string[]>("bundled-photos-applied", () => []));
    for (const p of squad.players) {
      let next = p;
      const bundled = bundledPhoto(p.name);
      const stamp = bundled && `${path.basename(bundled)}:${fs.statSync(bundled).size}`;
      if (bundled && stamp && !used.has(stamp)) {
        fs.mkdirSync(path.join(DIR, "originals"), { recursive: true });
        const name = `${p.slug}-${crypto.randomBytes(3).toString("hex")}${path.extname(bundled)}`;
        fs.copyFileSync(bundled, path.join(DIR, "originals", name));
        next = { ...p, photo: undefined, photoOriginal: `/uploads/players/originals/${name}`, photoStyle: undefined };
      } else if (!p.photo && !p.photoOriginal) continue;
      else if (!force && p.photoStyle === PHOTO_STYLE) continue;
      try {
        next = await stylePlayer(next);
      } catch {
        continue;
      }
      if (next.photoStyle === PHOTO_STYLE) {
        made++;
        if (stamp && !used.has(stamp) && next.photoOriginal?.includes("/originals/")) {
          used.add(stamp);
          writeStore("bundled-photos-applied", [...used]);
        }
        // Re-read: the panel may have saved meanwhile.
        squad = getSquad();
        saveSquad({ ...squad, players: squad.players.map((x) => (x.slug === p.slug ? { ...x, photo: next.photo, photoOriginal: next.photoOriginal, photoStyle: next.photoStyle } : x)) });
      }
    }
    return made;
  } finally {
    running = false;
  }
}

/** Puts every player's original photo back (the look can be applied again later). */
export function restoreOriginalPhotos(): number {
  const squad = getSquad();
  let n = 0;
  const players = squad.players.map((p) => {
    if (!p.photoOriginal) return p;
    n++;
    return { ...p, photo: p.photoOriginal, photoOriginal: undefined, photoStyle: undefined };
  });
  saveSquad({ ...squad, players });
  return n;
}
