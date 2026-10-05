import type { GoogleProvider } from "@/db/schema";

export type Section = {
  slug: string;
  label: string;
  summary: string;
  /** What the finished section will do — shown until the section is built. */
  plans: string[];
  phase: number;
  /** Data sources this section depends on. */
  sources: GoogleProvider[];
};

/** Sections that are per-client and not yet built (Phase 1 shows their plan + honest status). */
export const SECTIONS: Section[] = [
  {
    slug: "ads",
    label: "Google Ads",
    summary: "Accounts, campaigns, keywords, search terms and AI recommendations.",
    plans: [
      "Account details: name, customer ID, status, currency",
      "Campaigns with spend, clicks, CTR, CPC, conversions and cost per conversion",
      "Date ranges: today, yesterday, 7 / 30 / 90 days, custom",
      "Winners, problems and opportunities with the numbers behind each one",
      "Keywords, negative keywords and search-term suggestions",
      "Ad creative assistant: generate → review → edit → approve",
      "Budget recommendations that explain why — nothing changes without your approval",
    ],
    phase: 3,
    sources: ["google_ads"],
  },
  {
    slug: "organic",
    label: "Organic Search",
    summary: "Clicks, impressions and rankings from Google Search.",
    plans: [
      "Search Console clicks, impressions, CTR and average position",
      "Top queries and pages, with change over time",
      "Organic traffic and conversions from Google Analytics",
    ],
    phase: 6,
    sources: ["search_console", "analytics"],
  },
  {
    slug: "maps",
    label: "Maps & Business Profile",
    summary: "Google Business Profile performance and local visibility.",
    plans: [
      "Profile views, calls, direction requests and website clicks",
      "Local ranking for target keywords across target locations",
      "Profile completeness checklist",
    ],
    phase: 7,
    sources: ["business_profile"],
  },
  {
    slug: "seo",
    label: "SEO",
    summary: "Website SEO health and technical issues.",
    plans: [
      "Site audit: titles, descriptions, headings, broken links, speed",
      "PageSpeed / Core Web Vitals scores",
      "Prioritised fix list",
    ],
    phase: 8,
    sources: ["search_console"],
  },
  {
    slug: "keywords",
    label: "Keywords",
    summary: "Keyword research for each service and location.",
    plans: [
      "Keyword ideas from the client's verified services and target locations",
      "Search volume and competition from Google's Keyword Planner",
      "Track which keywords you rank for organically and in Ads",
    ],
    phase: 8,
    sources: ["google_ads", "search_console"],
  },
  {
    slug: "competitors",
    label: "Competitors",
    summary: "How the client compares to the competitors you track.",
    plans: [
      "Ratings, review counts and categories of tracked competitors",
      "Who appears for the client's main keywords",
      "Gaps and opportunities",
    ],
    phase: 8,
    sources: [],
  },
  {
    slug: "reviews",
    label: "Reviews",
    summary: "Google reviews, ratings and replies.",
    plans: ["All Google reviews in one place", "AI-drafted replies you approve before posting", "Rating trend over time"],
    phase: 7,
    sources: ["business_profile"],
  },
  {
    slug: "leads",
    label: "Leads",
    summary: "Calls, forms and WhatsApp enquiries, and where they came from.",
    plans: ["Log leads manually or from forms", "Source tracking: Ads, organic, Maps, direct", "Cost per lead per channel"],
    phase: 9,
    sources: [],
  },
  {
    slug: "content",
    label: "Content",
    summary: "Pages, posts and Business Profile updates.",
    plans: ["Content ideas from keyword gaps", "AI drafts using only verified facts", "Approval before anything is published"],
    phase: 9,
    sources: [],
  },
  {
    slug: "tasks",
    label: "Tasks",
    summary: "Work to do for each client.",
    plans: ["Tasks per client with owner and due date", "Turn any recommendation into a task"],
    phase: 9,
    sources: [],
  },
  {
    slug: "reports",
    label: "Reports",
    summary: "Monthly client reports.",
    plans: ["Monthly report: leads, spend, cost per lead, rankings, reviews", "PDF export and private share link"],
    phase: 10,
    sources: [],
  },
];

export const SECTION_SLUGS = new Set(SECTIONS.map((s) => s.slug));

export const PROVIDER_LABELS: Record<GoogleProvider, string> = {
  google_ads: "Google Ads",
  search_console: "Search Console",
  analytics: "Google Analytics",
  business_profile: "Business Profile",
};
