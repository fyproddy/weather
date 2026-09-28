// Brand, contact and navigation — edit here, used across the whole site.

export const site = {
  name: "RODDY ACCESS",
  tagline: "Johannesburg, curated.",
  pillars: "STAY • MOVE • DINE • NIGHT",
  description:
    "A private Johannesburg lifestyle concierge. Stays, transport, private dining, nightlife and complete weekends — arranged through one contact.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://roddyaccess.co.za",
  city: "Johannesburg",

  // WhatsApp number in international format, digits only.
  whatsapp: "27680579202",
  email: "hello@roddyaccess.co.za",
  instagram: "https://instagram.com/roddyaccess",
};

export const nav = [
  { label: "Stay", href: "/stay/" },
  { label: "Move", href: "/move/" },
  { label: "Dine", href: "/dine/" },
  { label: "Night", href: "/night/" },
  { label: "Weekends", href: "/weekends/" },
  { label: "The Private Section", href: "/private-section/" },
];

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${site.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
