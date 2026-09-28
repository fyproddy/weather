import type { Metadata } from "next";
import Link from "next/link";
import Photo from "@/components/Photo";
import { accessWeekend, celebrations, privateSection } from "@/content/weekends";

export const metadata: Metadata = {
  title: "Weekends — The Access Weekend & Celebrations in Johannesburg",
  description:
    "Your Johannesburg weekend planned from start to finish: stay, transport, dining, nightlife and the movement in between. Birthdays, group weekends, bachelor and bachelorette, VIP movement.",
  alternates: { canonical: "/weekends/" },
};

export default function WeekendsPage() {
  return (
    <>
      <section className="phero" data-hero>
        <div className="phero__media">
          <div data-parallax="0.06">
            <Photo photo="weekend" priority sizes="100vw" />
          </div>
        </div>
        <div className="phero__content">
          <div>
            <p className="label" style={{ opacity: 0.8, marginBottom: "1rem" }}>
              Weekends
            </p>
            <h1 className="display">
              The Access <em>Weekend</em>
            </h1>
          </div>
          <p className="lead phero__lead">{accessWeekend.lead}</p>
        </div>
      </section>

      {/* tell us */}
      <section className="wrap section">
        <p className="label muted" data-reveal>
          Tell us four things
        </p>
        <ol className="tellus" data-reveal style={{ marginTop: "1.5rem" }}>
          {accessWeekend.tellUs.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        <p className="lead" data-reveal style={{ marginTop: "2.5rem" }}>
          We plan the rest.
        </p>
      </section>

      {/* what can be included */}
      <section className="wrap split">
        <div className="split__photo" data-reveal-img>
          <Photo photo="moveVClass" sizes="(min-width: 900px) 50vw, 100vw" />
        </div>
        <div style={{ display: "grid", gap: "2rem" }}>
          <p className="label muted" data-reveal>
            What we can arrange
          </p>
          <div className="includes" data-reveal>
            <ul className="slashes">
              {accessWeekend.inclusions.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
          <p className="h3" data-reveal>
            <em>{accessWeekend.line}</em>
          </p>
          <div data-reveal>
            <Link href="/plan/?type=full-weekend" className="btn btn--ink">
              {accessWeekend.cta}
            </Link>
          </div>
        </div>
      </section>

      {/* example */}
      <section className="wrap section">
        <div className="weekend">
          <div className="weekend__head">
            <h2 className="h2" data-reveal>
              An example weekend.
            </h2>
          </div>
          <ol className="timeline">
            {accessWeekend.example.map((e, i) => (
              <li key={e.when} data-reveal style={{ ["--d" as string]: i % 3 }}>
                <time>{e.when}</time>
                <p>{e.what}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* the signature */}
      <Link href="/private-section/" className="ps-teaser" aria-label="The Private Section">
        <div className="ps-teaser__media">
          <div data-parallax="0.08">
            <Photo photo="drinks" sizes="100vw" />
          </div>
        </div>
        <div className="wrap ps-teaser__inner">
          <p className="label" style={{ color: "var(--stone)" }}>
            The signature
          </p>
          <p className="ps__title">
            The Private <em>Section</em>
          </p>
          <p className="lead" style={{ maxWidth: "24em", color: "var(--stone)" }}>
            {privateSection.lead}
          </p>
          <span className="link" style={{ justifySelf: "start" }}>
            Discover
          </span>
        </div>
      </Link>

      {/* celebrations */}
      <section id="celebrations" className="wrap section" aria-labelledby="cel">
        <div className="celebrate__head">
          <h2 id="cel" className="h2" data-reveal>
            Celebrations
          </h2>

        </div>
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
