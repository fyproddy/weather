# Palesa Visuals — website

A single-page site for Palesa Visuals (DStv installation and technical services).
It is plain HTML, CSS and JavaScript with no build step or dependencies, so it can be hosted on any
static host (GitHub Pages, Netlify, cPanel and so on).

```
palesa/
├── index.html          page content and structure
├── css/styles.css      all styling (brand colours are at the top)
├── js/config.js        ← business details and the service list (edit this)
├── js/main.js          menu, services, quote form, WhatsApp message
└── assets/
    ├── img/            logo (transparent PNG), favicons, social share image
    └── photos/         photographs (see below)
```

Preview locally: `cd palesa && python3 -m http.server 8000`, then open http://localhost:8000.

## 1. Fill in the business details

Everything lives in `js/config.js`:

| Setting | What to enter |
| --- | --- |
| `whatsappNumber` | International format, digits only. For example, 082 123 4567 becomes `27821234567` |
| `phoneNumber` | As it should be displayed, e.g. `082 123 4567` |
| `email` | Optional |
| `serviceAreaSummary` | Short line shown in the hero, footer and FAQ, e.g. `Johannesburg and surrounding areas` |
| `serviceAreas` | Places customers can pick in the quote form, grouped by region. Customers can always choose "Other area" and type their own |
| `businessHours` | Optional, e.g. `Mon–Sat, 08:00–17:00` |
| `siteUrl` | The live address once the domain is known (sets the canonical URL and social links) |
| `services` | Edit, reorder or delete services. The quote form's dropdown updates automatically |
| `servicesConfirmed` | Set to `true` once the business has checked the service list |

Anything left blank is hidden rather than replaced with an invented value. Until the important settings are filled in,
a small "Site setup" notice appears in the bottom corner of the page. It disappears automatically once
everything is configured.

**Until `whatsappNumber` is set, the WhatsApp buttons are disabled.** The quote form then lets
customers copy their message instead of opening a WhatsApp link that would not work.

## 2. Add the photographs

The page expects these files in `assets/photos/`. Until a file exists, its frame shows a plain light panel,
so nothing looks broken.

| File | Used in | Subject | Shape |
| --- | --- | --- | --- |
| `hero.jpg` | Hero (top of page) | Technician installing a satellite dish on a residential roof | Landscape 4:3, about 1600 × 1200 |
| `new-installation.jpg` | Services: New DStv Installation | Satellite dish neatly mounted on a house | Portrait or square, about 1200 × 1400 |
| `signal-check.jpg` (optional, not used yet) | Services: Signal Problems — add the file, then set `featured: true` and a `photo` for that service in config.js | Technician checking signal with a meter, or a dish being aligned | Landscape 16:10, about 1200 × 750 |
| `tv-room.jpg` | Services: Extra View | Clean TV installation in a living room | Landscape 16:10, about 1200 × 750 |
| `cabling.jpg` | Why Palesa Visuals | Neatly clipped satellite cabling, or a technician at work | Portrait 4:5, about 1200 × 1500 |

The best choice is real photos of Palesa Visuals' own installations. Failing that, use licensed stock photos
(Unsplash, Pexels or a paid library). Stock photos must not be presented as the company's own work, so don't
caption them as "our installations". Save them as JPG at quality 75–80, keeping each under about 300 KB.
To change a service photo's file name or alt text, edit `photo` for that service in `js/config.js`.

## 3. How the WhatsApp quote works

1. The form checks the required fields and the phone number.
2. The answers are formatted into a quotation message. Only questions the customer answered are included,
   and only those for the selected service.
3. The site opens `https://wa.me/<whatsappNumber>?text=<message>`.
4. **The customer still has to press Send in WhatsApp.** The page tells them this, and offers "Open WhatsApp
   again" and "Copy message" as fallbacks.

Nothing is stored on a server. If you later want requests delivered automatically, without the customer
pressing Send, you would need a backend. For example, a small serverless function could receive the form
and then either send an email (Resend, Postmark, SES) or a message through the
**WhatsApp Business Platform (Cloud API)**. That requires a verified Meta Business account, an approved
message template and a server to hold the API token securely.

## 4. Before going live

- Confirm every service listed is one the business actually offers, and remove any that are not.
- Only add claims such as "DStv Accredited Installer", warranties or years of experience once confirmed.
- Set `siteUrl`, then submit the site to Google Search Console.
