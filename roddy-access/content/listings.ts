// Future inventory — stays, vehicles, partners.
//
// These lists are intentionally empty at launch. Nothing renders while a list
// is empty. When suppliers are confirmed, add entries here and they appear on
// the matching page (see <Listings /> in components/Listings.tsx) with no
// redesign needed.
import type { PhotoRef } from "./images";

export type Listing = {
  id: string;
  name: string;
  area?: string; // "Sandton", "Hyde Park", …
  summary: string;
  photo: PhotoRef;
  sleeps?: number; // stays
  seats?: number; // vehicles
  priceFrom?: string; // only ever real, confirmed pricing, e.g. "From R12 000 / night"
  featured?: boolean;
};

export const listings: Record<"stay" | "move" | "dine" | "night", Listing[]> = {
  stay: [],
  move: [],
  dine: [],
  night: [],
};

export type Partner = { name: string; category: string; url?: string };
export const partners: Partner[] = [];
