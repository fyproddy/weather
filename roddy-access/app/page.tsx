import Link from "next/link";
import Photo from "@/components/Photo";
import { getPillar } from "@/content/pillars";
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
        <h2 className="h2 intro__title" data-reveal>
          One connection for your Johannesburg experience.
        </h2>
      </section>

      {/* ---------------------------------------------------------------- STAY */}
      <section id="stay" className="p-stay" aria-labelledby="stay-title">
        <div className="p-stay__media">
          <div data-parallax="0.08">
            <Photo photo={stay.photo} sizes="100vw" />
          </div>
          <h2 id="stay-title" className="word p-stay__word">
            {stay.title}
          </h2>
        </div>
        <div className="wrap one-line" data-reveal>
          <p className="lead">{stay.homeLine}</p>
          <Link href="/stay/" className="link">
            {stay.cta.label}
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- MOVE */}
      <section id="move" className="wrap section" aria-labelledby="move-title">
        <div className="p-move">
          <div className="p-move__text">
            <h2 id="move-title" className="word" data-reveal>
              {move.title}
            </h2>
            <p className="lead" data-reveal>
              {move.homeLine}
            </p>
            <div data-reveal>
              <Link href="/move/" className="link">
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
            <h2 id="dine-title" className="word" data-reveal>
              {dine.title}
            </h2>
            <p className="lead" data-reveal>
              {dine.homeLine}
            </p>
            <div data-reveal>
              <Link href="/dine/" className="link">
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
          <h2 id="night-title" className="word" data-reveal>
            {night.title}
          </h2>
          <div className="p-night__side" data-reveal>
            <p className="lead">{night.homeLine}</p>
            <Link href="/night/" className="link">
              {night.cta.label}
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ ACCESS WEEKEND */}
      <section className="section" aria-labelledby="aw-title">
        <div className="wrap strip__head">
          <h2 id="aw-title" className="h2" data-reveal>
            The Access Weekend
          </h2>
          <p className="lead muted" data-reveal>
            {accessWeekend.line}
          </p>
        </div>
        <ol className="strip" aria-label="How a weekend can run">
          {accessWeekend.strip.map((m, i) => (
            <li key={m.when} className="strip__item" data-reveal style={{ ["--d" as string]: i }}>
              <div className="strip__photo">
                <Photo photo={m.photo} sizes="(min-width: 900px) 22vw, 70vw" />
              </div>
              <p className="strip__cap">
                <time>{m.when}</time> {m.what}
              </p>
            </li>
          ))}
        </ol>
        <div className="wrap" data-reveal style={{ marginTop: "clamp(32px, 5vw, 56px)" }}>
          <Link href="/plan/?type=full-weekend" className="btn btn--ink">
            {accessWeekend.cta}
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------- PRIVATE SECTION */}
      <section className="ps section" aria-labelledby="ps-title">
        <div className="wrap ps__grid">
          <div>
            <h2 id="ps-title" className="ps__title" data-reveal>
              The Private
              <br />
              Section
            </h2>
            <ol className="ps__sequence">
              {[...privateSection.sequence, privateSection.arrive].map((line, i) => (
                <li key={line} data-reveal style={{ ["--d" as string]: i }}>
                  {line}
                </li>
              ))}
            </ol>
            <div data-reveal style={{ marginTop: "clamp(40px, 6vw, 72px)" }}>
              <Link href="/private-section/" className="btn btn--light">
                Discover the Private Section
              </Link>
            </div>
          </div>
          <div className="ps__side">
            <div className="ps__photo" data-reveal-img>
              <Photo photo="drinks" sizes="(min-width: 900px) 38vw, 100vw" />
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- CELEBRATIONS */}
      <section className="wrap section" aria-labelledby="cel-title">
        <h2 id="cel-title" className="label muted" data-reveal style={{ marginBottom: "1.5rem" }}>
          Built around the occasion
        </h2>
        <div className="rows">
          {celebrations.map((c) => (
            <Link key={c.name} href={`/plan/?type=full-weekend&occasion=${c.plan}`} className="row row--simple" data-reveal>
              <span className="row__name">{c.name}</span>
              <span className="row__go">Start planning</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
