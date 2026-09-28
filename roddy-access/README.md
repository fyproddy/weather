# RODDY ACCESS

Website for RODDY ACCESS, a private Johannesburg lifestyle concierge.
**STAY • MOVE • DINE • NIGHT — Johannesburg, curated.**

Next.js (App Router) and React, with plain CSS. There is no UI framework and no animation library.
The site builds to static files (`/out`) that can be hosted anywhere.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site → /out
```

## Before launch

Copy `.env.example` to `.env.local` (or set the same variables on your host):

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | **Required.** Digits only, e.g. `27821234567`. Every "Chat on WhatsApp" link and the planner hand-off use it. |
| `NEXT_PUBLIC_FORM_ENDPOINT` | Optional. A JSON form endpoint (Formspree, Basin, your own API). When set, plan requests are also emailed to you before the WhatsApp step, and the final screen reads "Request received". |
| `NEXT_PUBLIC_SITE_URL` | The live domain, used for the sitemap, canonical URLs and share previews. |

The email address and Instagram link are in `content/site.ts`.

Deploying on Vercel: import the repo and set **Root Directory** to `roddy-access`.

## Where things live

```
content/            ← all copy and data. Edit here, not in components.
  site.ts           brand, contact, navigation
  pillars.ts        STAY / MOVE / DINE / NIGHT (homepage sections + their pages)
  weekends.ts       The Access Weekend, The Private Section, celebrations
  plan.ts           planner questions and options
  images.ts         which photo is used where
  listings.ts       future inventory (empty at launch)
app/                pages: / stay move dine night weekends private-section plan contact
components/         Header, Footer, Photo, Planner, PillarPage, Listings, Motion
photos-src/         original photographs
public/images/      generated web images (don't edit by hand)
```

## Photos

Every photo goes through the same colour grade in `scripts/images.mjs`, so that phone
shots taken in different places look like one set: neutral-warm white balance, a soft film
tone curve, calmer blues and greens, a light vignette, fine grain, and
WebP output at four sizes.

1. Put the original in `photos-src/`, named by what it shows (e.g. `night-club-table.jpg`)
2. `npm run images`
3. In `content/images.ts`, point a role at it: `night: { src: "night-club-table", alt: "…" }`

You can tweak a single photo with `OVERRIDES` at the top of the script (exposure, warmth, white balance strength).

A few roles still use hosted stock photos (penthouse, hotel suite, sports car, aircraft,
nightclub, bar). Each of those falls back to one of your own photos if it fails to load.
Replace them with your own shots when you can. **NIGHT** matters most.

## Adding real inventory later

`content/listings.ts` has typed, empty lists for stays, vehicles, dining and nightlife.
Nothing renders while a list is empty. Add an entry and it appears on the matching
page, in a horizontal row that scrolls, with no redesign needed:

```ts
stay: [
  {
    id: "hyde-park-villa",
    name: "Hyde Park Villa",
    area: "Hyde Park",
    sleeps: 10,
    summary: "Five suites, a pool and a kitchen built for a chef.",
    photo: { src: "stay-hyde-park", alt: "Pool terrace at the Hyde Park villa" },
    priceFrom: "From R18 000 / night", // only real, confirmed prices
  },
],
```

## Notes

- The planner saves progress in the browser session, so a refresh doesn't lose it.
  Links like `/plan/?type=private-section` or `/plan/?type=full-weekend&occasion=birthday`
  open it with those answers already filled in.
- The site has no fake reviews, client counts, prices or availability.
- Motion is turned off for visitors whose device asks for reduced motion.
