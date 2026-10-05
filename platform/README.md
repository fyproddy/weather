# LeadPath Growth — Google growth platform

Internal agency tool for managing the Google growth of multiple client businesses:
Google Ads, organic search, Maps / Business Profile, SEO, reviews, leads and reporting.

**Status: Phase 1 (foundation)** — login, agency & team, client management
(details, services, target locations, competitors, verified facts), and the full
app layout. Data sections show what's planned and honest "not connected" states;
no metric is ever estimated or invented.

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL · Drizzle ORM · Tailwind CSS 4 · Zod · Vitest · Playwright

## Run locally

```bash
cp .env.example .env            # set DATABASE_URL
npm install
npm run db:migrate
npm run dev                     # http://localhost:3000 → first visit opens /setup
```

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

## Roles

- **Admin** — everything, including team, agency settings and permanent delete
- **Manager** — add, edit and archive clients
- **Viewer** — read only

## AI safety rule

AI assistants (from Phase 5) only ever receive a client's facts marked
**verified**. New facts start unverified.

## Phases

1. Foundation ✅ · 2. Agency dashboard · 3. Google OAuth + Google Ads (read-only) ·
4. Ads analysis & recommendations · 5. Ads creative assistant · 6. Search Console + GA4 ·
7. Business Profile + reviews · 8. SEO, keywords, competitors · 9. Leads, tasks, content ·
10. Reports & client portal
