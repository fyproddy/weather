"use client";

import { useEffect, useRef, useState } from "react";
import manifest from "@/content/photo-manifest.json";
import { photos, type PhotoKey, type PhotoRef } from "@/content/images";

type Manifest = Record<string, { width: number; height: number; sizes: number[]; color: string }>;
const m = manifest as Manifest;

type Props = {
  photo: PhotoKey | PhotoRef;
  sizes?: string;
  priority?: boolean;
  className?: string;
  position?: string;
};

function sources(src: string) {
  const local = m[src];
  if (local) {
    const largest = local.sizes[local.sizes.length - 1];
    return {
      src: `/images/${src}-${largest >= 1600 ? 1600 : largest}.webp`,
      srcSet: local.sizes.map((w) => `/images/${src}-${w}.webp ${w}w`).join(", "),
      color: local.color,
    };
  }
  // remote (Unsplash-style) URL: let the CDN resize
  const join = src.includes("?") ? "&" : "?";
  return {
    src: `${src}${join}w=1600`,
    srcSet: [640, 1080, 1600, 2200].map((w) => `${src}${join}w=${w} ${w}w`).join(", "),
    color: undefined,
  };
}

/**
 * A photograph that fills its parent (the parent sets the shape).
 * Local photos get responsive WebP sizes; remote photos fall back to a local
 * one if they fail to load.
 */
export default function Photo({ photo, sizes = "100vw", priority, className, position }: Props) {
  const ref: PhotoRef = typeof photo === "string" ? photos[photo] : photo;
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // an image can fail before React hydrates and attaches onError
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0 && ref.fallback) setFailed(true);
  }, [ref.fallback]);
  const active = failed && ref.fallback ? ref.fallback : ref.src;
  const s = sources(active);

  return (
    <span className={`photo ${className ?? ""}`} style={{ backgroundColor: s.color }}>
      <img
        key={active}
        ref={img}
        src={s.src}
        srcSet={s.srcSet}
        sizes={sizes}
        alt={ref.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        style={{ objectPosition: position ?? ref.position ?? "50% 50%" }}
        onError={() => ref.fallback && !failed && setFailed(true)}
      />
    </span>
  );
}
