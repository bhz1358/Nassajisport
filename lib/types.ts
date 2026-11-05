export type Category = {
  slug: string;
  name: string;
  parent?: string;
};

export type Post = {
  id: number;
  type: "post" | "page";
  title: string;
  slug: string;
  /** URL path on the old WordPress site, e.g. "/news/some-title/". Used as the route so links never break. */
  path: string;
  date: string;
  modified?: string;
  author?: string;
  excerpt: string;
  content: string;
  categories: string[];
  tags: string[];
  featuredImage?: string;
  sticky?: boolean;
  /** Missing means published (imported posts). Drafts are hidden from the public site. */
  status?: "publish" | "draft";
  /** SEO title/description from Yoast or Rank Math, when the old site had them. */
  seo?: { title?: string; description?: string };
};

export type Comment = {
  postId: number;
  id: number;
  parent?: number;
  author: string;
  date: string;
  content: string;
};

export type StandingRow = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  /** Last results, oldest first. */
  form?: ("W" | "D" | "L")[];
};

export type Fixture = {
  date: string;
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "live" | "finished";
  minute?: number;
  venue?: string;
};

export type Position = "GK" | "DF" | "MF" | "FW";

export type Player = {
  slug: string;
  name: string;
  number: number;
  position: Position;
  birthDate?: string;
  heightCm?: number;
  foot?: string;
  nationality?: string;
  photo?: string;
  bio?: string;
  stats: {
    appearances: number;
    minutes: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    cleanSheets?: number;
  };
};

export type Squad = {
  season: string;
  isSample: boolean;
  players: Player[];
  staff: { role: string; name: string; photo?: string }[];
  lineup?: MatchLineup;
};

export type LineupPlayer = {
  number: number;
  name: string;
  /** Links to the club player's profile when set. */
  slug?: string;
  captain?: boolean;
};

export type TeamLineup = {
  team: string;
  /** e.g. "4-3-3"; starters are listed goalkeeper first, then each line from right to left. */
  formation: string;
  coach?: string;
  starters: LineupPlayer[];
  substitutes: LineupPlayer[];
};

export type MatchLineup = {
  match: string;
  date: string;
  competition?: string;
  venue?: string;
  home: TeamLineup;
  away: TeamLineup;
};

export type LeagueData = {
  competition: string;
  season: string;
  updatedAt: string;
  isSample: boolean;
  standings: StandingRow[];
  fixtures: Fixture[];
};

export type ColorMode = "auto" | "light" | "dark";

export type Settings = {
  title: string;
  description: string;
  /** Site logo URL; the bundled /logo.webp when not set. */
  logo?: string;
  ticketsUrl: string;
  social: { instagram: string; telegram: string };
  theme: {
    preset: string;
    /** Used when preset is "custom". */
    brand?: string;
    accent?: string;
    mode: ColorMode;
  };
  sourceUrl?: string;
  importedAt?: string;
  /** Bumped when a redesign changes the default theme (see getSettings). */
  designVersion?: number;
};

export type AdminUser = {
  username: string;
  /** scrypt: "salt:hash" in hex */
  password: string;
  createdAt: string;
};
