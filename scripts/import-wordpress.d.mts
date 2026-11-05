import type { Category, Comment, Post } from "../lib/types";

export type ConvertResult = {
  site: { title: string; description: string; sourceUrl: string; importedAt: string };
  posts: Post[];
  categories: Category[];
  comments: Comment[];
  attachmentUrls: string[];
  report: {
    sourceUrl: string;
    totals: { items: number; attachments: number };
    imported: { post: number; page: number };
    skipped: Record<string, number>;
    comments: number;
    postsWithoutPath: number[];
  };
};

export function parseWxr(xml: string): unknown;
export function convert(channel: unknown): ConvertResult;
