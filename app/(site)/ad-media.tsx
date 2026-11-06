"use client";

import { useEffect, useRef, useState } from "react";

const MOBILE = "(max-width: 720px)";
const isVideo = (u: string) => /\.(mp4|webm)(\?|#|$)/i.test(u);

/**
 * Ad content when the desktop or mobile file is a video. The file is chosen in the
 * browser so a phone never downloads the desktop video (and the other way round).
 * Videos play muted and looped, like an animated banner; with "reduce motion" set
 * in the visitor's system they stay on the first frame.
 */
export function AdMedia({ image, mobileImage, title, eager }: { image: string; mobileImage?: string; title: string; eager: boolean }) {
  const [src, setSrc] = useState<string>();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE);
    const pick = () => setSrc(mobileImage && mq.matches ? mobileImage : image);
    pick();
    mq.addEventListener("change", pick);
    return () => mq.removeEventListener("change", pick);
  }, [image, mobileImage]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only play while on screen, so sidebar videos further down cost nothing.
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { rootMargin: "200px" });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  if (!src) return <span className="ad-media-placeholder" />;
  if (!isVideo(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={title} loading={eager ? "eager" : "lazy"} decoding="async" />;
  }
  return (
    <video
      key={src}
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload={eager ? "auto" : "metadata"}
      aria-label={title}
      title={title}
      // A browser that cannot play the file (WebM on an older iPhone, for example)
      // would show an empty black box: hide the ad there instead.
      onError={(e) => {
        const box = e.currentTarget.closest("aside");
        if (box) box.hidden = true;
      }}
    />
  );
}
