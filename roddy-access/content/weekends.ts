// The two weekend products and the celebration formats.

export const accessWeekend = {
  title: "THE ACCESS WEEKEND",
  lead: "We plan your whole Johannesburg weekend, from start to finish.",
  tellUs: ["Dates", "Group size", "Occasion", "Budget"],
  inclusions: ["Where you stay", "Airport pickup", "Drivers", "Dinners", "Club tables", "Sunday lunch"],
  line: "You choose the weekend. We handle the movement.",
  cta: "Build my weekend",
  // The homepage tells the weekend in pictures, with a caption each.
  strip: [
    { when: "Fri 14:10", what: "Collected at arrivals", photo: "moveVClass" },
    { when: "Fri 15:30", what: "The house is ready", photo: "stay" },
    { when: "Sat 13:00", what: "Chef at the villa", photo: "dineChef" },
    { when: "Sat 23:30", what: "Table waiting", photo: "night" },
    { when: "Sun 12:00", what: "Long lunch, then home", photo: "dine" },
  ] as const,
  // An illustration of how a weekend can run — not a fixed package.
  example: [
    { when: "Friday, 14:10", what: "Collected at arrivals. Bags in the V-Class." },
    { when: "Friday, 15:30", what: "Check-in. The fridge is already stocked." },
    { when: "Friday, 20:00", what: "Dinner for eight, table set, menu agreed." },
    { when: "Saturday, 13:00", what: "Chef at the house. Long lunch by the pool." },
    { when: "Saturday, 23:30", what: "Table at the club. Driver outside." },
    { when: "Sunday, 12:00", what: "Recovery lunch, then the airport run." },
  ],
};

export const privateSection = {
  title: "THE PRIVATE SECTION",
  lead: "Not just somewhere to stay. An entire environment built around your group.",
  sequence: [
    "The villa is arranged.",
    "The drinks are arranged.",
    "The food is arranged.",
    "The setup is done.",
    "The transport is ready.",
    "The night is planned.",
  ],
  arrive: "The group simply arrives.",
  core: "The same feeling as arriving at your section and finding everything ready — only now, the entire weekend is your section.",
  close: "You arrive. We’ve already set the tone.",
  cta: "Create my private section",
  inclusions: [
    { group: "The house", items: ["Private villa", "Host", "Security"] },
    { group: "The bar", items: ["Drinks", "Ice and mixers"] },
    { group: "The food", items: ["Private chef", "Braai", "Breakfast", "Late-night food"] },
    { group: "The setup", items: ["Décor", "Music or DJ"] },
    { group: "Transport", items: ["Chauffeur", "V-Class", "Luxury car"] },
    { group: "The night", items: ["Dinner booking", "Club table", "Sunday recovery"] },
  ],
};

export const celebrations = [
  {
    name: "Birthday Weekends",
    items: ["Stay", "Décor", "Dining", "Drinks", "Transport", "Nightlife", "Next-day plans"],
    plan: "birthday",
  },
  {
    name: "Private Group Weekends",
    items: ["Friends", "Celebrations", "Reunions", "Private getaways"],
    plan: "weekend-away",
  },
  {
    name: "Bachelor / Bachelorette",
    items: ["Accommodation", "Private experiences", "Dining", "Transport", "Nightlife"],
    plan: "celebration",
  },
  {
    name: "VIP / Artist Movement",
    items: ["Accommodation", "Airport transfer", "Secure transport", "Dining", "Nightlife", "Logistics"],
    plan: "business",
  },
];
