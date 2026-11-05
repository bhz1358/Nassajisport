import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadStory, StoryCard, VideoCard } from "../../components";
import { getCategory, getPostsInCategory } from "@/lib/content";
import { VIDEO_CATEGORY } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(decodeURIComponent(slug));
  return cat ? { title: cat.name } : {};
}

export default async function CategoryPage({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);
  const cat = getCategory(slug);
  if (!cat) notFound();
  const [first, ...rest] = getPostsInCategory(slug);
  const isVideo = slug === VIDEO_CATEGORY;

  return (
    <section>
      <h1 className="page-title">{cat.name}</h1>
      {!first ? (
        <p className="muted">هنوز مطلبی در این بخش نیست.</p>
      ) : (
        <>
          <div className="category-lead">
            <LeadStory post={first} />
          </div>
          <div className={isVideo ? "video-grid on-light" : "rail rail-3 wrap"}>
            {rest.map((p) => (isVideo ? <VideoCard key={p.id} post={p} /> : <StoryCard key={p.id} post={p} />))}
          </div>
        </>
      )}
    </section>
  );
}
