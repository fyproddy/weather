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
    metaTitle: "Stay — Villas, Penthouses & Suites in Johannesburg",
    metaDescription:
      "Villas, penthouses, hotels and suites across Johannesburg, sourced around your dates, group and requirements.",
    photo: "stay",
    services: ["Villas", "Penthouses", "Hotels & Suites"],
    homeLine: "Villas, penthouses and suites — sourced for your group.",
    lead: "Tell us your dates, group size and requirements. We source the right stay.",
    intro:
      "We don't push a fixed list. Every request is sourced for the group in front of us: how many of you there are, what the weekend is for, and where in the city it needs to be.",
    statement: "The right house changes the whole weekend.",
    offer: [
      {
        name: "Villas",
        line: "Space for the whole group, a pool, a garden, room for a chef and a long table. The kind of place the weekend happens in, not just where you sleep.",
        photo: "stayVilla",
      },
      {
        name: "Penthouses",
        line: "Height, views and privacy close to Sandton and Rosebank. Easy for a smaller group, a birthday or a short stay in the city.",
        photo: "stayPenthouse",
      },
      {
        name: "Hotels & Suites",
        line: "When service matters more than space. Suites and rooms arranged and connected to your transport and your plans.",
        photo: "stayHotel",
      },
    ],
    cta: { label: "Explore stays", plan: "stay" },
    pairsWith: ["move", "dine"],
  },
  {
    slug: "move",
    title: "MOVE",
    index: "02",
    metaTitle: "Move — Chauffeurs, V-Class & Luxury Car Rental in Johannesburg",
    metaDescription:
      "Private chauffeurs, V-Class group transport, airport transfers and luxury car rental, arranged around your plans in Johannesburg.",
    photo: "move",
    services: ["Luxury Car Rental", "Private Chauffeur", "V-Class", "Airport Transfers"],
    homeLine: "Chauffeurs, V-Class, cars and airport runs.",
    lead: "From the arrivals hall to the last stop of the night, the movement is already handled.",
    intro:
      "Transport is the thing that quietly makes or breaks a weekend. We plan it around the bookings, not the other way round, so nobody waits outside and nobody drives home.",
    statement: "Someone is always already outside.",
    offer: [
      {
        name: "Private Chauffeur",
        line: "A driver for the day, the night or the whole weekend, working to your schedule.",
        photo: "move",
      },
      {
        name: "V-Class",
        line: "The group moves together. Seven seats, room for luggage, and one arrival instead of four.",
        photo: "moveVClass",
      },
      {
        name: "Luxury Car Rental",
        line: "Porsche, Mercedes, Lamborghini and similar, depending on what's available for your dates. You drive; we arrange the handover.",
        photo: "moveCar",
      },
      {
        name: "Airport Transfers",
        line: "Collected at O.R. Tambo or Lanseria, flight tracked, bags handled, straight to where you're staying.",
        photo: "moveAirport",
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
    metaDescription:
      "Private chefs, private dining, group restaurant bookings, curated menus and celebration dinners in Johannesburg.",
    photo: "dine",
    services: ["Private Dining", "Private Chef", "Group Dining", "Curated Menus", "Celebration Dining"],
    homeLine: "Private chefs. Private tables.",
    lead: "Private dining arranged around your group — at the house or at the right table in the city.",
    intro:
      "Food is usually where group plans fall apart: the booking for twelve, the dietary requirements, the birthday cake that nobody organised. This is the part we like handling.",
    statement: "You arrive. Everything is already prepared.",
    offer: [
      {
        name: "Private Dining",
        short: "Arranged around your group.",
        line: "Private dining experiences arranged around your group, in a setting that suits the occasion.",
      },
      {
        name: "Private Chef",
        short: "A chef at the villa — breakfast, lunch, dinner, braai, late-night.",
        line: "A chef comes to the villa, residence or private setting and runs the whole thing, from shopping to the last plate.",
        details: ["Breakfast", "Lunch", "Dinner", "Braai", "Late-night meals"],
        photo: "dineChef",
      },
      {
        name: "Group Dining",
        short: "Seating, timing, menu and dietaries settled beforehand.",
        line: "Restaurant arrangements for larger groups, with everything settled before anyone sits down.",
        details: ["Seating", "Timing", "Menu", "Budget", "Dietary requirements", "Group planning"],
      },
      {
        name: "Curated Menus",
        short: "Designed around the occasion, group and budget.",
        line: "Menus designed around the occasion, the group and the budget.",
      },
      {
        name: "Celebration Dining",
        short: "Décor, cake, flowers, bottles, the table set.",
        line: "Birthdays, anniversaries and private occasions, with the table set before you arrive.",
        details: ["Décor", "Cakes", "Flowers", "Bottles", "Menus", "Table setup"],
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
    metaDescription:
      "VIP club tables, nightlife reservations, events, private access and night transport in Johannesburg.",
    photo: "night",
    services: ["VIP Club Tables", "Nightlife Reservations", "Events", "Private Access", "Night Transport"],
    homeLine: "Tables, events and a driver waiting outside.",
    lead: "Your night can be arranged as part of the full experience.",
    intro:
      "Dinner runs into the table, the table runs into the ride home. We plan the night as one line, so there's no standing at the door and no one negotiating a lift at 3am.",
    statement: "Table ready. Ride waiting. Nothing to sort out on the night.",
    offer: [
      { name: "VIP Club Tables", line: "Tables booked in advance, with the bottle order and the arrival time already set." },
      { name: "Nightlife Reservations", line: "The right venue for the group and the mood, booked before the weekend starts." },
      { name: "Events", line: "Shows, parties and events in the city, with access and timing arranged." },
      { name: "Private Access", line: "Private rooms and sections where the venue allows it." },
      {
        name: "Night Transport",
        line: "A driver who stays with you through the night and gets everyone home.",
        photo: "moveVClass",
      },
    ],
    cta: { label: "Plan the night", plan: "nightlife" },
    pairsWith: ["dine", "move"],
  },
];

export const getPillar = (slug: Pillar["slug"]) => pillars.find((p) => p.slug === slug)!;
