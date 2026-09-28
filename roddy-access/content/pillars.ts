// The four ways in: STAY, MOVE, DINE, NIGHT.
// Each drives its own page (/stay, /move, …) and its section on the homepage.
import type { PhotoKey } from "./images";

export type PillarService = {
  name: string;
  line: string;
  short?: string; // compact version for the homepage
  details?: string[];
  photo?: PhotoKey;
};

export type Pillar = {
  slug: "stay" | "move" | "dine" | "night";
  title: string;
  index: string;
  metaTitle: string;
  metaDescription: string;
  photo: PhotoKey;
  services: string[];
  homeLine: string; // the single line shown on the homepage
  lead: string; // one line under the page title
  intro: string;
  statement?: string; // large pull line
  offer: PillarService[];
  cta: { label: string; plan: string };
  pairsWith: Pillar["slug"][];
};

export const pillars: Pillar[] = [
  {
    slug: "stay",
    title: "STAY",
    index: "01",
    metaTitle: "Stay — Villas, Penthouses & Hotels in Johannesburg",
    metaDescription: "Villas, penthouses and hotel suites in Johannesburg, booked for your dates and your group.",
    photo: "stay",
    services: ["Villas", "Penthouses", "Hotels & Suites"],
    homeLine: "Villas, penthouses and hotel suites for your group.",
    lead: "Tell us your dates and how many of you there are. We find the place and book it.",
    intro: "Send us your dates, group size and area. We come back with options, you pick one, and we book it.",
    statement: "The right house changes the whole weekend.",
    offer: [
      {
        name: "Villas",
        line: "Room for the whole group, with a pool, a garden and space for a chef.",
        photo: "stayVilla",
      },
      {
        name: "Penthouses",
        line: "City views in Sandton and Rosebank. Good for smaller groups and birthdays.",
      },
      {
        name: "Hotels & Suites",
        line: "When you want hotel service. We book the rooms and link them to your transport and plans.",
      },
    ],
    cta: { label: "Explore stays", plan: "stay" },
    pairsWith: ["move", "dine"],
  },
  {
    slug: "move",
    title: "MOVE",
    index: "02",
    metaTitle: "Move — Chauffeurs, V-Class & Luxury Cars in Johannesburg",
    metaDescription: "Chauffeurs, V-Class group transport, airport transfers and luxury car hire in Johannesburg.",
    photo: "move",
    services: ["Luxury Car Rental", "Private Chauffeur", "V-Class", "Airport Transfers"],
    homeLine: "Chauffeurs, V-Class, cars and airport pickups.",
    lead: "From the airport to the last stop of the night, your transport is sorted.",
    intro: "Tell us where you need to be and when. We arrange the driver or the car.",
    statement: "Someone is always already outside.",
    offer: [
      {
        name: "Private Chauffeur",
        line: "A driver for the day, the night or the whole weekend.",
      },
      {
        name: "V-Class",
        line: "The whole group in one vehicle, with room for luggage.",
        photo: "moveVClass",
      },
      {
        name: "Luxury Car Rental",
        line: "Drive yourself — Mercedes, Porsche and similar.",
      },
      {
        name: "Airport Transfers",
        line: "Collected at O.R. Tambo or Lanseria and taken straight to where you're staying.",
      },
    ],
    cta: { label: "Arrange transport", plan: "transport" },
    pairsWith: ["stay", "night"],
  },
  {
    slug: "dine",
    title: "DINE",
    index: "03",
    metaTitle: "Dine — Private Chefs & Private Dining in Johannesburg",
    metaDescription: "Private chefs, private dining, group restaurant bookings and celebration dinners in Johannesburg.",
    photo: "dine",
    services: ["Private Dining", "Private Chef", "Group Dining", "Curated Menus", "Celebration Dining"],
    homeLine: "Private chefs. Private tables.",
    lead: "A chef at your villa, or the right table in the city — booked and ready.",
    intro: "Tell us the occasion, the group and the budget. We plan the food and set everything up.",
    statement: "You arrive. Everything is already prepared.",
    offer: [
      {
        name: "Private Chef",
        line: "A chef comes to your villa and cooks for the group.",
        details: ["Breakfast", "Lunch", "Dinner", "Braai", "Late-night meals"],
        photo: "dineChef",
      },
      {
        name: "Private Dining",
        line: "A private dinner for your group, in a setting that suits the occasion.",
      },
      {
        name: "Group Dining",
        line: "Restaurant bookings for bigger groups — seating, menu and dietary needs sorted before you arrive.",
      },
      {
        name: "Curated Menus",
        line: "A menu made for your occasion and budget.",
      },
      {
        name: "Celebration Dining",
        line: "Birthdays and anniversaries, with the table set before you arrive.",
        details: ["Décor", "Cake", "Flowers", "Bottles"],
        photo: "drinks",
      },
    ],
    cta: { label: "Plan dining", plan: "dining" },
    pairsWith: ["stay", "night"],
  },
  {
    slug: "night",
    title: "NIGHT",
    index: "04",
    metaTitle: "Night — VIP Tables & Nightlife in Johannesburg",
    metaDescription: "VIP club tables, nightlife bookings, events and night transport in Johannesburg.",
    photo: "night",
    services: ["VIP Club Tables", "Nightlife Reservations", "Events", "Private Access", "Night Transport"],
    homeLine: "Club tables, events and a driver waiting outside.",
    lead: "Your table booked, your driver waiting.",
    intro: "Tell us the night you want. We book the table and arrange the ride there and home.",
    statement: "Table ready. Ride waiting.",
    offer: [
      { name: "VIP Club Tables", line: "Your table booked, with bottles and arrival time set." },
      { name: "Nightlife Reservations", line: "The right venue for your group, booked ahead." },
      { name: "Events", line: "Tickets and entry for shows and parties in the city." },
      { name: "Private Access", line: "Private rooms and sections, where the venue has them." },
      {
        name: "Night Transport",
        line: "A driver for the night who gets everyone home.",
        photo: "moveVClass",
      },
    ],
    cta: { label: "Plan the night", plan: "nightlife" },
    pairsWith: ["dine", "move"],
  },
];

export const getPillar = (slug: Pillar["slug"]) => pillars.find((p) => p.slug === slug)!;
