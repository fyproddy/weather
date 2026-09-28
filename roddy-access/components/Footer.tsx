import Link from "next/link";
import { nav, site, whatsappLink } from "@/content/site";
import Wordmark from "./Wordmark";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__top">
        <p className="footer__line">
          Tell us what kind of weekend you want.
          <br />
          <em>We arrange it.</em>
        </p>
        <div className="footer__actions">
          <Link href="/plan/" className="btn btn--light">
            Plan your experience
          </Link>
          <a href={whatsappLink("Hi RODDY ACCESS — I'd like to plan something in Johannesburg.")} className="link link--light" target="_blank" rel="noopener">
            Chat on WhatsApp
          </a>
        </div>
      </div>

      <div className="wrap footer__grid">
        <nav className="footer__nav" aria-label="Footer">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/plan/">Plan</Link>
          <Link href="/contact/">Contact</Link>
        </nav>
        <div className="footer__contact">
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <a href={site.instagram} target="_blank" rel="noopener">
            Instagram
          </a>
          <span>{site.city}, South Africa</span>
        </div>
      </div>

      <div className="wrap footer__base">
        <Wordmark className="footer__mark" />
        <p className="footer__small">
          {site.pillars}
          <span>© {new Date().getFullYear()} RODDY ACCESS</span>
        </p>
      </div>
    </footer>
  );
}
