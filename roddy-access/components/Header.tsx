"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, site, whatsappLink } from "@/content/site";
import Wordmark from "./Wordmark";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [overHero, setOverHero] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // light text while sitting on a full-bleed photo, solid bar once past it
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setOverHero(!!hero && y < hero.offsetHeight - 72);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tone = open ? "menu" : overHero ? "light" : scrolled ? "solid" : "plain";
  const isPlan = pathname.startsWith("/plan");

  return (
    <>
      <header className={`header header--${tone}`}>
        <div className="header__inner">
          <Link href="/" className="header__mark" aria-label="RODDY ACCESS — home">
            <Wordmark />
          </Link>

          <nav className="header__nav" aria-label="Main">
            {nav.slice(0, 5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`header__link ${pathname === item.href ? "is-current" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header__end">
            {!isPlan && (
              <Link href="/plan/" className="header__plan">
                Plan
              </Link>
            )}
            <button
              type="button"
              className="header__menu"
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen((o) => !o)}
            >
              <span className="header__menu-label">{open ? "Close" : "Menu"}</span>
            </button>
          </div>
        </div>
      </header>

      <div id="site-menu" className={`menu ${open ? "is-open" : ""}`} aria-hidden={!open} inert={!open}>
        <nav className="menu__nav" aria-label="Menu">
          {nav.map((item, i) => (
            <Link key={item.href} href={item.href} className="menu__link" style={{ transitionDelay: `${open ? 80 + i * 45 : 0}ms` }}>
              <span className="menu__index">{String(i + 1).padStart(2, "0")}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="menu__foot">
          <Link href="/plan/" className="btn btn--ink btn--block">
            Plan your experience
          </Link>
          <div className="menu__contact">
            <a href={whatsappLink("Hi RODDY ACCESS — I'd like to plan something in Johannesburg.")} className="link" target="_blank" rel="noopener">
              Chat on WhatsApp
            </a>
            <a href={`mailto:${site.email}`} className="link">
              {site.email}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
