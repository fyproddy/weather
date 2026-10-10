# Covet: sneaker store

A static storefront for Covet: 403 sneakers from 40 brands in 146 collections, across three categories (Luxury, Rare & Hype, Sportswear). It covers icons from any year that are still sold, plus everything from 2020 to now that can still be bought somewhere. It has search, brand filter, sorting, a product view with UK sizes, and a bag. It is built so that Shopify can be connected later without a rebuild.

## Run it

Open `index.html` through any static server:

```
cd covet && python3 -m http.server 8000
```

It can be hosted on GitHub Pages, Netlify, Vercel or any other static host.

## Files

| File | Purpose |
|---|---|
| `index.html`, `styles.css` | Page and styling (black and white, no icons or gradients) |
| `app.js` | Catalogue grid, filters, product view, bag drawer |
| `store.js` | Bag storage and checkout. Shopify plugs in here |
| `data/products.js` | Catalogue (generated) |
| `data/shopify-products.csv` | Same catalogue in Shopify's product import format (generated) |
| `tools/build_catalog.py` | The source list of sneakers. Edit it, then run `python3 tools/build_catalog.py` |
| `assets/` | Covet logo, white and black, transparent PNG |

## Before going live

- **Pricing rule:** the Covet price is 60% of the store price (`DISCOUNT` in `tools/build_catalog.py`). For example, the LV Trainer store price is R 25 000, so Covet sells it at R 15 000. Sold-out pairs and collaborations use the current resale market price as their store price. Only the Covet price is shown; the store price is kept in the data but never displayed.
- **Store prices** are ZAR estimates. Check them before launch.
- **Images**: 108 of 403 products have a checked, working photo from StockX's public image CDN. The rest show a clean text tile until a photo is added, and the shop lists pairs with photos first. To add photos, put the right StockX file name for each product in `tools/images.json`, or switch to your retail program's official photos. `python3 tools/check_images.py` re-checks every link.
- **Stock**: the CSV imports every size with quantity 0 and status *draft*. Set inventory in Shopify.

## Connecting Shopify later

1. In Shopify Admin, go to Products > Import and upload `data/shopify-products.csv`. Handles and the `Size` option match the site.
2. Install the Headless channel (or create a Storefront API app) and copy the public Storefront access token.
3. In `store.js`, fill in `SHOPIFY.domain` (e.g. `covet-sa.myshopify.com`) and `SHOPIFY.storefrontToken`.

After step 3, the Checkout button creates a Shopify cart and sends customers to Shopify's hosted checkout.
