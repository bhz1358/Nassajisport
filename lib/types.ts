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
  /** SEO title/description from Yoast or Rank Math, when the old site had them. */
  seo?: { title?: string; description?: string };
};

export type Content = {
  site: { title: string; description: string; sourceUrl?: string; importedAt?: string };
  posts: Post[];
  categories: Category[];
  isSample: boolean;
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

export type LeagueData = {
  competition: string;
  season: string;
  updatedAt: string;
  isSample: boolean;
  standings: StandingRow[];
  fixtures: Fixture[];
};
