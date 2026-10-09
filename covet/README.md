# Covet: sneaker store

A static storefront for Covet: 105 sneakers from 31 brands in three categories (Sportswear, Designer, Rare & Hype). It has search, brand filter, sorting, a product view with UK sizes, and a bag. It is built so that Shopify can be connected later without a rebuild.

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

- **Prices** are placeholder ZAR estimates. Set real prices in `tools/build_catalog.py`.
- **Images** load from StockX's public image CDN by product name. They could not be checked from the build environment, so a few may not resolve. Any that fail show a clean text tile instead. Replace them with supplier or your own photos before launch.
- **Stock**: the CSV imports every size with quantity 0 and status *draft*. Set inventory in Shopify.

## Connecting Shopify later

1. In Shopify Admin, go to Products > Import and upload `data/shopify-products.csv`. Handles and the `Size` option match the site.
2. Install the Headless channel (or create a Storefront API app) and copy the public Storefront access token.
3. In `store.js`, fill in `SHOPIFY.domain` (e.g. `covet-sa.myshopify.com`) and `SHOPIFY.storefrontToken`.

After step 3, the Checkout button creates a Shopify cart and sends customers to Shopify's hosted checkout.
