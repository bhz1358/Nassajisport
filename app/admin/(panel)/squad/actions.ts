"use server";

import { photoLookOn, stylePlayer } from "@/lib/player-photos";

import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { file, num, str, withError } from "@/lib/form";
import { jalaliPartsToIso } from "@/lib/jalali";
import { saveUpload } from "@/lib/media";
import { getSquad, parseLineupText, saveSquad } from "@/lib/squad";
import type { Player, Position, TeamLineup } from "@/lib/types";

const POS: Position[] = ["GK", "DF", "MF", "FW"];

export async function saveSeason(fd: FormData) {
  await requireAccess("squad");
  saveSquad({ ...getSquad(), season: str(fd, "season") || getSquad().season });
  redirect("/admin/squad/?ok=saved");
}

export async function savePlayer(fd: FormData) {
  await requireAccess("squad");
  const squad = getSquad();
  const original = str(fd, "original");
  const existing = squad.players.find((p) => p.slug === original);
  const back = existing ? `/admin/squad/${original}/` : "/admin/squad/new/";

  const name = str(fd, "name");
  const number = num(fd, "number");
  if (!name) redirect(withError(back, "نام بازیکن لازم است."));
  if (number < 1 || number > 99) redirect(withError(back, "شماره پیراهن باید بین ۱ تا ۹۹ باشد."));
  const clash = squad.players.find((p) => p.number === number && p.slug !== original);
  if (clash) redirect(withError(back, `شماره ${number} مال «${clash.name}» است.`));

  let slug = (str(fd, "slug") || existing?.slug || `player-${number}`).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (slug === "new" || slug === "lineup") slug = `player-${number}`;
  if (squad.players.some((p) => p.slug === slug && p.slug !== original)) slug = `${slug}-${Date.now().toString(36)}`;

  const birth = str(fd, "birthDate");
  const birthDate = birth ? jalaliPartsToIso(birth, "12:00")?.slice(0, 10) : undefined;
  if (birth && !birthDate) redirect(withError(back, "تاریخ تولد را شمسی و به شکل ۱۳۷۶/۱۱/۲۲ وارد کنید."));

  // The photo field shows the styled photo; a new upload (or a new address) is the new original,
  // and the site's look is applied to it (lib/player-photo.ts).
  let photo = str(fd, "photo") || undefined;
  let photoOriginal = photo && photo === existing?.photo ? existing?.photoOriginal : photo;
  // A new shirt number means a new picture (the number is drawn on it).
  let photoStyle = photo && photo === existing?.photo && existing?.number === number ? existing?.photoStyle : undefined;
  const upload = file(fd, "photoFile");
  if (upload) {
    try {
      photoOriginal = await saveUpload(upload);
      photo = photoOriginal;
      photoStyle = undefined;
    } catch (e) {
      redirect(withError(back, (e as Error).message));
    }
  }
  if (photo && photoStyle === undefined && photoLookOn()) {
    try {
      const styled = await stylePlayer({ slug, name, number, position: "MF", photo: photoOriginal ?? photo, photoOriginal, stats: {} as Player["stats"] });
      photo = styled.photo;
      photoOriginal = styled.photoOriginal;
      photoStyle = styled.photoStyle;
    } catch {
      /* keep the photo as uploaded */
    }
  }
  const position = POS.find((p) => p === str(fd, "position")) ?? "MF";

  const player: Player = {
    slug,
    name,
    number,
    position,
    ...(birthDate ? { birthDate } : {}),
    ...(num(fd, "heightCm") ? { heightCm: num(fd, "heightCm") } : {}),
    ...(str(fd, "foot") ? { foot: str(fd, "foot") } : {}),
    ...(str(fd, "nationality") ? { nationality: str(fd, "nationality") } : {}),
    ...(photo ? { photo } : {}),
    ...(photo && photoOriginal ? { photoOriginal } : {}),
    ...(photo && photoStyle ? { photoStyle } : {}),
    ...(str(fd, "bio") ? { bio: str(fd, "bio") } : {}),
    stats: {
      appearances: num(fd, "appearances"),
      minutes: num(fd, "minutes"),
      goals: num(fd, "goals"),
      assists: num(fd, "assists"),
      yellowCards: num(fd, "yellowCards"),
      redCards: num(fd, "redCards"),
      ...(position === "GK" ? { cleanSheets: num(fd, "cleanSheets") } : {}),
    },
  };

  const players = existing ? squad.players.map((p) => (p.slug === original ? player : p)) : [...squad.players, player];
  // Keep lineup links pointing at the renamed player.
  const relink = (t: TeamLineup): TeamLineup => {
    const fix = (l: TeamLineup["starters"]) => l.map((x) => (x.slug === original ? { ...x, slug, name, number } : x));
    return { ...t, starters: fix(t.starters), substitutes: fix(t.substitutes) };
  };
  const lineup = squad.lineup && existing ? { ...squad.lineup, home: relink(squad.lineup.home), away: relink(squad.lineup.away) } : squad.lineup;

  saveSquad({ ...squad, players, lineup, isSample: false });
  redirect(`/admin/squad/${slug}/?ok=${existing ? "saved" : "created"}`);
}

export async function deletePlayer(fd: FormData) {
  await requireAccess("squad");
  const squad = getSquad();
  const slug = str(fd, "slug");
  saveSquad({ ...squad, players: squad.players.filter((p) => p.slug !== slug) });
  redirect("/admin/squad/?ok=deleted");
}

export async function saveStaff(fd: FormData) {
  await requireAccess("squad");
  const count = num(fd, "count");
  const staff = [];
  for (let i = 0; i < count; i++) {
    const name = str(fd, `name_${i}`);
    const role = str(fd, `role_${i}`);
    if (name && role && fd.get(`delete_${i}`) !== "on") staff.push({ role, name });
  }
  saveSquad({ ...getSquad(), staff, isSample: false });
  redirect("/admin/squad/?ok=saved#staff");
}

function readTeam(fd: FormData, side: "home" | "away", players: Player[]): TeamLineup {
  const formation = str(fd, `${side}_formation_custom`) || str(fd, `${side}_formation`) || "4-4-2";
  return {
    team: str(fd, `${side}_team`),
    formation,
    ...(str(fd, `${side}_coach`) ? { coach: str(fd, `${side}_coach`) } : {}),
    starters: parseLineupText(String(fd.get(`${side}_starters`) ?? ""), players),
    substitutes: parseLineupText(String(fd.get(`${side}_subs`) ?? ""), players),
  };
}

export async function saveLineup(fd: FormData) {
  await requireAccess("squad");
  const squad = getSquad();
  const back = "/admin/squad/lineup/";
  const date = jalaliPartsToIso(str(fd, "date"), str(fd, "time"));
  if (!date) redirect(withError(back, "تاریخ بازی را شمسی و به شکل ۱۴۰۵/۰۸/۱۵ وارد کنید."));

  // Only the club's own players are linked to profiles; the opponent's are plain names.
  const homeIsClub = fd.get("clubSide") !== "away";
  const home = readTeam(fd, "home", homeIsClub ? squad.players : []);
  const away = readTeam(fd, "away", homeIsClub ? [] : squad.players);
  if (!home.team || !away.team) redirect(withError(back, "نام هر دو تیم لازم است."));
  for (const t of [home, away]) {
    const outfield = t.formation.split("-").map(Number);
    if (!/^\d(-\d){1,4}$/.test(t.formation) || outfield.reduce((a, b) => a + b, 0) !== 10) {
      redirect(withError(back, `آرایش «${t.formation}» درست نیست؛ جمع اعداد باید ۱۰ باشد (مثل 4-3-3).`));
    }
  }

  saveSquad({
    ...squad,
    isSample: false,
    lineup: {
      match: str(fd, "match") || `${home.team} - ${away.team}`,
      date,
      ...(str(fd, "competition") ? { competition: str(fd, "competition") } : {}),
      ...(str(fd, "venue") ? { venue: str(fd, "venue") } : {}),
      home,
      away,
    },
  });
  redirect(`${back}?ok=saved`);
}
