import Link from "next/link";
import Photo from "@/components/Photo";
import { getPillar, pillars } from "@/content/pillars";
import { accessWeekend, celebrations, privateSection } from "@/content/weekends";
import { site } from "@/content/site";

const stay = getPillar("stay");
const move = getPillar("move");
const dine = getPillar("dine");
const night = getPillar("night");

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "RODDY ACCESS",
  description: site.description,
  url: site.url,
  email: site.email,
  areaServed: { "@type": "City", name: "Johannesburg" },
  address: { "@type": "PostalAddress", addressLocality: "Johannesburg", addressCountry: "ZA" },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ---------------------------------------------------------------- hero */}
      <section className="hero" data-hero>
        <div className="hero__media">
          {/* mobile: one full-screen photograph; desktop: a diptych */}
          <div className="hero__frame">
            <Photo photo="heroLeft" priority sizes="(min-width: 900px) 58vw, 100vw" />
          </div>
          <div className="hero__frame hero__frame--wide">
            <Photo photo="heroRight" sizes="42vw" />
          </div>
        </div>
        <div className="hero__shade" />

        <div className="hero__content">
          <p className="label hero__kicker">RODDY ACCESS</p>
          <h1 className="display hero__title">
            <span>Johannesburg,</span> <em>curated.</em>
          </h1>
          <div className="hero__row">
            <Link href="/plan/" className="btn btn--light">
              Plan your experience
            </Link>
            <p className="hero__pillars">{site.pillars}</p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- intro */}
      <section className="wrap intro">
        <div className="grid">
          <h2 className="h2 intro__title" data-reveal>
            One connection for your Johannesburg experience.
          </h2>
          <p className="lead intro__copy" data-reveal style={{ ["--d" as string]: 1 }}>
            Stays, movement, dining, nightlife and private weekends — arranged around you.
          </p>
        </div>
        <nav className="index" aria-label="Explore">
          {pillars.map((p) => (
            <a key={p.slug} href={`#${p.slug}`}>
              {p.title.charAt(0) + p.title.slice(1).toLowerCase()}
              <span>{p.index}</span>
            </a>
          ))}
        </nav>
      </section>

      {/* ---------------------------------------------------------------- STAY */}
      <section id="stay" className="p-stay" aria-labelledby="stay-title">
        <div className="p-stay__media">
          <div data-parallax="0.08">
            <Photo photo={stay.photo} sizes="100vw" />
          </div>
          <p className="label p-stay__index">{stay.index} / 04</p>
          <h2 id="stay-title" className="word p-stay__word">
            {stay.title}
          </h2>
        </div>
        <div className="wrap p-stay__text">
          <ul className="pillar-services" data-reveal>
            {stay.services.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="lead" data-reveal style={{ ["--d" as string]: 1 }}>
            {stay.lead}
          </p>
          <Link href="/stay/" className="btn" data-reveal style={{ ["--d" as string]: 2 }}>
            {stay.cta.label}
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- MOVE */}
      <section id="move" className="wrap section" aria-labelledby="move-title">
        <div className="p-move">
          <div className="p-move__text">
            <p className="label muted" data-reveal>
              {move.index} / 04
            </p>
            <h2 id="move-title" className="word" data-reveal>
              {move.title}
            </h2>
            <ul className="pillar-services" data-reveal>
              {move.services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="body muted" data-reveal>
              {move.lead}
            </p>
            <div data-reveal>
              <Link href="/move/" className="btn">
                {move.cta.label}
              </Link>
            </div>
          </div>
          <div className="p-move__photos">
            <div className="p-move__a" data-reveal-img>
              <Photo photo="move" sizes="(min-width: 900px) 34vw, 56vw" />
            </div>
            <div className="p-move__b" data-reveal-img>
              <Photo photo="moveVClass" sizes="(min-width: 900px) 25vw, 42vw" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- DINE */}
      <section id="dine" className="p-dine section" aria-labelledby="dine-title">
        <div className="wrap p-dine__top">
          <div className="p-dine__photo" data-reveal-img>
            <Photo photo="dineChef" sizes="(min-width: 900px) 52vw, 100vw" />
          </div>
          <div className="p-dine__text">
            <div className="pillar-top" data-reveal>
              <h2 id="dine-title" className="word">
                {dine.title}
              </h2>
              <p className="label muted">{dine.index} / 04</p>
            </div>
            <ul className="p-dine__list" data-reveal>
              {dine.offer.map((o) => (
                <li key={o.name}>
                  <strong>{o.name.toUpperCase()}</strong>
                  <span>{o.short ?? o.line}</span>
                </li>
              ))}
            </ul>
            <div data-reveal>
              <Link href="/dine/" className="btn">
                {dine.cta.label}
              </Link>
            </div>
          </div>
        </div>

        <div className="wrap p-dine__promise">
          <p className="p-dine__promise-line" data-reveal>
            You arrive. <em>Everything is already prepared.</em>
          </p>
        </div>
        <div className="p-dine__wide" style={{ marginTop: "clamp(40px, 6vw, 80px)" }}>
          <div data-parallax="0.12">
            <Photo photo="dine" sizes="100vw" />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- NIGHT */}
      <section id="night" className="p-night" aria-labelledby="night-title">
        <div className="p-night__media">
          <div data-parallax="0.1">
            <Photo photo={night.photo} sizes="100vw" />
          </div>
        </div>
        <div className="wrap p-night__inner">
          <div>
            <p className="label" data-reveal style={{ opacity: 0.7 }}>
              {night.index} / 04
            </p>
            <h2 id="night-title" className="word" data-reveal style={{ marginTop: "1rem" }}>
              {night.title}
            </h2>
          </div>
          <div className="p-night__side">
            <ul className="pillar-services" data-reveal>
              {night.services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="lead" data-reveal>
              {night.lead}
            </p>
            <div data-reveal>
              <Link href="/night/" className="btn btn--light">
                {night.cta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ ACCESS WEEKEND */}
      <section className="wrap section" aria-labelledby="aw-title">
        <div className="weekend">
          <div className="weekend__head">
            <p className="label muted" data-reveal>
              Weekends
            </p>
            <h2 id="aw-title" className="h2" data-reveal>
              The Access Weekend
            </h2>
            <p className="lead" data-reveal>
              {accessWeekend.lead} Tell us your dates, group size, occasion and budget. We build the weekend around
              you.
            </p>
            <div data-reveal style={{ display: "flex", gap: "1.25rem 2rem", flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/plan/?type=full-weekend" className="btn btn--ink">
                {accessWeekend.cta}
              </Link>
              <Link href="/weekends/" className="link">
                How it works
              </Link>
            </div>
          </div>
          <div>
            <ol className="timeline">
              {accessWeekend.example.map((e, i) => (
                <li key={e.when} data-reveal style={{ ["--d" as string]: i % 3 }}>
                  <time>{e.when}</time>
                  <p>{e.what}</p>
                </li>
              ))}
            </ol>
            <p className="timeline__note" data-reveal>
              One way a weekend can run. Yours is planned from scratch.
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- PRIVATE SECTION */}
      <section className="ps section" aria-labelledby="ps-title">
        <div className="wrap ps__grid">
          <div>
            <p className="label" style={{ color: "var(--grey-dark)" }} data-reveal>
              The signature
            </p>
            <h2 id="ps-title" className="ps__title" data-reveal style={{ marginTop: "1.25rem" }}>
              The Private
              <br />
              Section
            </h2>
            <p className="lead ps__lead" data-reveal>
              {privateSection.lead}
            </p>
            <ol className="ps__sequence">
              {[...privateSection.sequence, privateSection.arrive].map((line, i) => (
                <li key={line} data-reveal style={{ ["--d" as string]: i }}>
                  {line}
                </li>
              ))}
            </ol>
          </div>
          <div className="ps__side">
            <div className="ps__photo" data-reveal-img>
              <Photo photo="drinks" sizes="(min-width: 900px) 38vw, 100vw" />
            </div>
          </div>
        </div>
        <div className="wrap">
          <div className="ps__core" data-reveal>
            <p className="lead">{privateSection.close}</p>
            <Link href="/private-section/" className="btn btn--light">
              Discover the Private Section
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- CELEBRATIONS */}
      <section className="wrap section" aria-labelledby="cel-title">
        <div className="celebrate__head">
          <h2 id="cel-title" className="h2" data-reveal>
            Built around the occasion.
          </h2>
          <p className="body muted" data-reveal>
            Birthdays, group weekends, send-offs and artists in town. Pick where you're starting from.
          </p>
        </div>
        <div className="rows">
          {celebrations.map((c) => (
            <Link key={c.name} href={`/plan/?type=full-weekend&occasion=${c.plan}`} className="row" data-reveal>
              <span className="row__name">{c.name}</span>
              <span className="row__items">{c.items.join(" · ")}</span>
              <span className="row__go">Start planning</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
