import type { Metadata } from "next";
import { AdSlot } from "../ad-slot";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadingProgress, ShareBar } from "../client";
import { CategoryBadge, LatestTimeline, SectionHeader, StoryCard, Thumb } from "../components";
import { getByPath, getNews, getPostsInCategory } from "@/lib/content";
import { faDate, faNum, faTime, readingMinutes } from "@/lib/format";
import { postImage, withImageFallbacks } from "@/lib/images";
import { seoFor } from "@/lib/seo-auto";
import { getSettings, logoUrl } from "@/lib/settings";

type Props = { params: Promise<{ path: string[] }> };

/**
 * Splits post HTML after the n-th closing </p> that is not inside another block
 * (a <div>, quote, list, table…), so neither half is left with an unclosed tag that
 * the browser would repair differently from the server. The whole post comes first
 * when there is no such place.
 */
function splitAfterParagraph(html: string, n: number): [string, string] {
  const BLOCK = /<(\/?)(div|blockquote|figure|ul|ol|table|section|article|aside|details|p)\b[^>]*>/gi;
  let depth = 0;
  let count = 0;
  for (const m of html.matchAll(BLOCK)) {
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (tag === "p") {
      if (closing && depth === 0 && ++count === n) {
        const at = m.index! + m[0].length;
        return [html.slice(0, at), html.slice(at)];
      }
      continue;
    }
    depth = Math.max(0, depth + (closing ? -1 : 1));
  }
  return [html, ""];
}

// Every post and page keeps the exact URL it had on WordPress (looked up by path).

async function load(params: Props["params"]) {
  const { path } = await params;
  return getByPath("/" + path.join("/") + "/");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await load(params);
  if (!post) return {};
  // Title and description come from the post unless the editor wrote their own.
  const { title, description } = seoFor(post);
  const image = postImage(post);
  return {
    title,
    description,
    keywords: post.tags.length ? post.tags : undefined,
    alternates: { canonical: post.path },
    openGraph: {
      type: post.type === "post" ? "article" : "website",
      title,
      description,
      ...(image ? { images: [{ url: image, alt: post.title }] } : {}),
      ...(post.type === "post" ? { publishedTime: post.date, modifiedTime: post.modified ?? post.date, authors: post.author ? [post.author] : undefined, tags: post.tags } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function PostPage({ params }: Props) {
  const post = await load(params);
  if (!post) notFound();

  if (post.type === "page") {
    return (
      <article className="article article-page">
        <h1>{post.title}</h1>
        <div className="prose" dangerouslySetInnerHTML={{ __html: withImageFallbacks(post.content) }} />
      </article>
    );
  }

  const related = post.categories[0]
    ? getPostsInCategory(post.categories[0])
        .filter((p) => p.id !== post.id)
        .slice(0, 3)
    : [];
  const [bodyStart, bodyEnd] = splitAfterParagraph(withImageFallbacks(post.content), 2);
  const latest = getNews()
    .filter((p) => p.id !== post.id)
    .slice(0, 6);

  return (
    <>
      <ReadingProgress />
      <NewsJsonLd post={post} />
      <AdSlot slot={1} className="pbox-top" />
      <div className="article-layout">
        <article className="article">
          <header className="article-head">
            <div className="article-cats">
              {post.categories.map((c) => (
                <Link key={c} href={`/category/${c}/`}>
                  <CategoryBadge slug={c} />
                </Link>
              ))}
            </div>
            <h1>{post.title}</h1>
            {post.excerpt && <p className="article-lede">{post.excerpt}</p>}
            <div className="article-meta">
              <span className="avatar" aria-hidden="true">
                {(post.author ?? "ت").charAt(0)}
              </span>
              <div>
                <strong>{post.author ?? "تحریریه"}</strong>
                <span>
                  <time dateTime={post.date}>
                    {faDate(post.date)} · ساعت {faTime(post.date)}
                  </time>
                  {" · "}
                  {faNum(readingMinutes(post.content))} دقیقه مطالعه
                </span>
              </div>
            </div>
          </header>
          {post.featuredImage && <Thumb post={post} className="article-image" />}
          {/* Ad 3 sits after the second paragraph; short posts get it at the end. */}
          <div className="prose" dangerouslySetInnerHTML={{ __html: bodyStart }} />
          <AdSlot slot={3} className="pbox-inline" />
          {bodyEnd && <div className="prose" dangerouslySetInnerHTML={{ __html: bodyEnd }} />}
          {post.tags.length > 0 && (
            <p className="tags">
              {post.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </p>
          )}
          <ShareBar title={post.title} />
        </article>

        <aside className="sticky-side">
          <AdSlot slot={2} />
          <div className="panel">
            <SectionHeader title="آخرین اخبار" />
            <LatestTimeline posts={latest} />
          </div>
          <AdSlot slot={4} />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="block">
          <SectionHeader title="مطالب مرتبط" href={`/category/${post.categories[0]}/`} />
          <div className="rail rail-3">
            {related.map((p) => (
              <StoryCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** Google's news structured data (NewsArticle), filled from the post. */
function NewsJsonLd({ post }: { post: NonNullable<Awaited<ReturnType<typeof load>>> }) {
  const settings = getSettings();
  const image = postImage(post);
  const data = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: seoFor(post).title,
    description: seoFor(post).description,
    datePublished: post.date,
    dateModified: post.modified ?? post.date,
    ...(image ? { image: [image] } : {}),
    author: { "@type": post.author ? "Person" : "Organization", name: post.author || settings.title },
    publisher: { "@type": "NewsMediaOrganization", name: settings.title, logo: { "@type": "ImageObject", url: logoUrl(settings) } },
    mainEntityOfPage: post.path,
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
    inLanguage: "fa-IR",
  };
  // "<" is escaped so text in the post can't close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
