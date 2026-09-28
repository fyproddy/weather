import Link from "next/link";
import Photo from "./Photo";
import Listings from "./Listings";
import { getPillar, type Pillar } from "@/content/pillars";

/**
 * Shared layout for /stay, /move, /dine and /night.
 * Content lives in content/pillars.ts.
 */
export default function PillarPage({ slug }: { slug: Pillar["slug"] }) {
  const p = getPillar(slug);
  const planHref = `/plan/?type=${p.cta.plan}`;

  return (
    <>
      <section className="phero" data-hero>
        <div className="phero__media">
          <div data-parallax="0.06">
            <Photo photo={p.photo} priority sizes="100vw" />
          </div>
        </div>
        <div className="phero__content">
          <div>
            <h1 className="word">{p.title}</h1>
          </div>
          <p className="lead phero__lead">{p.lead}</p>
        </div>
      </section>

      <section className="wrap section">
        <p className="pintro__text" data-reveal>
          {p.intro}
        </p>
      </section>

      <section className="wrap offer" aria-label={`${p.title.toLowerCase()} services`}>
        {groupOffer(p).map((block, b) =>
          block.photo ? (
            <article
              key={block.items[0].o.name}
              className={`offer__item ${block.flip ? "offer__item--flip" : ""}`}
              data-reveal
            >
              <div className="offer__photo" data-reveal-img>
                <Photo photo={block.items[0].o.photo!} sizes="(min-width: 900px) 48vw, 100vw" />
              </div>
              <OfferText {...block.items[0]} />
            </article>
          ) : (
            <div key={b} className="offer__group">
              {block.items.map((it) => (
                <article key={it.o.name} className="offer__item offer__item--plain" data-reveal>
                  <OfferText {...it} />
                </article>
              ))}
            </div>
          )
        )}
      </section>

      <Listings section={p.slug} title={`Current ${p.title.toLowerCase()} options`} />

      {p.statement && (
        <section className="statement section" style={{ marginTop: "var(--section)" }}>
          <div className="wrap" style={{ display: "grid", gap: "2.5rem" }}>
            <p className="statement__line" data-reveal>
              {p.statement}
            </p>
            <div data-reveal>
              <Link href={planHref} className="btn btn--ink">
                {p.cta.label}
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="wrap section" aria-label="Continue">
        <p className="label muted" style={{ marginBottom: "1.5rem" }}>
          Pairs well with
        </p>
        <div className="next">
          {p.pairsWith.map((slug) => {
            const n = getPillar(slug);
            return (
              <Link key={slug} href={`/${slug}/`} className="next__item" data-reveal>
                <Photo photo={n.photo} sizes="(min-width: 700px) 50vw, 100vw" />
                <span className="next__label">
                  <span className="next__word">{n.title}</span>
                  <span className="label">{n.services.slice(0, 2).join(" · ")}</span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="cta-band" style={{ marginTop: "var(--section)" }}>
          <h2 className="h2" style={{ maxWidth: "14em" }}>
            Or hand us the whole weekend.
          </h2>
          <Link href="/weekends/" className="link">
            Weekends
          </Link>
        </div>
      </section>
    </>
  );
}

type Entry = { o: Pillar["offer"][number]; i: number };

// Photographed services stand alone and alternate sides; consecutive
// text-only services are grouped so they read as one ruled list.
function groupOffer(p: Pillar) {
  const blocks: { photo: boolean; flip: boolean; items: Entry[] }[] = [];
  let photos = 0;
  p.offer.forEach((o, i) => {
    if (o.photo) {
      blocks.push({ photo: true, flip: photos++ % 2 === 1, items: [{ o, i }] });
    } else {
      const last = blocks[blocks.length - 1];
      if (last && !last.photo) last.items.push({ o, i });
      else blocks.push({ photo: false, flip: false, items: [{ o, i }] });
    }
  });
  return blocks;
}

function OfferText({ o }: Entry) {
  return (
    <div className="offer__text">
      <div className="offer__head">
        <h2 className="h2">{o.name}</h2>
      </div>
      <p className="lead">{o.line}</p>
      {o.details && (
        <ul className="slashes offer__details">
          {o.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
