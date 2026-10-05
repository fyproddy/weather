/**
 * Google Ads analysis: turns imported figures into winners, problems and
 * opportunities, each with a recommended action and the numbers behind it.
 *
 * Every rule is deterministic and needs a minimum amount of data before it
 * fires, so a recommendation can always be traced back to real figures.
 * Nothing here changes a live account — it only suggests.
 */
import { money, pct, count } from "./format";

export type FindingKind = "winner" | "problem" | "opportunity";
export type ActionType =
  | "increase_budget"
  | "decrease_budget"
  | "reallocate_budget"
  | "pause_campaign"
  | "pause_keyword"
  | "add_keyword"
  | "add_negative_keyword"
  | "test_new_ad"
  | "improve_landing_page"
  | "review_keywords"
  | "check_conversion_tracking";

export const ACTION_LABELS: Record<ActionType, string> = {
  increase_budget: "Increase budget",
  decrease_budget: "Decrease budget",
  reallocate_budget: "Reallocate budget",
  pause_campaign: "Pause campaign",
  pause_keyword: "Pause keyword",
  add_keyword: "Add keyword",
  add_negative_keyword: "Add negative keyword",
  test_new_ad: "Test new ad",
  improve_landing_page: "Improve landing page",
  review_keywords: "Review keywords & bids",
  check_conversion_tracking: "Check conversion tracking",
};

export type Finding = {
  /** Stable id (rule + target) used to remember decisions. */
  id: string;
  kind: FindingKind;
  severity: "high" | "medium" | "low";
  level: "account" | "campaign" | "keyword" | "search_term";
  target: string;
  title: string;
  why: string;
  action?: { type: ActionType; detail: string; text?: string; matchType?: "exact" | "phrase" | "broad" };
  /** Money at stake, for ordering. */
  impact: number;
};

type Stat = { cost: number; impressions: number; clicks: number; conversions: number | null };
export type CampaignStat = Stat & { campaignName: string; status: string | null; budget: number | null; searchImpressionShare: number | null };
export type KeywordStat = Stat & {
  keyword: string;
  matchType: string;
  campaignName: string;
  adGroupName: string;
  status: string | null;
  qualityScore: number | null;
};
export type SearchTermStat = Stat & { searchTerm: string; campaignName: string; adGroupName: string; addedExcluded: string | null };

export type AnalysisInput = {
  currency: string;
  days: number;
  campaigns: CampaignStat[];
  /** Previous equal period — pass only when it's fully covered, so comparisons are fair. */
  previousCampaigns: CampaignStat[] | null;
  keywords: KeywordStat[];
  searchTerms: SearchTermStat[];
  client: { name: string; industry: string | null; services: string[]; locations: string[]; verifiedFacts: string[] };
};

/** Minimum data before a rule is allowed to judge something. */
export const THRESHOLDS = {
  winnerMinConversions: 3,
  keywordWinnerMinConversions: 2,
  betterThanAverage: 0.8, // CPA at most 80% of account average
  worseThanAverage: 1.5, // CPA / CPC at least 150% of average
  minWastedSpend: 500,
  minKeywordWastedSpend: 300,
  minSearchTermSpend: 200,
  lowCtrMinImpressions: 1000,
  lowCtrRatio: 0.6,
  highCpcMinClicks: 30,
  lowConvRateMinClicks: 100,
  lowConvRateRatio: 0.5,
  lowImpressionShare: 0.6,
  budgetUsedRatio: 0.9,
  reallocateRatio: 2,
  cpaWorsened: 0.3,
  lowQualityScore: 4,
  noTrackingMinSpend: 1000,
};

const T = THRESHOLDS;

export function analyse(input: AnalysisInput): Finding[] {
  const m = (n: number | null | undefined) => money(n, input.currency);
  const findings: Finding[] = [];
  const add = (rule: string, f: Omit<Finding, "id">) => findings.push({ ...f, id: `${rule}:${f.level}:${f.target.toLowerCase()}` });

  const camps = input.campaigns.filter((c) => c.cost > 0 || c.impressions > 0);
  const acct = totals(camps);
  if (camps.length === 0) return [];

  const tracked = acct.conversions !== null && acct.conversions > 0;
  const acctCpa = tracked ? acct.cost / acct.conversions! : null;
  const acctCtr = acct.impressions ? acct.clicks / acct.impressions : null;
  const acctCpc = acct.clicks ? acct.cost / acct.clicks : null;
  const acctConvRate = tracked && acct.clicks ? acct.conversions! / acct.clicks : null;

  // ---- Account -----------------------------------------------------------
  if (!tracked && acct.cost >= T.noTrackingMinSpend) {
    add("no_tracking", {
      kind: "problem",
      severity: "high",
      level: "account",
      target: "account",
      title: "No conversions recorded",
      why: `${m(acct.cost)} was spent over ${input.days} days with ${acct.conversions === null ? "no conversion data in the report" : "zero conversions recorded"}. Either conversion tracking isn't set up, or the ads aren't producing enquiries. Fix tracking first — without it, no budget decision can be judged.`,
      action: { type: "check_conversion_tracking", detail: "Confirm calls, forms and WhatsApp clicks are tracked as conversions in Google Ads." },
      impact: acct.cost,
    });
  }

  // ---- Campaigns ---------------------------------------------------------
  const cpa = (s: Stat) => (s.conversions ? s.cost / s.conversions : null);
  const winners: CampaignStat[] = [];

  for (const c of camps) {
    const name = c.campaignName;
    const conv = c.conversions ?? 0;
    const cCpa = cpa(c);
    const ctr = c.impressions ? c.clicks / c.impressions : null;
    const cpc = c.clicks ? c.cost / c.clicks : null;

    if (tracked && conv >= T.winnerMinConversions && cCpa !== null && cCpa <= acctCpa! * T.betterThanAverage) {
      winners.push(c);
      add("campaign_winner", {
        kind: "winner",
        severity: "low",
        level: "campaign",
        target: name,
        title: `Strong campaign: ${name}`,
        why: `${count(conv)} conversions at ${m(cCpa)} each — ${pct(1 - cCpa / acctCpa!, 0)} below the account average of ${m(acctCpa)}.`,
        impact: c.cost,
      });
      const limitedByRank = c.searchImpressionShare !== null && c.searchImpressionShare < T.lowImpressionShare;
      const limitedByBudget = c.budget !== null && c.budget > 0 && c.cost >= c.budget * input.days * T.budgetUsedRatio;
      if (limitedByRank || limitedByBudget) {
        add("campaign_room_to_grow", {
          kind: "opportunity",
          severity: "medium",
          level: "campaign",
          target: name,
          title: `Room to grow: ${name}`,
          why:
            `Converts at ${m(cCpa)}, better than the account average of ${m(acctCpa)}, ` +
            (limitedByBudget
              ? `and spent ${m(c.cost)} of a possible ${m(c.budget! * input.days)} (${m(c.budget)}/day) — it's running out of budget.`
              : `but appeared for only ${pct(c.searchImpressionShare, 0)} of the searches it was eligible for.`),
          action: { type: "increase_budget", detail: "Raise the daily budget in steps of 10–20% and re-check cost per conversion after a week." },
          impact: c.cost,
        });
      }
    }

    const wasteFloor = Math.max(T.minWastedSpend, tracked ? acctCpa! * T.worseThanAverage : 0);
    if (tracked && conv === 0 && c.cost >= wasteFloor) {
      add("campaign_wasted_spend", {
        kind: "problem",
        severity: "high",
        level: "campaign",
        target: name,
        title: `Spend with no conversions: ${name}`,
        why: `Spent ${m(c.cost)} on ${count(c.clicks)} clicks with no conversions. Across the account, a conversion costs ${m(acctCpa)} on average.`,
        action: {
          type: c.cost >= acctCpa! * 3 ? "pause_campaign" : "review_keywords",
          detail: "Check its search terms for irrelevant traffic first; pause it if the traffic is right but still doesn't convert.",
        },
        impact: c.cost,
      });
    } else if (tracked && conv >= 1 && cCpa !== null && cCpa >= acctCpa! * T.worseThanAverage && c.cost >= acct.cost * 0.1) {
      add("campaign_high_cpa", {
        kind: "problem",
        severity: "medium",
        level: "campaign",
        target: name,
        title: `Expensive conversions: ${name}`,
        why: `${count(conv)} conversion${conv === 1 ? "" : "s"} at ${m(cCpa)} each — ${pct(cCpa / acctCpa! - 1, 0)} above the account average of ${m(acctCpa)}.`,
        action: { type: "decrease_budget", detail: "Lower its budget or tighten its keywords until cost per conversion is closer to average." },
        impact: c.cost,
      });
    }

    if (ctr !== null && acctCtr && c.impressions >= T.lowCtrMinImpressions && ctr < acctCtr * T.lowCtrRatio) {
      add("campaign_low_ctr", {
        kind: "problem",
        severity: "medium",
        level: "campaign",
        target: name,
        title: `Low click-through rate: ${name}`,
        why: `CTR of ${pct(ctr)} from ${count(c.impressions)} impressions, against ${pct(acctCtr)} across the account. The ads aren't persuading searchers to click.`,
        action: { type: "test_new_ad", detail: "Write a new ad variation using the client's verified services and offers, and run it alongside the current one." },
        impact: c.cost,
      });
    }

    if (cpc !== null && acctCpc && c.clicks >= T.highCpcMinClicks && cpc >= acctCpc * T.worseThanAverage) {
      add("campaign_high_cpc", {
        kind: "problem",
        severity: "low",
        level: "campaign",
        target: name,
        title: `High cost per click: ${name}`,
        why: `Average CPC of ${m(cpc)} over ${count(c.clicks)} clicks, against ${m(acctCpc)} across the account.`,
        action: { type: "review_keywords", detail: "Look for broad keywords or bids driving up costs; check Quality Scores." },
        impact: c.cost,
      });
    }

    const convRate = c.clicks ? conv / c.clicks : null;
    if (tracked && acctConvRate && convRate !== null && conv > 0 && c.clicks >= T.lowConvRateMinClicks && convRate < acctConvRate * T.lowConvRateRatio) {
      add("campaign_low_conv_rate", {
        kind: "problem",
        severity: "medium",
        level: "campaign",
        target: name,
        title: `Clicks aren't converting: ${name}`,
        why: `${pct(convRate)} of ${count(c.clicks)} clicks converted, against ${pct(acctConvRate)} across the account. People click but don't enquire.`,
        action: { type: "improve_landing_page", detail: "Check the landing page matches the ad, loads fast on mobile, and has a clear call / WhatsApp button." },
        impact: c.cost,
      });
    }
  }

  // Budget reallocation: best converter vs the most expensive one.
  if (tracked) {
    const converting = camps.filter((c) => (c.conversions ?? 0) >= 1).map((c) => ({ c, cpa: cpa(c)! }));
    const best = converting.filter((x) => (x.c.conversions ?? 0) >= T.winnerMinConversions).sort((a, b) => a.cpa - b.cpa)[0];
    const worst = converting.filter((x) => x !== best).sort((a, b) => b.cpa - a.cpa)[0];
    if (best && worst && worst.cpa >= best.cpa * T.reallocateRatio) {
      const b = best.c;
      const w = worst.c;
      add("reallocate_budget", {
        kind: "opportunity",
        severity: "high",
        level: "account",
        target: `${w.campaignName}→${b.campaignName}`,
        title: `Move budget: ${w.campaignName} → ${b.campaignName}`,
        why: `${b.campaignName} generated ${count(b.conversions)} conversions at ${m(best.cpa)} each while ${w.campaignName} generated ${count(w.conversions)} at ${m(worst.cpa)} each. Consider reallocating budget from ${w.campaignName} to ${b.campaignName}.`,
        action: { type: "reallocate_budget", detail: `Shift part of ${w.campaignName}'s daily budget to ${b.campaignName}, then compare cost per conversion after a week.` },
        impact: w.cost,
      });
    }
  }

  // Getting worse vs the previous period (only when that period is fully covered).
  if (tracked && input.previousCampaigns) {
    for (const c of camps) {
      const p = input.previousCampaigns.find((x) => x.campaignName === c.campaignName);
      const now = cpa(c);
      const before = p ? cpa(p) : null;
      if (p && now !== null && before !== null && (p.conversions ?? 0) >= T.winnerMinConversions && (c.conversions ?? 0) >= 1 && now >= before * (1 + T.cpaWorsened)) {
        add("campaign_cpa_worsened", {
          kind: "problem",
          severity: "medium",
          level: "campaign",
          target: c.campaignName,
          title: `Getting more expensive: ${c.campaignName}`,
          why: `Cost per conversion rose from ${m(before)} to ${m(now)} (${pct(now / before - 1, 0)} higher) compared with the previous ${input.days} days.`,
          action: { type: "review_keywords", detail: "Check for new search terms, competitor activity, or changes to bids or ads." },
          impact: c.cost,
        });
      }
    }
  }

  // ---- Keywords ----------------------------------------------------------
  for (const k of input.keywords) {
    const target = `${k.keyword} [${k.matchType}] · ${k.adGroupName || k.campaignName}`;
    const conv = k.conversions ?? 0;
    const kCpa = cpa(k);
    if (tracked && conv >= T.keywordWinnerMinConversions && kCpa !== null && kCpa <= acctCpa! * T.betterThanAverage) {
      add("keyword_winner", {
        kind: "winner",
        severity: "low",
        level: "keyword",
        target,
        title: `Strong keyword: ${k.keyword}`,
        why: `${count(conv)} conversions at ${m(kCpa)} each (${k.matchType} match), against an account average of ${m(acctCpa)}.`,
        impact: k.cost,
      });
    }
    const paused = /paused|removed/i.test(k.status ?? "");
    if (tracked && !paused && conv === 0 && k.cost >= Math.max(T.minKeywordWastedSpend, acctCpa! * T.worseThanAverage)) {
      add("keyword_wasted_spend", {
        kind: "problem",
        severity: "high",
        level: "keyword",
        target,
        title: `Keyword spending with no conversions: ${k.keyword}`,
        why: `"${k.keyword}" (${k.matchType} match, ${k.campaignName}) spent ${m(k.cost)} on ${count(k.clicks)} clicks with no conversions. A conversion costs ${m(acctCpa)} on average.`,
        action: { type: "pause_keyword", detail: "Pause it, or switch to a tighter match type if the search terms it triggers look relevant.", text: k.keyword },
        impact: k.cost,
      });
    }
    if (k.qualityScore !== null && k.qualityScore <= T.lowQualityScore && k.impressions >= 100 && !paused) {
      add("keyword_low_quality_score", {
        kind: "problem",
        severity: "low",
        level: "keyword",
        target,
        title: `Low Quality Score: ${k.keyword}`,
        why: `Quality Score ${k.qualityScore}/10. Google judges the ad or landing page as a weak match for "${k.keyword}", which raises the price of each click.`,
        action: { type: "improve_landing_page", detail: "Make sure the ad and landing page talk about this exact service." },
        impact: k.cost,
      });
    }
  }

  // ---- Search terms ------------------------------------------------------
  const vocab = clientVocabulary(input.client);
  const keywordTexts = new Set(input.keywords.map((k) => k.keyword.toLowerCase()));
  const terms = aggregateTerms(input.searchTerms);
  const negatives = new Map<string, { terms: TermAgg[]; reason: string; matchType: "phrase" | "exact" }>();

  for (const t of terms) {
    if (/excluded/i.test(t.addedExcluded ?? "")) continue;
    const conv = t.conversions ?? 0;
    if (conv > 0 || t.cost <= 0) {
      if (tracked && conv >= 2 && !keywordTexts.has(t.searchTerm.toLowerCase()) && !/added/i.test(t.addedExcluded ?? "")) {
        const tCpa = cpa(t)!;
        add("search_term_add_keyword", {
          kind: "opportunity",
          severity: "medium",
          level: "search_term",
          target: t.searchTerm,
          title: `Add as keyword: ${t.searchTerm}`,
          why: `People searching "${t.searchTerm}" converted ${count(conv)} times at ${m(tCpa)} each, but it isn't a keyword yet — it's only matching through other keywords.`,
          action: { type: "add_keyword", detail: "Add it as an exact-match keyword so you control its bid and ad.", text: t.searchTerm, matchType: "exact" },
          impact: t.cost,
        });
      }
      continue;
    }
    // Spent money, no conversions.
    const marker = irrelevantMarker(t.searchTerm, vocab);
    if (marker) {
      const key = marker.word;
      const entry = negatives.get(key) ?? { terms: [], reason: marker.reason, matchType: "phrase" as const };
      entry.terms.push(t);
      negatives.set(key, entry);
    } else if (t.cost >= Math.max(T.minSearchTermSpend, acctCpa ?? 0) && !isRelevant(t.searchTerm, vocab)) {
      negatives.set(t.searchTerm.toLowerCase(), {
        terms: [t],
        reason: `none of its words match ${input.client.name}'s services or areas`,
        matchType: "exact",
      });
    }
  }

  for (const [text, n] of negatives) {
    const cost = n.terms.reduce((s, t) => s + t.cost, 0);
    const clicks = n.terms.reduce((s, t) => s + t.clicks, 0);
    const examples = n.terms.slice(0, 3).map((t) => `"${t.searchTerm}"`).join(", ");
    add("search_term_negative", {
      kind: "opportunity",
      severity: cost >= T.minSearchTermSpend ? "medium" : "low",
      level: "search_term",
      target: text,
      title: `Negative keyword: ${n.matchType === "exact" ? `[${text}]` : `"${text}"`}`,
      why: `${n.terms.length === 1 ? examples : `${n.terms.length} searches such as ${examples}`} cost ${m(cost)} for ${count(clicks)} clicks and no conversions — ${n.reason}.`,
      action: {
        type: "add_negative_keyword",
        detail: n.matchType === "phrase" ? `Blocks every search containing "${text}".` : "Blocks this exact search only.",
        text,
        matchType: n.matchType,
      },
      impact: cost,
    });
  }

  const kindOrder: Record<FindingKind, number> = { problem: 0, opportunity: 1, winner: 2 };
  const sevOrder = { high: 0, medium: 1, low: 2 };
  return findings.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || sevOrder[a.severity] - sevOrder[b.severity] || b.impact - a.impact);
}

function totals(rows: Stat[]): Stat {
  const anyConv = rows.some((r) => r.conversions !== null);
  return rows.reduce<Stat>(
    (t, r) => ({
      cost: t.cost + r.cost,
      impressions: t.impressions + r.impressions,
      clicks: t.clicks + r.clicks,
      conversions: anyConv ? (t.conversions ?? 0) + (r.conversions ?? 0) : null,
    }),
    { cost: 0, impressions: 0, clicks: 0, conversions: anyConv ? 0 : null },
  );
}

type TermAgg = SearchTermStat;
/** One row per search term across ad groups. */
function aggregateTerms(rows: SearchTermStat[]): TermAgg[] {
  const map = new Map<string, TermAgg>();
  for (const r of rows) {
    const k = r.searchTerm.toLowerCase();
    const e = map.get(k);
    if (!e) map.set(k, { ...r });
    else {
      e.cost += r.cost;
      e.impressions += r.impressions;
      e.clicks += r.clicks;
      e.conversions = e.conversions === null && r.conversions === null ? null : (e.conversions ?? 0) + (r.conversions ?? 0);
      if (/excluded/i.test(r.addedExcluded ?? "")) e.addedExcluded = r.addedExcluded;
    }
  }
  return [...map.values()];
}

// ---- Relevance ------------------------------------------------------------

const STOP = new Set(["a", "an", "the", "and", "or", "for", "in", "near", "me", "my", "to", "of", "on", "at", "with", "best", "top", "services", "service", "company", "companies", "sa", "south", "africa"]);

/** Lowercase word stems: "Repairs" → "repair", "proofing" → "proof". */
export function stems(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => w.replace(/(ing|ers|er|es|s)$/, "") || w);
}

type Vocab = { stems: Set<string>; text: string };
function clientVocabulary(c: AnalysisInput["client"]): Vocab {
  const text = [c.name, c.industry ?? "", ...c.services, ...c.locations, ...c.verifiedFacts].join(" ").toLowerCase();
  return { stems: new Set(stems(text)), text };
}

function isRelevant(term: string, vocab: Vocab) {
  return stems(term).some((s) => vocab.stems.has(s));
}

const MARKERS: { words: string[]; reason: string }[] = [
  { words: ["job", "jobs", "vacancy", "vacancies", "hiring", "career", "careers", "salary", "salaries", "internship", "learnership", "employment"], reason: "these are people looking for work, not customers" },
  { words: ["course", "courses", "training", "tutorial", "diy", "youtube", "video", "pdf", "learn"], reason: "these are people wanting to learn or do it themselves" },
  { words: ["free"], reason: "these are people looking for something free" },
  { words: ["meaning", "definition", "wikipedia"], reason: "these are research searches, not buyers" },
];

/** A word in the search term that signals the wrong audience — unless the client's own services/facts use it (e.g. "free quote"). */
function irrelevantMarker(term: string, vocab: Vocab): { word: string; reason: string } | null {
  const words = term.toLowerCase().split(/[^a-z0-9]+/);
  for (const m of MARKERS) {
    const hit = m.words.find((w) => words.includes(w));
    if (hit && !new RegExp(`\\b${hit}\\b`).test(vocab.text)) return { word: hit, reason: m.reason };
  }
  if (/\bhow to\b/.test(term.toLowerCase()) && !vocab.text.includes("how to")) {
    return { word: "how to", reason: "these are people wanting to learn or do it themselves" };
  }
  return null;
}
