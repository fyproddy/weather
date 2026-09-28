import type { Metadata } from "next";
import Link from "next/link";
import { site, whatsappLink } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to RODDY ACCESS on WhatsApp or email. Johannesburg stays, transport, dining, nightlife and weekends.",
  alternates: { canonical: "/contact/" },
};

const faq = [
  {
    q: "How does it work?",
    a: "Send us the details — dates, group, occasion, what you need. We come back with options, you choose, and we book and coordinate everything. One contact from start to finish.",
  },
  {
    q: "Do you own the villas and cars?",
    a: "No. We source from trusted owners, operators, chefs and venues for each request, so the options fit your group rather than a fixed list.",
  },
  {
    q: "What does it cost?",
    a: "Every request is quoted on its own. Tell us the budget you're working with and we plan to it.",
  },
  {
    q: "How far ahead should I ask?",
    a: "The earlier the better for villas, big groups and peak weekends. Short notice is fine too — ask, and we'll tell you honestly what's possible.",
  },
];

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

        <div className="faq">
          {faq.map((f) => (
            <div key={f.q}>
              <h2 className="faq-q" style={{ fontSize: "1.25rem", fontWeight: 500, marginBottom: "0.5rem" }}>
                {f.q}
              </h2>
              <p className="muted">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
