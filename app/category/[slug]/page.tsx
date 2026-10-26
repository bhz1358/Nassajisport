import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostCard, SectionTitle } from "../../components";
import { getCategory, getContent, getPostsInCategory } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getContent().categories.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(decodeURIComponent(slug));
  return cat ? { title: cat.name } : {};
}

export default async function CategoryPage({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);
  const cat = getCategory(slug);
  if (!cat) notFound();
  const posts = getPostsInCategory(slug);

  return (
    <section>
      <SectionTitle>{cat.name}</SectionTitle>
      {posts.length === 0 ? (
        <p className="muted">هنوز مطلبی در این بخش نیست.</p>
      ) : (
        <div className="cards">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </section>
  );
}
