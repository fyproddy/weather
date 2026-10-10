# Covet: sneaker store

A static storefront for Covet: 538 sneakers (Luxury, Rare & Hype, Sportswear) and 243 clothing pieces (Hoodies & Knits, Tops, Bottoms) from 82 brands. It covers icons from any year that are still sold, plus everything from 2020 to now that can still be bought somewhere. It has search, brand filter, sorting, a product view with UK sizes, and a bag. It is built so that Shopify can be connected later without a rebuild.

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

- **Pricing rule:** the Covet price is 60% of each pair's own store price (`DISCOUNT` in `tools/build_catalog.py`); for example, an LV Trainer with a R 25 000 store price sells at R 15 000. Pairs found on StockX use the store price on their own listing (`tools/store_prices_usd.json`, in US$, converted at `ZAR_PER_USD`), so special editions such as the Takashi Murakami LV Trainer are priced from their own, higher store price. Sold-out collaborations use their recent resale price. Pairs with no listed price use their collection's store price. Only the Covet price is shown on the site. Pairs from other shops (`tools/retail_prices_usd.json`) use that shop's price when it is a boutique selling at store price, checked against comparable Covet pairs so a sale price never sets the store price; Stadium Goods is a resale shop, so its pairs keep their model's store price, except rare collaborations, which follow resale.
- **Store prices** are ZAR estimates. Check them before launch.
- **Images**: every one of the 538 products has a checked, working photo, and 331 have several views. Most come from StockX listings found by web search (`tools/extra_images.json`), with extra angles from StockX's 360-degree photos (`tools/gallery.json`, made by `tools/check_gallery.py`). Models StockX doesn't carry use real listings from Stadium Goods, Feature, Italist and ShopSimon (`tools/retail_products.json`). Models no reachable shop sells (LV Time Out, Rivoli and Beverly Hills, Gucci Horsebit sneaker, Balenciaga Cargo and Paris, Dior B57, Hermès Drive, Celine Block, Louboutin Vieira) were replaced by current models from the same brands. `python3 tools/check_images.py` re-checks every link.
- **Stock**: the CSV imports every size with quantity 0 and status *draft*. Set inventory in Shopify.

## Clothing

- **Source list:** `tools/apparel_list.txt` is Covet's clothing list. Each item was matched to a real listing on the brand's own store or a retailer (Stadium Goods, Italist, Kith, Slam Jam, The Double F, Antonioli, Browns, Feature), keeping only matches with the same brand and garment type. Items with no real listing were left out. The matches, with photos, price and source link, are in `tools/apparel_products.json`; product names are the real listing's name.
- **Pricing rule:** the Covet price is 50% of the price on the listing the piece was found on: the brand's store price, or the retailer or resale price (`DISCOUNT` and currency `RATES` in `tools/apparel.py`).
- **Collections:** brand drops first (Chrome Hearts, Corteiz, Essentials, Gallery Dept., Hellstar, Sp5der, Supreme, Denim Tears), then by style (Jerseys, Tracksuits & Sets, Old Money, Italian Sportswear, Maison Logos, Designer Bottoms, Denim, Shorts, Sweatpants & Pants, Heavyweight Hoodies, Graphic Tees). Rules are in `tools/apparel.py`.

## Connecting Shopify later

1. In Shopify Admin, go to Products > Import and upload `data/shopify-products.csv`. Handles and the `Size` option match the site.
2. Install the Headless channel (or create a Storefront API app) and copy the public Storefront access token.
3. In `store.js`, fill in `SHOPIFY.domain` (e.g. `covet-sa.myshopify.com`) and `SHOPIFY.storefrontToken`.

After step 3, the Checkout button creates a Shopify cart and sends customers to Shopify's hosted checkout.
