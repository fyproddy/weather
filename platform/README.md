# LeadPath Growth — Google growth platform

Internal agency tool for managing the Google growth of multiple client businesses:
Google Ads, organic search, Maps / Business Profile, SEO, reviews, leads and reporting.

**Status: Phase 4** — login, agency & team, client management (details,
services, target locations, competitors, verified facts), the agency dashboard,
Google Ads reporting from CSV exports, and Google Ads analysis with
recommendations you approve. Sections not built yet show what's
planned and honest "not connected" states; no metric is ever estimated or invented.

## Google Ads CSV import

Until the Google Ads API is approved, campaign data comes from reports exported
in the Google Ads UI (Campaigns → Segment → Time → Day → Download → .csv).

- Comma or tab separated, UTF-8 or UTF-16 ("Excel CSV"); title/date-range lines
  and Total rows are handled.
- Only numbers in the file are stored; CTR, CPC, conversion rate and cost per
  conversion are recalculated from the sums.
- Re-importing the same dates **replaces** earlier data. Imports that would mix
  daily and period totals over the same dates are refused, so nothing is
  counted twice. Coverage is tracked per day, and comparisons with the previous
  period are only shown when both periods are fully covered.

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL · Drizzle ORM · Tailwind CSS 4 · Zod · Vitest · Playwright

## Run locally

```bash
cp .env.example .env            # set DATABASE_URL
npm install
npm run db:migrate
npm run dev                     # http://localhost:3000 → first visit opens /setup
```

## Deploying (Railway)

The `production` branch is what the live site runs. Railway settings:

- **Root directory:** `platform`
- **Database:** add a PostgreSQL service; set `DATABASE_URL` to `${{Postgres.DATABASE_URL}}`
- **SETUP_CODE:** any secret phrase — required once, to create the first admin.
  Without it, setup stays locked so nobody else can claim the agency.

`railway.json` sets the build and start commands; migrations run on every start
(`npm run start:prod`) and the health check is `/api/health`.

## Checks

```bash
npm run typecheck && npm run lint
npm test                        # data-layer tests (needs a growth_test database)
npm run build && npm run test:e2e   # browser tests (needs a growth_e2e database)
```

Test database names must end in `_test` / `_e2e`; the e2e run empties that database first.

## How data is kept separate

Every client-owned table belongs to an agency. All reads and writes go through
`src/server/*` functions that take the signed-in user's context and filter by
its agency, and child records are only reachable through a client already
checked against that agency. `tests/unit/clients.test.ts` covers this.

## Google Ads analysis

`src/lib/ads-analysis.ts` turns imported Campaigns, Keywords and Search terms
reports into winners, problems and opportunities. Each finding carries its
reason with the real figures and a suggested action (budget, pause, negative
keyword, new keyword, new ad, landing page, tracking). Rules have minimum-data
thresholds (`THRESHOLDS`) so small samples aren't judged. Findings are
recomputed from data on every view; only decisions (approved / dismissed /
done) are stored. Nothing is ever changed in Google Ads automatically.

## Leads

Per-client log of enquiries (call, WhatsApp, form, email, walk-in) with where
the person found the business, the service, status (new → contacted → quoted →
won/lost) and job value when won. Leads are personal information: agency staff
only, scoped like all client data, and audit-logged without copying personal
details. Google Ads cost per lead = imported spend ÷ leads marked "Google Ads",
shown only when the Ads data covers the whole range.

## AI ad writer

Generates Google Ads headlines, descriptions and callouts with Claude
(`claude-opus-5-5`, structured output, server-side refusal fallback) from the
client's services, areas and **verified facts only**. Every line is then checked
by `src/lib/ad-copy.ts` — character limits, numbers, claim words (guarantee,
warranty, certified, best, free, 24/7, years…) and place names — and a flagged
line can't be approved until edited or the fact is verified. Lines are re-checked
against the current facts whenever a draft is opened. Nothing is published to
Google Ads. Requires `ANTHROPIC_API_KEY`; e2e tests use a stand-in API
(`tests/e2e/mock-anthropic.mjs`) via `ANTHROPIC_BASE_URL`.

## Roles

- **Admin** — everything, including team, agency settings and permanent delete
- **Manager** — add, edit and archive clients
- **Viewer** — read only

## AI safety rule

AI assistants (from Phase 5) only ever receive a client's facts marked
**verified**. New facts start unverified.

## Phases

1. Foundation ✅ · 2. Agency dashboard + Google Ads CSV import ✅ · 3. Google OAuth + Google Ads (read-only) ·
4. Ads analysis & recommendations ✅ · 5. Ads creative assistant ✅ · 6. Search Console + GA4 ·
7. Business Profile + reviews · 8. SEO, keywords, competitors · 9. Leads ✅, tasks, content ·
10. Reports & client portal
