import type { Metadata } from "next";
import Link from "next/link";
import { howItWorks, site, whatsappLink } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to RODDY ACCESS on WhatsApp or email. Johannesburg stays, transport, dining, nightlife and weekends.",
  alternates: { canonical: "/contact/" },
};


export default function ContactPage() {
  return (
    <section className="wrap contact" style={{ paddingBottom: "var(--section)" }}>
      <p className="label muted">Contact</p>
      <h1 className="display" style={{ marginTop: "1.5rem" }}>
        Talk to <em>us.</em>
      </h1>

      <div className="contact__grid">
        <div>
          <div className="contact__ways">
            <a href={whatsappLink("Hi RODDY ACCESS — I'd like to plan something in Johannesburg.")} target="_blank" rel="noopener">
              Chat on WhatsApp <span>Fastest</span>
            </a>
            <a href={`mailto:${site.email}`}>
              {site.email} <span>Email</span>
            </a>
            <a href={site.instagram} target="_blank" rel="noopener">
              Instagram <span>Follow</span>
            </a>
            <div>
              {site.city} <span>By arrangement</span>
            </div>
          </div>
          <div style={{ marginTop: "2.5rem" }}>
            <Link href="/plan/" className="btn btn--ink">
              Plan your experience
            </Link>
          </div>
        </div>

        <div>
          <p className="label muted" style={{ marginBottom: "1.25rem" }}>
            How it works
          </p>
          <ol className="how how--stack">
            {howItWorks.map((step, i) => (
              <li key={step.title}>
                <span className="how__n">{i + 1}</span>
                <h2 className="how__title">{step.title}</h2>
                <p className="how__line">{step.line}</p>
              </li>
            ))}
          </ol>
          <p className="muted" style={{ marginTop: "1.5rem" }}>
            You get the full price before anything is booked.
          </p>
        </div>
      </div>
    </section>
  );
}
