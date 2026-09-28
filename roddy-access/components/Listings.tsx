import { listings, type Listing } from "@/content/listings";
import Photo from "./Photo";

/**
 * Renders confirmed inventory for a section once it exists.
 * Returns nothing while the list is empty — no empty states, no placeholders.
 */
export default function Listings({ section, title }: { section: keyof typeof listings; title: string }) {
  const items: Listing[] = listings[section];
  if (!items.length) return null;

  return (
    <section className="section wrap listings" aria-label={title}>
      <h2 className="label">{title}</h2>
      <div className="listings__row">
        {items.map((item) => (
          <article key={item.id} className="listing" data-reveal>
            <div className="listing__photo">
              <Photo photo={item.photo} sizes="(min-width: 900px) 33vw, 85vw" />
            </div>
            <h3 className="listing__name">{item.name}</h3>
            <p className="listing__meta">
              {[item.area, item.sleeps && `Sleeps ${item.sleeps}`, item.seats && `${item.seats} seats`, item.priceFrom]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="listing__summary">{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
