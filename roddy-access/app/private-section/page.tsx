import type { Metadata } from "next";
import Link from "next/link";
import Photo from "@/components/Photo";
import type { PhotoKey } from "@/content/images";
import { privateSection } from "@/content/weekends";

export const metadata: Metadata = {
  title: "The Private Section — A Whole Weekend Built Around Your Group",
  description:
    "The signature RODDY ACCESS experience: a private villa with the drinks, food, setup, transport and night already arranged. The group simply arrives.",
  alternates: { canonical: "/private-section/" },
};

// a photograph beside some of the lines in the sequence
const beside: Partial<Record<number, PhotoKey>> = {
  0: "stayVilla",
  1: "champagne",
  2: "dineChef",
  4: "move",
};

export default function PrivateSectionPage() {
  return (
    <div className="dark">
      <section className="phero" data-hero>
        <div className="phero__media">
          <div data-parallax="0.06">
            <Photo photo="stay" priority sizes="100vw" />
          </div>
        </div>
        <div className="phero__content">
          <div>
            <p className="label" style={{ opacity: 0.8, marginBottom: "1rem" }}>
              The signature
            </p>
            <h1 className="display">
              The Private <em>Section</em>
            </h1>
          </div>
          <p className="lead phero__lead">{privateSection.lead}</p>
        </div>
      </section>

      <section className="wrap section">
        <div className="seq">
          {privateSection.sequence.map((line, i) => (
            <div key={line} className="seq__line" data-reveal>
              <p>{line}</p>
              {beside[i] && (
                <div className="seq__photo" data-reveal-img>
                  <Photo photo={beside[i]!} sizes="(min-width: 900px) 460px, 100vw" />
                </div>
              )}
            </div>
          ))}
          <p className="seq__arrive" data-reveal>
            {privateSection.arrive}
          </p>
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: "var(--section)" }}>
        <p className="core" data-reveal>
          {privateSection.core}
        </p>
      </section>

      <section className="wrap" style={{ paddingBottom: "var(--section)" }}>
        <div style={{ display: "grid", gap: "1.25rem", marginBottom: "clamp(32px, 5vw, 64px)" }}>
          <p className="label muted" data-reveal>
            What can be arranged
          </p>
          <p className="body muted" data-reveal>
            Pick what you want. We set it all up before you arrive.
          </p>
        </div>
        <div className="incl">
          {privateSection.inclusions.map((g) => (
            <div key={g.group} className="incl__group" data-reveal>
              <h3>{g.group}</h3>
              <ul className="slashes">
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: "var(--section)" }}>
        <div className="ps__core" style={{ marginTop: 0 }}>
          <p className="h2" data-reveal>
            You arrive. <em>We’ve already set the tone.</em>
          </p>
          <div data-reveal>
            <Link href="/plan/?type=private-section" className="btn btn--light">
              {privateSection.cta}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
