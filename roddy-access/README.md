# RODDY ACCESS

Website for RODDY ACCESS, a private Johannesburg lifestyle concierge.
**STAY • MOVE • DINE • NIGHT — Johannesburg, curated.**

Next.js (App Router) and React, with plain CSS. There is no UI framework and no animation library.
Every page is prerendered as static HTML. One small server route, `/api/request`, delivers
plan requests straight to RODDY ACCESS.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## How requests reach you

When someone finishes the planner, the site sends their request **straight to the
RODDY ACCESS WhatsApp (+27 68 057 9202)**, and to email if that's set up too. The visitor
never has to open WhatsApp. They see "Request received", and their answers are formatted with a
one-tap link to reply to them on WhatsApp.

The delivery keys live on the server only, never in the page. Set them on your host
(on Vercel: Settings → Environment Variables); `.env.example` lists them all.

### WhatsApp: CallMeBot (free, about 2 minutes)

WhatsApp doesn't let a website send messages on its own, so a relay service does it.
CallMeBot is free and made for exactly this: notifications to your own number.

1. On the phone with +27 68 057 9202, go to **callmebot.com → WhatsApp API** and follow
   "How to get the API key": add their number to your contacts and send the activation
   message it shows.
2. CallMeBot replies with an **API key**.
3. Set `CALLMEBOT_APIKEY` to that key on your host and redeploy.

Messages arrive from the CallMeBot contact on the RODDY ACCESS WhatsApp.
(Once you have a WhatsApp Business account, the official WhatsApp Cloud API can replace
this. Only `sendWhatsApp()` in `app/api/request/route.ts` changes.)

### Email backup: Resend (free tier)

1. Create an account at resend.com and an API key → `RESEND_API_KEY`.
2. `REQUEST_EMAIL_TO` is where requests go (defaults to the address in `content/site.ts`).
3. Until you verify your domain on Resend, leave `REQUEST_EMAIL_FROM` empty. Resend's
   test sender only delivers to the email you signed up with.

**Set up at least one channel.** If neither is set, or both fail, the visitor sees a
friendly fallback that lets them send the same details on WhatsApp or by email instead,
so no request is lost.

### Other settings

- Phone number, email and Instagram: `content/site.ts`
- `NEXT_PUBLIC_SITE_URL`: the live domain (sitemap, canonical URLs, share previews)

### Hosting

Vercel is simplest: import the repo, set **Root Directory** to `roddy-access`, add the
environment variables, deploy. Netlify or any Node host works too (`npm run build && npm start`).

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
lib/request.ts      request format + validation (shared by planner and server)
app/api/request/    delivers planner requests to WhatsApp / email
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

The site uses only your own photography — no stock images. A service without a
photo simply shows as text. Add a photo later by giving it a `photo:` in `content/pillars.ts`.

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
