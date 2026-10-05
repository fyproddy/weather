/**
 * Google Ads copy: limits and the "verified facts only" checker.
 *
 * The AI is instructed to use only verified facts, but its output is never
 * trusted on that alone: every line is checked here, and a line with an
 * unsupported claim can't be approved until it's edited or the fact is
 * verified on the client's profile.
 */

export type AdItemKind = "headline" | "description" | "callout";

export const LIMITS: Record<AdItemKind, number> = { headline: 30, description: 90, callout: 25 };
export const TARGET_COUNTS: Record<AdItemKind, number> = { headline: 15, description: 4, callout: 6 };

/** Everything a line is allowed to rely on. */
export type AllowedSources = {
  clientName: string;
  industry: string | null;
  services: string[];
  locations: string[];
  verifiedFacts: string[];
};

/** Words that make a claim and therefore need a verified fact behind them. */
const CLAIM_WORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bguarantee[ds]?\b/i, label: "guarantee" },
  { pattern: /\bwarrant(y|ies|ied)\b/i, label: "warranty" },
  { pattern: /\b(certified|certification|accredited|accreditation)\b/i, label: "certification" },
  { pattern: /\b(licen[cs]ed|registered|approved)\b/i, label: "licence / registration" },
  { pattern: /\binsured\b|\binsurance\b/i, label: "insurance" },
  { pattern: /\baward(s|-winning)?\b/i, label: "award" },
  { pattern: /\b(best|#\s?1|number one|no\.?\s?1|leading|top[- ]rated)\b/i, label: "superlative" },
  { pattern: /\b(cheapest|lowest|affordable|cheap|discount|sale|special)\b/i, label: "price claim" },
  { pattern: /\bfree\b/i, label: "free offer" },
  { pattern: /\b24\s?\/\s?7\b|\b24 hours?\b|\bsame[- ]day\b|\bemergency\b|\bfast\b|\bquick\b|\binstant\b/i, label: "speed / availability" },
  { pattern: /\b(years?|decades?)\b/i, label: "experience" },
  { pattern: /\b(trusted|reviews?|rated|stars?)\b/i, label: "reputation" },
  { pattern: /\b(sabs|iso|nhbrc|master builders)\b/i, label: "accreditation body" },
];

/** South African places a line might mention; any not in the client's areas is flagged. */
const SA_PLACES = [
  "Johannesburg", "Joburg", "Jozi", "Sandton", "Randburg", "Roodepoort", "Soweto", "Midrand", "Fourways", "Rosebank",
  "Pretoria", "Tshwane", "Centurion", "Benoni", "Boksburg", "Germiston", "Kempton Park", "Alberton", "Edenvale",
  "Krugersdorp", "Vereeniging", "Vanderbijlpark", "Springs", "Brakpan", "Bryanston", "Northcliff", "Melville",
  "Cape Town", "Stellenbosch", "Paarl", "Bellville", "Durbanville", "Somerset West", "Durban", "Umhlanga",
  "Pietermaritzburg", "Ballito", "Gqeberha", "Port Elizabeth", "East London", "Bloemfontein", "Polokwane",
  "Mbombela", "Nelspruit", "Rustenburg", "Kimberley", "George", "Gauteng", "Western Cape", "KwaZulu-Natal", "KZN",
  "Eastern Cape", "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape",
];

export type CheckResult = { flags: string[]; overLimit: boolean };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

export function checkAdLine(kind: AdItemKind, text: string, allowed: AllowedSources): CheckResult {
  const flags: string[] = [];
  const t = text.trim();
  const overLimit = t.length > LIMITS[kind];
  if (overLimit) flags.push(`Too long: ${t.length}/${LIMITS[kind]} characters`);
  if (t.length === 0) flags.push("Empty");

  const factsText = norm(allowed.verifiedFacts.join(" "));
  const everything = norm([allowed.clientName, allowed.industry ?? "", ...allowed.services, ...allowed.locations, ...allowed.verifiedFacts].join(" "));

  // Numbers (prices, percentages, years, phone-like) must appear in a verified fact.
  for (const n of t.match(/\d[\d,.\s]*\d|\d/g) ?? []) {
    const digits = n.replace(/[^\d]/g, "");
    if (digits && !factsText.replace(/[^\d ]/g, " ").split(/\s+/).some((f) => f === digits || f.includes(digits))) {
      flags.push(`Number "${n.trim()}" isn't in the verified facts`);
    }
  }

  for (const { pattern, label } of CLAIM_WORDS) {
    const m = t.match(pattern);
    if (m && !pattern.test(factsText) && !new RegExp(`\\b${escape(m[0].toLowerCase())}\\b`).test(factsText)) {
      flags.push(`"${m[0]}" makes a ${label} claim that isn't in the verified facts`);
    }
  }

  for (const place of SA_PLACES) {
    if (new RegExp(`\\b${escape(place)}\\b`, "i").test(t) && !new RegExp(`\\b${escape(place)}\\b`, "i").test(everything)) {
      flags.push(`"${place}" isn't one of the client's areas`);
    }
  }

  return { flags: [...new Set(flags)], overLimit };
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
