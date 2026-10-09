"""Build the Covet catalogue.

Edit PRODUCTS below, then run:  python3 tools/build_catalog.py
Writes:
  data/products.js            - catalogue the website reads
  data/shopify-products.csv   - Shopify product import file (Admin > Products > Import)

Prices are in ZAR and are placeholders - set real prices before launch.
Images point at StockX's public CDN by slug; replace with supplier or own photos
before going live (any image that fails to load falls back to a text tile).
"""
import csv
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = "https://images.stockx.com/images/{}.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color"
SIZES = ["UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"]

# (brand, model, colourway, category, price ZAR, image slug)
# category: sportswear | designer | rare
PRODUCTS = [
    # --- Nike ---
    ("Nike", "Air Force 1 '07 Low", "White", "sportswear", 2199, "Nike-Air-Force-1-Low-White-07-Product"),
    ("Nike", "Air Force 1 '07 Low", "Black", "sportswear", 2199, "Nike-Air-Force-1-Low-Black-2012-Product"),
    ("Nike", "Dunk Low Retro", "White Black (Panda)", "sportswear", 2099, "Nike-Dunk-Low-Retro-White-Black-2021-Product"),
    ("Nike", "Dunk Low Retro", "Grey Fog", "sportswear", 2099, "Nike-Dunk-Low-Grey-Fog-Product"),
    ("Nike", "Air Max 90", "Infrared", "sportswear", 2799, "Nike-Air-Max-90-Infrared-2020-Product"),
    ("Nike", "Air Max 95 OG", "Neon", "sportswear", 3499, "Nike-Air-Max-95-OG-Neon-2020-Product"),
    ("Nike", "Air Max 97", "Silver Bullet", "sportswear", 3699, "Nike-Air-Max-97-OG-QS-Silver-Bullet-2017-Product"),
    ("Nike", "Air Max Plus TN", "Black", "sportswear", 3699, "Nike-Air-Max-Plus-Triple-Black-Product"),
    ("Nike", "Air Max 1 '86 OG", "Big Bubble Red", "sportswear", 3299, "Nike-Air-Max-1-86-OG-Big-Bubble-Red-Product"),
    ("Nike", "Blazer Mid '77 Vintage", "White Black", "sportswear", 1899, "Nike-Blazer-Mid-77-Vintage-White-Black-Product"),
    ("Nike", "Cortez", "White Varsity Red", "sportswear", 1799, "Nike-Cortez-White-Varsity-Red-Varsity-Royal-2023-Product"),
    ("Nike", "P-6000", "Metallic Silver", "sportswear", 2299, "Nike-P-6000-Metallic-Silver-Product"),
    ("Nike", "Zoom Vomero 5", "Photon Dust", "sportswear", 3199, "Nike-Zoom-Vomero-5-Photon-Dust-Metallic-Silver-W-Product"),
    ("Nike", "Shox TL", "Black Max Orange", "sportswear", 3699, "Nike-Shox-TL-Black-Max-Orange-Product"),
    # --- Jordan ---
    ("Jordan", "Air Jordan 1 Low", "Wolf Grey", "sportswear", 2399, "Air-Jordan-1-Low-Wolf-Grey-Product"),
    ("Jordan", "Air Jordan 1 Retro High OG", "Chicago Lost & Found", "rare", 9500, "Air-Jordan-1-Retro-High-OG-Chicago-Reimagined-Product"),
    ("Jordan", "Air Jordan 3 Retro", "White Cement Reimagined", "sportswear", 4299, "Air-Jordan-3-Retro-White-Cement-Reimagined-Product"),
    ("Jordan", "Air Jordan 4 Retro", "Military Black", "sportswear", 4299, "Air-Jordan-4-Retro-Military-Black-Product"),
    ("Jordan", "Air Jordan 4 Retro", "Bred Reimagined", "rare", 6500, "Air-Jordan-4-Retro-Bred-Reimagined-Product"),
    ("Jordan", "Air Jordan 11 Retro", "Gratitude", "sportswear", 4499, "Air-Jordan-11-Retro-DMP-Gratitude-2023-Product"),
    # --- adidas ---
    ("adidas", "Samba OG", "Cloud White Core Black", "sportswear", 2299, "adidas-Samba-OG-Cloud-White-Core-Black-Product"),
    ("adidas", "Gazelle Indoor", "Blue Fusion Gum", "sportswear", 2499, "adidas-Gazelle-Indoor-Blue-Fusion-Gum-Product"),
    ("adidas", "Spezial Handball", "Light Blue Gum", "sportswear", 2299, "adidas-Handball-Spezial-Light-Blue-Product"),
    ("adidas", "Campus 00s", "Core Black", "sportswear", 2199, "adidas-Campus-00s-Core-Black-Product"),
    ("adidas", "SL 72 OG", "Blue Bird", "sportswear", 1999, "adidas-SL-72-OG-Blue-Bird-Product"),
    ("adidas", "Superstar", "White Black", "sportswear", 1999, "adidas-Superstar-White-Black-Product"),
    ("adidas", "Stan Smith", "White Green", "sportswear", 1899, "adidas-Stan-Smith-White-Green-Product"),
    ("adidas", "Forum Low", "White", "sportswear", 1999, "adidas-Forum-Low-Cloud-White-Product"),
    ("adidas", "Ultraboost 1.0", "Core Black", "sportswear", 3499, "adidas-Ultra-Boost-1-0-Core-Black-Product"),
    # --- Puma ---
    ("Puma", "Suede Classic", "Black White", "sportswear", 1599, "Puma-Suede-Classic-Black-White-Product"),
    ("Puma", "Palermo", "Vapor Grey Gum", "sportswear", 1899, "Puma-Palermo-Vapor-Gray-Clementine-Product"),
    ("Puma", "Speedcat OG", "Red White", "sportswear", 1999, "Puma-Speedcat-OG-Red-White-Product"),
    ("Puma", "RS-X", "White", "sportswear", 2199, "Puma-RS-X-Triple-White-Product"),
    # --- New Balance ---
    ("New Balance", "550", "White Green", "sportswear", 2599, "New-Balance-550-White-Green-Product"),
    ("New Balance", "530", "White Silver Navy", "sportswear", 2299, "New-Balance-530-White-Silver-Navy-Product"),
    ("New Balance", "9060", "Rain Cloud", "sportswear", 3299, "New-Balance-9060-Rain-Cloud-Grey-Product"),
    ("New Balance", "2002R", "Protection Pack Rain Cloud", "sportswear", 3299, "New-Balance-2002R-Protection-Pack-Rain-Cloud-Product"),
    ("New Balance", "1906R", "Silver Metallic", "sportswear", 3199, "New-Balance-1906R-Silver-Metallic-Product"),
    ("New Balance", "990v6 Made in USA", "Grey", "sportswear", 4999, "New-Balance-990v6-MiUSA-Grey-Product"),
    # --- ASICS ---
    ("ASICS", "Gel-1130", "White Pure Silver", "sportswear", 2299, "ASICS-Gel-1130-White-Pure-Silver-Product"),
    ("ASICS", "Gel-Kayano 14", "Cream Black", "sportswear", 3199, "ASICS-Gel-Kayano-14-Cream-Black-Product"),
    ("ASICS", "Gel-NYC", "Graphite Grey", "sportswear", 2799, "ASICS-Gel-NYC-Graphite-Grey-Black-Product"),
    # --- Converse / Vans / Reebok ---
    ("Converse", "Chuck 70 Hi", "Black", "sportswear", 1599, "Converse-Chuck-Taylor-All-Star-70-Hi-Black-Product"),
    ("Converse", "Run Star Hike Hi", "Black White", "sportswear", 1999, "Converse-Run-Star-Hike-Hi-Black-White-Product"),
    ("Vans", "Old Skool", "Black White", "sportswear", 1299, "Vans-Old-Skool-Black-White-Product"),
    ("Vans", "Knu Skool", "Black True White", "sportswear", 1499, "Vans-Knu-Skool-Black-True-White-Product"),
    ("Vans", "Sk8-Hi", "Black White", "sportswear", 1399, "Vans-Sk8-Hi-Black-White-Product"),
    ("Reebok", "Club C 85 Vintage", "Chalk Green", "sportswear", 1599, "Reebok-Club-C-85-Vintage-Chalk-Green-Product"),
    ("Reebok", "Instapump Fury OG", "Citron", "sportswear", 3299, "Reebok-Instapump-Fury-OG-Citron-2019-Product"),
    # --- Performance / outdoor ---
    ("Hoka", "Clifton 9", "Black White", "sportswear", 2999, "Hoka-One-One-Clifton-9-Black-White-Product"),
    ("Hoka", "Bondi 8", "Black", "sportswear", 3299, "Hoka-One-One-Bondi-8-Black-Product"),
    ("On", "Cloudmonster", "All Black", "sportswear", 3499, "On-Running-Cloudmonster-All-Black-Product"),
    ("Salomon", "XT-6", "Black Phantom", "sportswear", 3999, "Salomon-XT-6-Black-Black-Phantom-Product"),
    ("Salomon", "ACS Pro", "Black", "sportswear", 3799, "Salomon-ACS-Pro-Advanced-Black-Product"),
    ("Saucony", "Shadow 6000", "Grey", "sportswear", 2499, "Saucony-Shadow-6000-Grey-Product"),
    # --- Designer ---
    ("Gucci", "Ace", "White Web Stripe", "designer", 14500, "Gucci-Ace-White-Green-Red-Product"),
    ("Gucci", "Rhyton", "Logo Ivory", "designer", 19500, "Gucci-Rhyton-Vintage-Logo-Product"),
    ("Gucci", "Screener", "Off White", "designer", 18500, "Gucci-Screener-Off-White-Product"),
    ("Louis Vuitton", "LV Trainer", "White", "designer", 24500, "Louis-Vuitton-LV-Trainer-White-Product"),
    ("Louis Vuitton", "LV Skate", "Black", "designer", 23500, "Louis-Vuitton-LV-Skate-Black-Product"),
    ("Balenciaga", "Triple S", "White", "designer", 21000, "Balenciaga-Triple-S-White-2018-Product"),
    ("Balenciaga", "Track", "Black", "designer", 21500, "Balenciaga-Track-Trainer-Black-Product"),
    ("Balenciaga", "3XL", "Grey", "designer", 25500, "Balenciaga-3XL-Grey-Product"),
    ("Balenciaga", "Speed Trainer", "Black", "designer", 16500, "Balenciaga-Speed-Trainer-Black-Product"),
    ("Dior", "B22", "White Blue", "designer", 22500, "Dior-B22-White-Blue-Product"),
    ("Dior", "B23 High Top Oblique", "Ecru Blue", "designer", 23500, "Dior-B23-High-Top-Oblique-Product"),
    ("Prada", "America's Cup", "White Silver", "designer", 17500, "Prada-Americas-Cup-White-Silver-Product"),
    ("Alexander McQueen", "Oversized Sneaker", "White Black", "designer", 12500, "Alexander-McQueen-Oversized-White-Black-Product"),
    ("Valentino", "One Stud", "White", "designer", 16500, "Valentino-Garavani-One-Stud-White-Product"),
    ("Versace", "Chain Reaction", "Black", "designer", 19500, "Versace-Chain-Reaction-Black-Product"),
    ("Givenchy", "TK-360", "Black", "designer", 16500, "Givenchy-TK-360-Black-Product"),
    ("Off-White", "Out Of Office", "White Black", "designer", 9500, "OFF-WHITE-Out-Of-Office-OOO-Low-White-Black-Product"),
    ("Amiri", "Skel-Top Low", "White", "designer", 15500, "Amiri-Skel-Top-Low-White-Product"),
    ("Rick Owens", "Geobasket", "Black Milk", "designer", 22500, "Rick-Owens-Geobasket-Black-Milk-Product"),
    ("Rick Owens", "Ramones Low", "Black Milk", "designer", 12500, "Rick-Owens-DRKSHDW-Ramones-Low-Black-Milk-Product"),
    ("Golden Goose", "Super-Star", "White Black Star", "designer", 11500, "Golden-Goose-Super-Star-White-Black-Product"),
    ("Common Projects", "Achilles Low", "White", "designer", 8500, "Common-Projects-Achilles-Low-White-Product"),
    ("Maison Margiela", "Replica", "White", "designer", 9500, "Maison-Margiela-Replica-Low-Top-White-Product"),
    ("Christian Louboutin", "Louis Junior Spikes", "Black", "designer", 24500, "Christian-Louboutin-Louis-Junior-Spikes-Black-Product"),
    ("Bottega Veneta", "Orbit", "Black", "designer", 18500, "Bottega-Veneta-Orbit-Sneaker-Black-Product"),
    ("Loewe", "Flow Runner", "Black", "designer", 13500, "Loewe-Flow-Runner-Black-Product"),
    # --- Rare / hype ---
    ("Jordan", "Air Jordan 1 Low x Travis Scott", "Mocha", "rare", 28000, "Air-Jordan-1-Low-Travis-Scott-Product"),
    ("Jordan", "Air Jordan 1 Low OG x Travis Scott", "Reverse Mocha", "rare", 26000, "Air-Jordan-1-Retro-Low-OG-SP-Travis-Scott-Reverse-Mocha-Product"),
    ("Jordan", "Air Jordan 1 Low OG x Travis Scott", "Olive", "rare", 18500, "Air-Jordan-1-Low-OG-SP-Travis-Scott-Olive-W-Product"),
    ("Jordan", "Air Jordan 1 High OG x Dior", "Grey", "rare", 180000, "Air-Jordan-1-Retro-High-Dior-Product"),
    ("Jordan", "Air Jordan 4 x Off-White", "Sail", "rare", 22000, "Air-Jordan-4-Retro-Off-White-Sail-W-Product"),
    ("Jordan", "Air Jordan 1 High x Off-White", "Chicago", "rare", 95000, "Air-Jordan-1-Retro-High-Off-White-Chicago-Product"),
    ("Jordan", "Air Jordan 1 High x Union LA", "Black Toe", "rare", 32000, "Air-Jordan-1-Retro-High-Union-Los-Angeles-Black-Toe-Product"),
    ("Jordan", "Air Jordan 4 x A Ma Maniere", "Violet Ore", "rare", 12500, "Air-Jordan-4-Retro-A-Ma-Maniere-Violet-Ore-W-Product"),
    ("Nike", "Air Force 1 Low x Louis Vuitton", "White Comet Red", "rare", 95000, "Nike-Air-Force-1-Low-Louis-Vuitton-White-Comet-Red-Product"),
    ("Nike", "Dunk Low x Off-White", "Lot 01 of 50", "rare", 16500, "Nike-Dunk-Low-Off-White-Lot-1-Product"),
    ("Nike", "SB Dunk Low x Travis Scott", "Cactus Jack", "rare", 38000, "Nike-SB-Dunk-Low-Travis-Scott-Product"),
    ("Nike", "SB Dunk Low x Ben & Jerry's", "Chunky Dunky", "rare", 28000, "Nike-SB-Dunk-Low-Ben-Jerrys-Chunky-Dunky-Product"),
    ("Nike", "SB Dunk Low x Concepts", "Purple Lobster", "rare", 14500, "Nike-SB-Dunk-Low-Purple-Lobster-Product"),
    ("Nike", "LDWaffle x Sacai", "Black Nylon", "rare", 9500, "Nike-LD-Waffle-sacai-Black-Nylon-Product"),
    ("adidas", "Yeezy Boost 350 V2", "Zebra", "rare", 6500, "Adidas-Yeezy-Boost-350-V2-White-Core-Black-Red-Product"),
    ("adidas", "Yeezy Boost 700", "Wave Runner", "rare", 7500, "Adidas-Yeezy-Wave-Runner-700-Solid-Grey-Product"),
    ("adidas", "Yeezy Foam Runner", "Onyx", "rare", 3999, "adidas-Yeezy-Foam-RNNR-Onyx-Product"),
    ("adidas", "Samba x Wales Bonner", "Cream Green", "rare", 7500, "adidas-Samba-Wales-Bonner-Cream-Green-Product"),
    ("adidas", "Forum Low x Bad Bunny", "Easter Egg", "rare", 6500, "adidas-Forum-Low-Bad-Bunny-Easter-Egg-Product"),
    ("New Balance", "550 x Aime Leon Dore", "White Green", "rare", 8500, "New-Balance-550-Aime-Leon-Dore-White-Green-Product"),
    ("New Balance", "9060 x Salehe Bembury", "Sea Salt", "rare", 6500, "New-Balance-9060-Salehe-Bembury-Ivory-Product"),
    ("ASICS", "Gel-Lyte III x Kith", "Ronnie Fieg Salmon Toe", "rare", 7500, "ASICS-Gel-Lyte-III-Ronnie-Fieg-Salmon-Toe-Product"),
    ("Gucci", "Gazelle x adidas", "Pink", "rare", 21500, "adidas-Gazelle-Gucci-Pink-Product"),
    ("Balenciaga", "Speed x adidas", "Black", "rare", 23500, "Balenciaga-x-adidas-Speed-Black-Product"),
]

LABELS = {"sportswear": "Sportswear", "designer": "Designer", "rare": "Rare & Hype"}


def handle(*parts):
    return re.sub(r"[^a-z0-9]+", "-", " ".join(parts).lower()).strip("-")


def main():
    items = []
    seen = set()
    for brand, model, colour, cat, price, slug in PRODUCTS:
        h = handle(brand, model, colour)
        assert h not in seen, h
        seen.add(h)
        items.append({
            "handle": h,
            "title": f"{model} '{colour}'",
            "model": model,
            "colourway": colour,
            "vendor": brand,
            "category": cat,
            "categoryLabel": LABELS[cat],
            "price": price,
            "currency": "ZAR",
            "sizes": SIZES,
            "image": IMG.format(slug),
            "tags": [cat, brand.lower()],
        })

    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "products.js"), "w") as f:
        f.write("// Generated by tools/build_catalog.py - edit the script, not this file.\n")
        f.write("window.COVET_PRODUCTS = ")
        json.dump(items, f, indent=1)
        f.write(";\n")

    # Shopify product CSV: first row of a product carries the product fields,
    # following rows carry the remaining size variants.
    cols = ["Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags",
            "Published", "Option1 Name", "Option1 Value", "Variant SKU",
            "Variant Inventory Tracker", "Variant Inventory Qty", "Variant Inventory Policy",
            "Variant Fulfillment Service", "Variant Price", "Variant Requires Shipping",
            "Variant Taxable", "Image Src", "Image Position", "Image Alt Text", "Status"]
    with open(os.path.join(ROOT, "data", "shopify-products.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for p in items:
            for i, size in enumerate(p["sizes"]):
                row = {
                    "Handle": p["handle"],
                    "Option1 Value": size,
                    "Variant SKU": f"{p['handle']}-{size.replace(' ', '').lower()}",
                    "Variant Inventory Tracker": "shopify",
                    "Variant Inventory Qty": 0,
                    "Variant Inventory Policy": "deny",
                    "Variant Fulfillment Service": "manual",
                    "Variant Price": f"{p['price']:.2f}",
                    "Variant Requires Shipping": "TRUE",
                    "Variant Taxable": "TRUE",
                }
                if i == 0:
                    row.update({
                        "Title": f"{p['vendor']} {p['title']}",
                        "Body (HTML)": f"<p>{p['vendor']} {p['model']} in {p['colourway']}.</p>",
                        "Vendor": p["vendor"],
                        "Product Category": "Apparel & Accessories > Shoes",
                        "Type": "Sneakers",
                        "Tags": ", ".join([p["categoryLabel"]] + p["tags"]),
                        "Published": "FALSE",
                        "Option1 Name": "Size",
                        "Image Src": p["image"].split("?")[0],
                        "Image Position": 1,
                        "Image Alt Text": f"{p['vendor']} {p['title']}",
                        "Status": "draft",
                    })
                w.writerow(row)

    counts = {c: sum(p["category"] == c for p in items) for c in LABELS}
    print(f"{len(items)} products, {len({p['vendor'] for p in items})} brands", counts)


if __name__ == "__main__":
    main()
