// Brand, contact and navigation — edit here, used across the whole site.

export const site = {
  name: "RODDY ACCESS",
  tagline: "Johannesburg, curated.",
  pillars: "STAY • MOVE • DINE • NIGHT",
  description:
    "A private Johannesburg lifestyle concierge. Stays, transport, private dining, nightlife and complete weekends — arranged through one contact.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://roddyaccess.co.za",
  city: "Johannesburg",

  // WhatsApp number in international format, digits only (e.g. 27821234567).
  // Set NEXT_PUBLIC_WHATSAPP_NUMBER or replace the empty string below.
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
  email: "hello@roddyaccess.co.za",
  instagram: "https://instagram.com/roddyaccess",

  // Optional JSON endpoint (Formspree, Basin, own API) for plan requests.
  formEndpoint: process.env.NEXT_PUBLIC_FORM_ENDPOINT || "",
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
  const base = site.whatsapp ? `https://wa.me/${site.whatsapp}` : "https://wa.me/";
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
