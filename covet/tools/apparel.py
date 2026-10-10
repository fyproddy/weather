"""Clothing for the Covet catalogue.

tools/apparel_products.json holds one entry per product on Covet's clothing list
that was matched to a real listing (brand store or retailer), with that listing's
photos and price. Items with no real listing are left out.

Pricing rule for clothing: Covet price = 50% of the price on the listing the
product was found on (the brand's store price, or the retailer/resale price for
pieces only sold on resale). Prices are converted to rand with RATES.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DISCOUNT = 0.50
RATES = {"ZAR": 1, "USD": 18.5, "EUR": 20.0, "GBP": 23.5, "JPY": 0.123, "AUD": 12.1, "AED": 5.04, "CAD": 13.5}
LABELS = {"hoodies": "Hoodies & Knits", "tops": "Tops", "bottoms": "Bottoms"}
LUXURY = {"Balenciaga", "Burberry", "Celine", "Dior", "Fendi", "Gucci", "Louis Vuitton", "Prada", "Moncler",
          "Bottega Veneta", "Givenchy", "Loewe", "Miu Miu", "Saint Laurent", "Versace", "Thom Browne",
          "Maison Margiela", "Amiri", "Casablanca", "Chrome Hearts", "Off-White", "Palm Angels"}
TOPS_SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
WAIST_SIZES = ["28", "30", "32", "34", "36", "38"]

# Collections: brand-led drops first, then by style. First rule that matches wins.
COLLECTIONS = [
    ("Chrome Hearts", lambda p: p["vendor"] == "Chrome Hearts"),
    ("Corteiz", lambda p: p["vendor"] == "Corteiz"),
    ("Essentials", lambda p: p["vendor"] == "Fear of God Essentials"),
    ("Gallery Dept.", lambda p: p["vendor"] == "Gallery Dept."),
    ("Hellstar", lambda p: p["vendor"] == "Hellstar"),
    ("Sp5der", lambda p: p["vendor"] == "Sp5der"),
    ("Supreme", lambda p: p["vendor"] == "Supreme"),
    ("Denim Tears", lambda p: p["vendor"] == "Denim Tears"),
    ("Jerseys", lambda p: re.search(r"\bjersey\b", p["title"], re.I)),
    ("Tracksuits & Sets", lambda p: re.search(r"track ?(jacket|pants|top)|tracksuit|set\b", p["title"], re.I)),
    ("Old Money", lambda p: p["vendor"] in {"Polo Ralph Lauren", "Lacoste", "Thom Browne", "Casablanca", "AMI Paris"}
     or re.search(r"\b(polo|oxford|cable|cardigan|cashmere|knit)\b", p["title"], re.I)),
    ("Italian Sportswear", lambda p: p["vendor"] in {"Stone Island", "C.P. Company"}),
    ("Maison Logos", lambda p: p["vendor"] in LUXURY and p["category"] in ("hoodies", "tops")),
    ("Designer Bottoms", lambda p: p["vendor"] in LUXURY and p["category"] == "bottoms"),
    ("Denim", lambda p: re.search(r"\b(jeans?|denim)\b", p["title"], re.I)),
    ("Shorts", lambda p: re.search(r"\bshorts?\b", p["title"], re.I)),
    ("Sweatpants & Pants", lambda p: p["category"] == "bottoms"),
    ("Heavyweight Hoodies", lambda p: p["category"] == "hoodies"),
    ("Graphic Tees", lambda p: p["category"] == "tops"),
]


def clean_title(raw, vendor):
    """Readable product name and colourway from a shop listing title."""
    t = re.sub(r"\s+", " ", raw).strip()
    colour = ""
    m = re.search(r'"([^"]+)"', t)
    if m:
        colour = m.group(1)
        t = t[:m.start()].strip()  # drop the colour and any style code after it
    else:
        parts = re.split(r"\s+[—-]\s+", t)
        if len(parts) > 1 and len(parts[-1].split()) <= 4:
            colour, t = parts[-1], " ".join(parts[:-1])
    # drop a repeated brand name at the start
    for b in {vendor, vendor.upper(), vendor.split()[0]}:
        if b and t.lower().startswith(b.lower() + " "):
            t = t[len(b) + 1:]
    if t.isupper() or sum(c.isupper() for c in t) > 0.7 * sum(c.isalpha() for c in t):
        t = " ".join(w if any(ch.isdigit() for ch in w) or len(w) <= 2 and w.isupper() and w not in ("OF", "IN", "TO") else w.capitalize() for w in t.split())
    if colour.isupper():
        colour = colour.title()
    return t.strip(" -—"), colour.strip()


def sizes_for(entry):
    raw = [str(s).strip() for s in entry.get("sizes") or []]
    ok = [s for s in raw if re.fullmatch(r"(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|\d{2}|[0-6]|O/?S)", s, re.I)]
    if ok:
        return ok
    if entry["category"] == "bottoms" and re.search(r"jean|denim|trouser|pant", entry["title"], re.I):
        return WAIST_SIZES
    return TOPS_SIZES


def handle(*parts):
    return re.sub(r"[^a-z0-9]+", "-", " ".join(parts).lower()).strip("-")


def load():
    path = os.path.join(ROOT, "tools", "apparel_products.json")
    if not os.path.exists(path):
        return []
    entries = json.load(open(path))
    items, seen = [], set()
    for e in entries:
        name, colour = clean_title(e["title"], e["vendor"])
        title = f"{name} '{colour}'" if colour else name
        h = handle(e["vendor"], title)
        if h in seen or not e.get("images"):
            continue
        seen.add(h)
        store = int(round(e["price"] * RATES.get(e["currency"] or "USD", 18.5), -1)) if e.get("price") else None
        if not store:
            continue
        p = {
            "handle": h,
            "title": title,
            "model": name,
            "colourway": colour,
            "vendor": e["vendor"],
            "department": "clothing",
            "category": e["category"],
            "categoryLabel": LABELS[e["category"]],
            "storePrice": store,
            "storePriceSource": "resale" if e["status"] == "resale" else "store",
            "price": int(round(store * DISCOUNT / 10.0) * 10),
            "currency": "ZAR",
            "sizes": sizes_for(e),
            "image": e["images"][0],
            "images": e["images"][:4],
            "badge": "Rare" if e["status"] == "resale" else ("Luxury" if e["vendor"] in LUXURY else ""),
            "source": e.get("url", ""),
        }
        p["collection"] = next(n for n, rule in COLLECTIONS if rule(p))
        p["tags"] = ["clothing", e["category"], e["vendor"].lower(), p["collection"].lower()]
        items.append(p)
    # Collections with plenty of pieces first, so the home page row leads with the big ones.
    size = {}
    for p in items:
        size[p["collection"]] = size.get(p["collection"], 0) + 1
    order = {n: i for i, (n, _) in enumerate(COLLECTIONS)}
    items.sort(key=lambda p: (-(size[p["collection"]] >= 6), order[p["collection"]]))
    return items
