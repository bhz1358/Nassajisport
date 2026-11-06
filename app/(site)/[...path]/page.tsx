import type { Metadata } from "next";
import { AdSlot } from "../ad-slot";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadingProgress, ShareBar } from "../client";
import { CategoryBadge, LatestTimeline, SectionHeader, StoryCard, Thumb } from "../components";
import { getByPath, getNews, getPostsInCategory } from "@/lib/content";
import { faDate, faNum, faTime, readingMinutes } from "@/lib/format";
import { postImage, withImageFallbacks } from "@/lib/images";

type Props = { params: Promise<{ path: string[] }> };

/** Splits post HTML after the n-th closing </p>; the whole post comes first when it is shorter. */
function splitAfterParagraph(html: string, n: number): [string, string] {
  let at = -1;
  for (let i = 0; i < n; i++) {
    at = html.indexOf("</p>", at + 1);
    if (at < 0) return [html, ""];
  }
  return [html.slice(0, at + 4), html.slice(at + 4)];
}

// Every post and page keeps the exact URL it had on WordPress (looked up by path).

async function load(params: Props["params"]) {
  const { path } = await params;
  return getByPath("/" + path.join("/") + "/");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await load(params);
  if (!post) return {};
  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    openGraph: postImage(post) ? { images: [postImage(post)!] } : undefined,
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
