import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge, PostCard, SectionTitle, Thumb } from "../components";
import { getByPath, getContent, getPostsInCategory } from "@/lib/content";
import { faDate } from "@/lib/format";

type Props = { params: Promise<{ path: string[] }> };

// Every post and page keeps the exact URL it had on WordPress.
export function generateStaticParams() {
  return getContent().posts.map((p) => ({
    path: p.path.split("/").filter(Boolean),
  }));
}

export const dynamicParams = false;

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
    openGraph: post.featuredImage ? { images: [post.featuredImage] } : undefined,
  };
}

export default async function PostPage({ params }: Props) {
  const post = await load(params);
  if (!post) notFound();

  const related =
    post.type === "post" && post.categories[0]
      ? getPostsInCategory(post.categories[0])
          .filter((p) => p.id !== post.id)
          .slice(0, 3)
      : [];

  return (
    <article className="article">
      <header className="article-head">
        {post.categories.map((c) => (
          <Link key={c} href={`/category/${c}/`}>
            <CategoryBadge slug={c} />
          </Link>
        ))}
        <h1>{post.title}</h1>
        {post.type === "post" && (
          <p className="muted">
            {post.author && <span>{post.author} · </span>}
            <time dateTime={post.date}>{faDate(post.date)}</time>
          </p>
        )}
      </header>
      {post.featuredImage && <Thumb post={post} className="article-image" />}
      <div className="prose" dangerouslySetInnerHTML={{ __html: post.content }} />
      {post.tags.length > 0 && (
        <p className="tags">
          {post.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </p>
      )}
      {related.length > 0 && (
        <section>
          <SectionTitle>مطالب مرتبط</SectionTitle>
          <div className="cards">
            {related.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
