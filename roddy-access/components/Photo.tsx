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

/**
 * A photograph that fills its parent (the parent sets the shape).
 * Serves the responsive WebP sizes made by `npm run images`.
 */
export default function Photo({ photo, sizes = "100vw", priority, className, position }: Props) {
  const ref: PhotoRef = typeof photo === "string" ? photos[photo] : photo;
  const info = m[ref.src];
  if (!info) throw new Error(`Photo "${ref.src}" not found — add it to /photos-src and run npm run images`);
  const largest = info.sizes[info.sizes.length - 1];

  return (
    <span className={`photo ${className ?? ""}`} style={{ backgroundColor: info.color }}>
      <img
        src={`/images/${ref.src}-${Math.min(largest, 1600)}.webp`}
        srcSet={info.sizes.map((w) => `/images/${ref.src}-${w}.webp ${w}w`).join(", ")}
        sizes={sizes}
        alt={ref.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        style={{ objectPosition: position ?? ref.position ?? "50% 50%" }}
      />
    </span>
  );
}
