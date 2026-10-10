"""Build the Covet catalogue.

Edit the COLLECTIONS list below, then run:  python3 tools/build_catalog.py
Writes:
  data/products.js            - catalogue the website reads
  data/shopify-products.csv   - Shopify product import file (Admin > Products > Import)

Scope: icons from any year that are still sold, plus everything released from 2020
to now that can still be bought somewhere - in brand stores, or on the resale
market for sold-out pairs.

Pricing rule: Covet price = 60% of each pair's own store price.
  * Pairs found on StockX use the store price on their own listing
    (tools/store_prices_usd.json), converted at ZAR_PER_USD.
  * "retail" store price = what the brand's own store charges (ZAR estimate)
  * "resale" store price = current resale market price, used for sold-out and
    collaboration pairs that no brand store sells any more
All store prices are estimates - check them before launch.

Images come from StockX's public image CDN. The file name is built from
"Brand Model Colourway" unless a slug is given. tools/images.json records the
result of checking every link: a corrected file name, or null where no photo
was found (the site then shows a text tile and the Shopify CSV leaves the image
empty). Re-check with: python3 tools/check_images.py
"""
import csv
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DISCOUNT = 0.60  # Covet price as a share of the store price
ZAR_PER_USD = 18.5  # converts a listing's US$ store price to rand
IMG = "https://images.stockx.com/images/{}.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color"
VIEW = "https://images.stockx.com/360/{n}/Images/{n}/Lv2/img{f}.jpg?fm=webp&w=700&q=90"
SIZES = ["UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"]

LABELS = {"luxury": "Luxury", "sportswear": "Sportswear", "rare": "Rare & Hype"}


def C(brand, collection, category, price, colourways, source="retail", model=None):
    """One collection (model line).

    colourways: list of "Colour", ("Colour", price) or ("Colour", price, "Image-Slug")
                price None keeps the collection price.
    """
    return dict(brand=brand, collection=collection, model=model or collection,
                category=category, price=price, colourways=colourways, source=source)


COLLECTIONS = [
    # ===================== LUXURY =====================
    # Louis Vuitton
    C("Louis Vuitton", "LV Trainer", "luxury", 25000, [
        "White", "Black", ("White Green", None), "Blue Monogram Denim", "White Red", "Black Monogram",
        "Brown Monogram", "White Silver"]),
    C("Louis Vuitton", "LV Skate", "luxury", 26000, ["White", "Black", "Brown Monogram", "Blue"]),
    C("Louis Vuitton", "LV Runner Tatic", "luxury", 24000, ["White Black", "Black"]),
    C("Louis Vuitton", "LV Run Away", "luxury", 19500, ["White", "Black Monogram"]),
    C("Louis Vuitton", "LV Time Out", "luxury", 21500, ["White", "Monogram"]),
    C("Louis Vuitton", "LV Rivoli", "luxury", 20500, ["White", "Black"]),
    C("Louis Vuitton", "LV Beverly Hills", "luxury", 19500, ["White", "Monogram"]),
    C("Louis Vuitton", "LV Millenium", "luxury", 26500, ["Black", "White"]),
    # Gucci
    C("Gucci", "Ace", "luxury", 14500, [
        ("White Web", None, "Gucci-Ace-White-Green-Red-Product"), "White Bee", "White Snake",
        "Black Leather", "GG Supreme"]),
    C("Gucci", "Rhyton", "luxury", 19500, ["Vintage Logo", "GG Supreme", "White"]),
    C("Gucci", "Screener", "luxury", 18500, ["Off White", "GG Canvas", "Black"]),
    C("Gucci", "Basket", "luxury", 22500, ["White", "Black", "Blue"]),
    C("Gucci", "Tennis 1977", "luxury", 13500, ["GG Canvas", "Off White"]),
    C("Gucci", "Mac80", "luxury", 17500, ["White", "Black"]),
    C("Gucci", "Re-Web", "luxury", 14500, ["White", "Black"]),
    C("Gucci", "Run", "luxury", 15500, ["Black", "White"]),
    C("Gucci", "Horsebit Sneaker", "luxury", 18500, ["White", "Black"]),
    # Balenciaga
    C("Balenciaga", "Triple S", "luxury", 21000, [
        ("White", None, "Balenciaga-Triple-S-White-2018-Product"), "Black", "Grey Red", "Clear Sole Black", "Beige"]),
    C("Balenciaga", "Track", "luxury", 21500, [
        ("Black", None, "Balenciaga-Track-Trainer-Black-Product"), ("White", None, "Balenciaga-Track-Trainer-White-Product"),
        ("White Orange", None, "Balenciaga-Track-Trainer-White-Orange-Product")]),
    C("Balenciaga", "Track.2", "luxury", 22500, ["Black", "White"]),
    C("Balenciaga", "Speed Trainer", "luxury", 16500, ["Black", "White", "Black White Sole"]),
    C("Balenciaga", "Speed 2.0", "luxury", 17500, ["Black", "White"]),
    C("Balenciaga", "3XL", "luxury", 25500, ["Grey", "Black", "White", "Beige"]),
    C("Balenciaga", "Runner", "luxury", 22500, ["Black", "White", "Grey Blue"]),
    C("Balenciaga", "Defender", "luxury", 24500, ["Black", "Beige"]),
    C("Balenciaga", "Cargo", "luxury", 21000, ["Black", "White"]),
    C("Balenciaga", "X-Pander", "luxury", 22500, ["Black", "White"]),
    C("Balenciaga", "Circuit", "luxury", 20500, ["White", "Black"]),
    C("Balenciaga", "Paris Sneaker", "luxury", 13500, ["Black", "White"]),
    # Dior
    C("Dior", "B22", "luxury", 22500, ["White Blue", "Black", "White Grey", "Black Grey", "White Silver"]),
    C("Dior", "B23 High Top", "luxury", 23500, [("Oblique Ecru Blue", None, "Dior-B23-High-Top-Oblique-Product"), "Oblique Black", "Dior Oblique White"]),
    C("Dior", "B23 Low Top", "luxury", 21500, ["Oblique Ecru Blue", "Oblique Black"]),
    C("Dior", "B27 Low", "luxury", 21500, ["Black Grey Oblique", "White Grey Oblique", "Beige Oblique"]),
    C("Dior", "B27 High", "luxury", 23500, ["Black Grey Oblique", "White Grey Oblique"]),
    C("Dior", "B30", "luxury", 22500, ["Black", "White", "Grey", "Navy"]),
    C("Dior", "B33", "luxury", 22000, ["White", "Black", "Grey"]),
    C("Dior", "B57 Mid", "luxury", 25500, ["White Black", "Beige"]),
    C("Dior", "B9S Skater", "luxury", 20500, ["Oblique Navy", "Black"]),
    C("Dior", "Walk'n'Dior", "luxury", 21500, ["Oblique Blue", "Black", "White"]),
    # Prada
    C("Prada", "America's Cup", "luxury", 17500, ["White Silver", "Black", "White Blue", "Grey"]),
    C("Prada", "Cloudbust Thunder", "luxury", 18500, ["Black", "White", "Grey"]),
    C("Prada", "Downtown", "luxury", 15500, ["White", "Black"]),
    C("Prada", "Macro Re-Nylon", "luxury", 16500, ["Black", "White"]),
    C("Prada", "Prax 01", "luxury", 16500, ["White Black", "Black"]),
    C("Prada", "Collision", "luxury", 18500, ["Black", "White"]),
    # Alexander McQueen
    C("Alexander McQueen", "Oversized Sneaker", "luxury", 12500, [
        ("White Black", None, "Alexander-McQueen-Oversized-White-Black-Product"), "Triple White",
        "White Red", "White Silver", "White Blue", "Triple Black"]),
    C("Alexander McQueen", "Tread Slick", "luxury", 15500, ["Black", "White"]),
    C("Alexander McQueen", "Sprint Runner", "luxury", 14500, ["Black", "White"]),
    C("Alexander McQueen", "Court Trainer", "luxury", 11500, ["White Black", "White"]),
    # Valentino
    C("Valentino", "Open", "luxury", 12500, ["White Black", "White Red", "White Green"], model="Garavani Open"),
    C("Valentino", "One Stud", "luxury", 16500, ["White", "Black"], model="Garavani One Stud"),
    C("Valentino", "Rockrunner", "luxury", 14500, ["Camouflage", "Black", "White"], model="Garavani Rockrunner"),
    C("Valentino", "Bounce", "luxury", 15500, ["White Black", "White"], model="Garavani Bounce"),
    C("Valentino", "Freedots", "luxury", 14500, ["White", "Black"], model="Garavani Freedots"),
    # Versace
    C("Versace", "Chain Reaction", "luxury", 19500, ["Black", "White", "White Gold", "Black Gold"]),
    C("Versace", "Odissea", "luxury", 16500, ["Black", "White"]),
    C("Versace", "Greca Sneaker", "luxury", 14500, ["White Black", "Black"]),
    # Givenchy
    C("Givenchy", "TK-360", "luxury", 16500, ["Black", "White"]),
    C("Givenchy", "TK-MX Runner", "luxury", 17500, ["Black", "White"]),
    C("Givenchy", "City Sport", "luxury", 12500, ["White", "Black"]),
    C("Givenchy", "Spectre", "luxury", 15500, ["Black", "White"]),
    C("Givenchy", "Giv 1", "luxury", 15500, ["White", "Black"]),
    # Fendi
    C("Fendi", "Flow", "luxury", 16500, ["White", "Black", "FF Brown"]),
    C("Fendi", "Match", "luxury", 15500, ["White", "Black"]),
    C("Fendi", "Faster", "luxury", 18500, ["Black", "White"]),
    # Burberry
    C("Burberry", "Vintage Check Sneaker", "luxury", 13500, ["Archive Beige", "Black Check"]),
    C("Burberry", "Arthur", "luxury", 12500, ["Check", "Black"]),
    C("Burberry", "Box Sneaker", "luxury", 14500, ["White", "Black"]),
    # Bottega Veneta / Loewe / Hermes / Celine / Miu Miu / Lanvin / Moncler
    C("Bottega Veneta", "Orbit", "luxury", 18500, [("Black", None, "Bottega-Veneta-Orbit-Sneaker-Black-Product"), "White", "Parakeet"]),
    C("Bottega Veneta", "Speedster", "luxury", 19500, ["Black", "White"]),
    C("Loewe", "Flow Runner", "luxury", 13500, ["Black", "White", "Green", "Navy"]),
    C("Loewe", "Ballet Runner", "luxury", 14500, ["Black", "White"]),
    C("Hermes", "Bouncing", "luxury", 22500, ["White", "Black"]),
    C("Hermes", "Drive", "luxury", 19500, ["White", "Black"]),
    C("Celine", "CT-02 Trainer", "luxury", 15500, ["White", "Black"]),
    C("Celine", "Block Sneaker", "luxury", 14500, ["White", "Black"]),
    C("Miu Miu", "Miu Miu Sneaker", "luxury", 16500, ["White", "Black"]),
    C("Lanvin", "Curb", "luxury", 13500, ["Black", "White", "Grey"]),
    C("Lanvin", "Bumpr", "luxury", 12500, ["White", "Black"]),
    C("Moncler", "Trailgrip GTX", "luxury", 14500, ["Black", "White"]),
    C("Moncler", "Pivot", "luxury", 12500, ["White", "Black"]),
    C("Christian Louboutin", "Louis Junior Spikes", "luxury", 24500, ["Black", "White"]),
    C("Christian Louboutin", "Fun Louis Junior", "luxury", 19500, ["Black", "White"]),
    C("Christian Louboutin", "Vieira", "luxury", 18500, ["White", "Black"]),
    C("Giuseppe Zanotti", "Talon", "luxury", 13500, ["Black", "White"]),
    # Designer streetwear
    C("Off-White", "Out Of Office", "luxury", 9500, [
        ("White Black", None, "OFF-WHITE-Out-Of-Office-OOO-Low-White-Black-Product"),
        ("Black White", None, "OFF-WHITE-Out-Of-Office-OOO-Low-Black-White-Product"),
        ("White Grey", None, "OFF-WHITE-Out-Of-Office-OOO-Low-White-Grey-Product")]),
    C("Off-White", "Be Right Back", "luxury", 10500, ["White", "Black"]),
    C("Off-White", "Odsy-1000", "luxury", 11500, ["White Black", "Black"]),
    C("Off-White", "Vulcanized Hi", "luxury", 8500, ["Black", "White"]),
    C("Amiri", "Skel-Top Low", "luxury", 15500, ["White", "Black", "White Black"]),
    C("Amiri", "Skel-Top High", "luxury", 16500, ["White", "Black"]),
    C("Amiri", "MA-1", "luxury", 17500, ["White", "Black"]),
    C("Amiri", "Bone Runner", "luxury", 18500, ["Black", "White"]),
    C("Amiri", "Stadium Low", "luxury", 15500, ["White", "Black"]),
    C("Rick Owens", "Geobasket", "luxury", 22500, ["Black Milk", "Milk Milk"]),
    C("Rick Owens", "Ramones Low", "luxury", 12500, ["Black Milk"], model="DRKSHDW Ramones Low"),
    C("Rick Owens", "Ramones High", "luxury", 13500, ["Black Milk"], model="DRKSHDW Ramones High"),
    C("Rick Owens", "Jumbo Laced", "luxury", 13500, ["Black Milk"], model="DRKSHDW Jumbo Laced"),
    C("Golden Goose", "Super-Star", "luxury", 11500, ["White Black", "White Silver", "White Gold"]),
    C("Golden Goose", "Ball Star", "luxury", 10500, ["White Black", "White Green"]),
    C("Golden Goose", "Hi Star", "luxury", 12500, ["White", "Black"]),
    C("Common Projects", "Achilles Low", "luxury", 8500, ["White", "Black"]),
    C("Common Projects", "BBall High", "luxury", 9500, ["White", "Black"]),
    C("Maison Margiela", "Replica", "luxury", 9500, [("White", None, "Maison-Margiela-Replica-Low-Top-White-Product"), "Black", "White Grey"]),
    C("Maison Margiela", "Future High", "luxury", 15500, ["White", "Black"]),
    C("Axel Arigato", "Clean 90", "luxury", 4500, ["White", "Black"]),
    C("Axel Arigato", "Genesis", "luxury", 5500, ["White", "Black"]),

    # ===================== RARE & HYPE (resale price) =====================
    C("Nike", "Louis Vuitton x Air Force 1", "rare", 95000, [
        ("White Comet Red", None, "Nike-Air-Force-1-Low-Louis-Vuitton-White-Comet-Red-Product"), "White Green", "Metallic Silver", "Black", "White Royal"],
        source="resale", model="Air Force 1 Low x Louis Vuitton"),
    C("Jordan", "Dior x Air Jordan 1", "rare", 180000, [
        ("High Grey", None, "Air-Jordan-1-Retro-High-Dior-Product"),
        ("Low Grey", 120000, "Air-Jordan-1-Retro-Low-Dior-Product")], source="resale", model="Air Jordan 1 x Dior"),
    C("adidas", "Gucci x adidas", "rare", 21500, [
        ("Gazelle Pink", None, "adidas-Gazelle-Gucci-Pink-Product"),
        ("Gazelle Blue", None, "adidas-Gazelle-Gucci-Blue-Product"),
        ("Gazelle Black", None, "adidas-Gazelle-Gucci-Black-Product")], source="resale", model="Gucci x adidas"),
    C("adidas", "Balenciaga x adidas", "rare", 23500, [
        ("Speed Black", None, "Balenciaga-x-adidas-Speed-Black-Product"),
        ("Triple S White", 26500, "Balenciaga-x-adidas-Triple-S-White-Product"),
        ("Stan Smith White", 16500, "Balenciaga-x-adidas-Stan-Smith-White-Product")], source="resale", model="Balenciaga x adidas"),
    C("adidas", "Prada x adidas", "rare", 14500, [
        ("Superstar White", None, "adidas-Superstar-Prada-White-Product"),
        ("Forum Low White", None, "adidas-Forum-Low-Prada-White-Product"),
        ("Luna Rossa 21 Black", None, "adidas-Luna-Rossa-21-Prada-Black-Product")], source="resale", model="Prada x adidas"),
    C("New Balance", "Miu Miu x New Balance", "rare", 24500, [
        ("530 SL White", None, "New-Balance-530-SL-Miu-Miu-White-W-Product"),
        ("574 Blue", None, "New-Balance-574-Miu-Miu-Blue-W-Product")], source="resale", model="Miu Miu x New Balance"),
    C("Nike", "Jacquemus x Nike", "rare", 7500, [
        ("J Force 1 Low LX SP White", None, "Nike-J-Force-1-Low-LX-SP-Jacquemus-White-W-Product"),
        ("Air Humara LX Gold", None, "Nike-Air-Humara-LX-Jacquemus-Gold-W-Product")], source="resale", model="Jacquemus x Nike"),
    C("Jordan", "Travis Scott x Jordan", "rare", 26000, [
        ("1 Low Mocha", 28000, "Air-Jordan-1-Low-Travis-Scott-Product"),
        ("1 Low Reverse Mocha", None, "Air-Jordan-1-Retro-Low-OG-SP-Travis-Scott-Reverse-Mocha-Product"),
        ("1 Low Olive", 18500, "Air-Jordan-1-Low-OG-SP-Travis-Scott-Olive-W-Product"),
        ("1 Low Black Phantom", 17500, "Air-Jordan-1-Retro-Low-OG-SP-Travis-Scott-Black-Phantom-Product"),
        ("1 Low Canary", 14500, "Air-Jordan-1-Retro-Low-OG-SP-Travis-Scott-Canary-W-Product"),
        ("1 Low Medium Olive", 12500, "Air-Jordan-1-Low-OG-SP-Travis-Scott-Medium-Olive-Product"),
        ("1 High Mocha", 32000, "Air-Jordan-1-Retro-High-Travis-Scott-Product")], source="resale", model="Air Jordan x Travis Scott"),
    C("Jordan", "Off-White x Jordan", "rare", 22000, [
        ("4 Sail", None, "Air-Jordan-4-Retro-Off-White-Sail-W-Product"),
        ("1 High Chicago", 95000, "Air-Jordan-1-Retro-High-Off-White-Chicago-Product"),
        ("2 Low White Red", 14500, "Air-Jordan-2-Retro-Low-SP-Off-White-White-Red-Product")], source="resale", model="Air Jordan x Off-White"),
    C("Jordan", "Union LA x Jordan", "rare", 14500, [
        ("1 High Black Toe", 32000, "Air-Jordan-1-Retro-High-Union-Los-Angeles-Black-Toe-Product"),
        ("4 Off Noir", None, "Air-Jordan-4-Retro-Union-Off-Noir-Product"),
        ("4 Desert Moss", None, "Air-Jordan-4-Retro-Union-Desert-Moss-Product")], source="resale", model="Air Jordan x Union LA"),
    C("Jordan", "A Ma Maniere x Jordan", "rare", 12500, [
        ("4 Violet Ore", None, "Air-Jordan-4-Retro-A-Ma-Maniere-Violet-Ore-W-Product"),
        ("3 Raised By Women", None, "Air-Jordan-3-Retro-SP-A-Ma-Maniere-Product"),
        ("1 High Airness", 9500, "Air-Jordan-1-Retro-High-OG-SP-A-Ma-Maniere-Airness-Product")], source="resale", model="Air Jordan x A Ma Maniere"),
    C("Nike", "Off-White x Nike", "rare", 16500, [
        ("Dunk Low Lot 01", None, "Nike-Dunk-Low-Off-White-Lot-1-Product"),
        ("Dunk Low Lot 33", None, "Nike-Dunk-Low-Off-White-Lot-33-Product"),
        ("Dunk Low Lot 50", None, "Nike-Dunk-Low-Off-White-Lot-50-Product"),
        ("Air Force 1 Low Brooklyn", 9500, "Nike-Air-Force-1-Low-Off-White-Brooklyn-Product"),
        ("Air Force 1 Mid White", 9500, "Nike-Air-Force-1-Mid-Off-White-White-Product")], source="resale", model="Nike x Off-White"),
    C("Nike", "Nike SB Dunk Collabs", "rare", 28000, [
        ("Travis Scott", 38000, "Nike-SB-Dunk-Low-Travis-Scott-Product"),
        ("Ben & Jerry's Chunky Dunky", None, "Nike-SB-Dunk-Low-Ben-Jerrys-Chunky-Dunky-Product"),
        ("Concepts Purple Lobster", 14500, "Nike-SB-Dunk-Low-Purple-Lobster-Product"),
        ("Strangelove", 45000, "Nike-SB-Dunk-Low-StrangeLove-Skateboards-Product"),
        ("What The Paul", 18500, "Nike-SB-Dunk-Low-What-The-Paul-Product"),
        ("Jarritos", 9500, "Nike-SB-Dunk-Low-Jarritos-Product")], source="resale", model="SB Dunk Low"),
    C("Nike", "Sacai x Nike", "rare", 9500, [
        ("LDWaffle Black Nylon", None, "Nike-LD-Waffle-sacai-Black-Nylon-Product"),
        ("VaporWaffle Sesame", None, "Nike-Vaporwaffle-sacai-Sesame-Blue-Void-Product"),
        ("Blazer Low Iron Grey", None, "Nike-Blazer-Low-sacai-Iron-Grey-Product")], source="resale", model="Nike x Sacai"),
    C("adidas", "Yeezy", "rare", 6500, [
        ("Boost 350 V2 Zebra", None, "Adidas-Yeezy-Boost-350-V2-White-Core-Black-Red-Product"),
        ("Boost 350 V2 Bone", 5500, "adidas-Yeezy-Boost-350-V2-Bone-Product"),
        ("Boost 350 V2 Onyx", 5500, "adidas-Yeezy-Boost-350-V2-Onyx-Product"),
        ("Boost 700 Wave Runner", 7500, "Adidas-Yeezy-Wave-Runner-700-Solid-Grey-Product"),
        ("Foam Runner Onyx", 3999, "adidas-Yeezy-Foam-RNNR-Onyx-Product"),
        ("Foam Runner Ochre", 3999, "adidas-Yeezy-Foam-RNNR-Ochre-Product")], source="resale", model="Yeezy"),
    C("adidas", "Wales Bonner x adidas", "rare", 7500, [
        ("Samba Cream Green", None, "adidas-Samba-Wales-Bonner-Cream-Green-Product"),
        ("Samba Black", None, "adidas-Samba-Wales-Bonner-Core-Black-Product"),
        ("Samba Silver", 9500, "adidas-Samba-Wales-Bonner-Silver-Metallic-Product")], source="resale", model="Samba x Wales Bonner"),
    C("adidas", "Pharrell x adidas", "rare", 5500, [
        ("Samba Humanrace Black", None, "adidas-Samba-Humanrace-Black-Product"),
        ("Samba Humanrace Cream", None, "adidas-Samba-Humanrace-Cream-Product")], source="resale", model="Humanrace x adidas"),
    C("adidas", "Bad Bunny x adidas", "rare", 6500, [
        ("Forum Low Easter Egg", None, "adidas-Forum-Low-Bad-Bunny-Easter-Egg-Product"),
        ("Forum Buckle Low Back to School", None, "adidas-Forum-Buckle-Low-Bad-Bunny-Back-to-School-Product"),
        ("Campus Brown", 4500, "adidas-Campus-Bad-Bunny-Brown-Product")], source="resale", model="Bad Bunny x adidas"),
    C("New Balance", "Aime Leon Dore x New Balance", "rare", 8500, [
        ("550 White Green", None, "New-Balance-550-Aime-Leon-Dore-White-Green-Product"),
        ("990v4 Made in USA Navy", 7500, "New-Balance-990v4-Aime-Leon-Dore-Navy-Product")], source="resale", model="New Balance x Aime Leon Dore"),
    C("New Balance", "Salehe Bembury x New Balance", "rare", 6500, [
        ("9060 Sea Salt", None, "New-Balance-9060-Salehe-Bembury-Ivory-Product"),
        ("2002R Peace Be The Journey", None, "New-Balance-2002R-Salehe-Bembury-Peace-Be-The-Journey-Product")], source="resale", model="New Balance x Salehe Bembury"),
    C("ASICS", "Kith x ASICS", "rare", 7500, [
        ("Gel-Lyte III Salmon Toe", None, "ASICS-Gel-Lyte-III-Ronnie-Fieg-Salmon-Toe-Product"),
        ("Gel-Kayano 14 Marine", 5500, "ASICS-Gel-Kayano-14-Kith-Marine-Product")], source="resale", model="ASICS x Kith"),
    C("Converse", "Rick Owens x Converse", "rare", 5500, [
        ("TURBODRK Chuck 70 Black", None, "Converse-Chuck-70-Hi-DRKSHDW-TURBODRK-Black-Product")], source="resale", model="Chuck 70 x DRKSHDW"),
    C("Jordan", "Jordan Retro Grails", "rare", 6500, [
        ("1 High OG Chicago Lost & Found", 9500, "Air-Jordan-1-Retro-High-OG-Chicago-Reimagined-Product"),
        ("4 Bred Reimagined", None, "Air-Jordan-4-Retro-Bred-Reimagined-Product"),
        ("4 SB Pine Green", 9500, "Air-Jordan-4-Retro-SB-Pine-Green-Product"),
        ("1 High OG Spider-Verse", 8500, "Air-Jordan-1-Retro-High-OG-Spider-Man-Across-the-Spider-Verse-Product"),
        ("4 Black Cat 2020", 9500, "Air-Jordan-4-Retro-Black-Cat-2020-Product")], source="resale", model="Air Jordan"),

    # ===================== SPORTSWEAR (still in stores) =====================
    C("Nike", "Air Force 1 '07 Low", "sportswear", 2199, [
        ("White", None, "Nike-Air-Force-1-Low-White-07-Product"), ("Black", None, "Nike-Air-Force-1-Low-Black-2012-Product")]),
    C("Nike", "Dunk Low", "sportswear", 2099, [
        ("Panda", None, "Nike-Dunk-Low-Retro-White-Black-2021-Product"), ("Grey Fog", None, "Nike-Dunk-Low-Grey-Fog-Product"),
        ("Michigan", None, "Nike-Dunk-Low-Michigan-2021-Product"), ("UNC", None, "Nike-Dunk-Low-UNC-2021-Product"),
        ("Coast", None, "Nike-Dunk-Low-Coast-Product")]),
    C("Nike", "Air Max", "sportswear", 2799, [
        ("90 Infrared", None, "Nike-Air-Max-90-Infrared-2020-Product"),
        ("95 OG Neon", 3499, "Nike-Air-Max-95-OG-Neon-2020-Product"),
        ("97 Silver Bullet", 3699, "Nike-Air-Max-97-OG-QS-Silver-Bullet-2017-Product"),
        ("Plus TN Black", 3699, "Nike-Air-Max-Plus-Triple-Black-Product"),
        ("1 '86 Big Bubble Red", 3299, "Nike-Air-Max-1-86-OG-Big-Bubble-Red-Product"),
        ("DN Black", 3299, "Nike-Air-Max-Dn-Black-Product")], model="Air Max"),
    C("Nike", "Nike Classics", "sportswear", 1899, [
        ("Blazer Mid '77 White Black", None, "Nike-Blazer-Mid-77-Vintage-White-Black-Product"),
        ("Cortez White Varsity Red", 1799, "Nike-Cortez-White-Varsity-Red-Varsity-Royal-2023-Product"),
        ("P-6000 Metallic Silver", 2299, "Nike-P-6000-Metallic-Silver-Product"),
        ("Zoom Vomero 5 Photon Dust", 3199, "Nike-Zoom-Vomero-5-Photon-Dust-Metallic-Silver-W-Product"),
        ("Shox TL Black", 3699, "Nike-Shox-TL-Black-Max-Orange-Product"),
        ("V2K Run Summit White", 2299, "Nike-V2K-Run-Summit-White-Metallic-Silver-Product")], model="Nike"),
    C("Jordan", "Air Jordan Retro", "sportswear", 4299, [
        ("1 Low Wolf Grey", 2399, "Air-Jordan-1-Low-Wolf-Grey-Product"),
        ("1 High OG Dark Mocha", 3999, "Air-Jordan-1-Retro-High-Dark-Mocha-Product"),
        ("3 White Cement Reimagined", None, "Air-Jordan-3-Retro-White-Cement-Reimagined-Product"),
        ("4 Military Black", None, "Air-Jordan-4-Retro-Military-Black-Product"),
        ("4 Red Cement", None, "Air-Jordan-4-Retro-Red-Cement-Product"),
        ("4 Thunder 2023", None, "Air-Jordan-4-Retro-Thunder-2023-Product"),
        ("11 Gratitude", 4499, "Air-Jordan-11-Retro-DMP-Gratitude-2023-Product"),
        ("11 Legend Blue", 4499, "Air-Jordan-11-Retro-Legend-Blue-2024-Product")], model="Air Jordan"),
    C("adidas", "adidas Originals", "sportswear", 2299, [
        ("Samba OG White Black", None, "adidas-Samba-OG-Cloud-White-Core-Black-Product"),
        ("Samba OG Black", None, "adidas-Samba-OG-Core-Black-Product"),
        ("Gazelle Indoor Blue Fusion", 2499, "adidas-Gazelle-Indoor-Blue-Fusion-Gum-Product"),
        ("Handball Spezial Light Blue", None, "adidas-Handball-Spezial-Light-Blue-Product"),
        ("Campus 00s Core Black", 2199, "adidas-Campus-00s-Core-Black-Product"),
        ("SL 72 OG Blue Bird", 1999, "adidas-SL-72-OG-Blue-Bird-Product"),
        ("Taekwondo Black", 2099, "adidas-Taekwondo-Black-W-Product"),
        ("Superstar White Black", 1999, "adidas-Superstar-White-Black-Product"),
        ("Forum Low White", 1999, "adidas-Forum-Low-Cloud-White-Product"),
        ("Stan Smith White Green", 1899, "adidas-Stan-Smith-White-Green-Product"),
        ("Ultraboost 1.0 Core Black", 3499, "adidas-Ultra-Boost-1-0-Core-Black-Product")], model="adidas"),
    C("Puma", "Puma Classics", "sportswear", 1899, [
        ("Suede Classic Black", 1599, "Puma-Suede-Classic-Black-White-Product"),
        ("Palermo Vapor Grey", None, "Puma-Palermo-Vapor-Gray-Clementine-Product"),
        ("Speedcat OG Red", 1999, "Puma-Speedcat-OG-Red-White-Product"),
        ("RS-X White", 2199, "Puma-RS-X-Triple-White-Product")], model="Puma"),
    C("New Balance", "New Balance Lifestyle", "sportswear", 2599, [
        ("550 White Green", None, "New-Balance-550-White-Green-Product"),
        ("530 White Silver Navy", 2299, "New-Balance-530-White-Silver-Navy-Product"),
        ("9060 Rain Cloud", 3299, "New-Balance-9060-Rain-Cloud-Grey-Product"),
        ("2002R Protection Pack Rain Cloud", 3299, "New-Balance-2002R-Protection-Pack-Rain-Cloud-Product"),
        ("1906R Silver Metallic", 3199, "New-Balance-1906R-Silver-Metallic-Product"),
        ("990v6 Made in USA Grey", 4999, "New-Balance-990v6-MiUSA-Grey-Product"),
        ("204L Arid Stone", 2599, "New-Balance-204L-Arid-Stone-Product")], model="New Balance"),
    C("ASICS", "ASICS Sportstyle", "sportswear", 2799, [
        ("Gel-1130 White Pure Silver", 2299, "ASICS-Gel-1130-White-Pure-Silver-Product"),
        ("Gel-Kayano 14 Cream Black", 3199, "ASICS-Gel-Kayano-14-Cream-Black-Product"),
        ("Gel-NYC Graphite Grey", None, "ASICS-Gel-NYC-Graphite-Grey-Black-Product")], model="ASICS"),
    C("Salomon", "Salomon", "sportswear", 3999, [
        ("XT-6 Black Phantom", None, "Salomon-XT-6-Black-Black-Phantom-Product"),
        ("ACS Pro Black", 3799, "Salomon-ACS-Pro-Advanced-Black-Product")], model="Salomon"),
    C("On", "On", "sportswear", 3499, [("Cloudmonster All Black", None, "On-Running-Cloudmonster-All-Black-Product")], model="On"),
    C("Hoka", "Hoka", "sportswear", 2999, [
        ("Clifton 9 Black White", None, "Hoka-One-One-Clifton-9-Black-White-Product"),
        ("Bondi 8 Black", 3299, "Hoka-One-One-Bondi-8-Black-Product")], model="Hoka"),
    C("Converse", "Converse", "sportswear", 1599, [
        ("Chuck 70 Hi Black", None, "Converse-Chuck-Taylor-All-Star-70-Hi-Black-Product"),
        ("Run Star Hike Hi Black", 1999, "Converse-Run-Star-Hike-Hi-Black-White-Product")], model="Converse"),
    C("Vans", "Vans", "sportswear", 1399, [
        ("Old Skool Black White", 1299, "Vans-Old-Skool-Black-White-Product"),
        ("Knu Skool Black", 1499, "Vans-Knu-Skool-Black-True-White-Product"),
        ("Sk8-Hi Black White", 1399, "Vans-Sk8-Hi-Black-White-Product")], model="Vans"),
    C("Reebok", "Reebok", "sportswear", 1599, [
        ("Club C 85 Vintage Chalk Green", None, "Reebok-Club-C-85-Vintage-Chalk-Green-Product"),
        ("Instapump Fury OG Citron", 3299, "Reebok-Instapump-Fury-OG-Citron-2019-Product")], model="Reebok"),
    C("Saucony", "Saucony", "sportswear", 2499, [("Shadow 6000 Grey", None, "Saucony-Shadow-6000-Grey-Product")], model="Saucony"),
]


def handle(*parts):
    return re.sub(r"[^a-z0-9]+", "-", " ".join(parts).lower()).strip("-")


def slug(*parts):
    s = " ".join(parts).replace("'", "").replace("&", "and")
    return re.sub(r"[^A-Za-z0-9.]+", "-", s).strip("-") + "-Product"


def make_title(c, colour):
    # Mixed collections ("Nike Classics", "Yeezy", collabs) name the shoe in the colourway field.
    m = c["model"]
    if m == c["brand"]:
        return colour
    if m in ("Air Max", "Air Jordan", "Yeezy") or " x " in m:
        return f"{m} {colour}"
    return f"{m} '{colour}'"


def colour_from_image(c, img):
    """Name a StockX listing's colourway from its image file name."""
    words = img[:-len("-Product")].split("-") if img.endswith("-Product") else img.split("-")
    womens = words[-1] == "W"
    if womens:
        words = words[:-1]
    # Drop the brand/model words the name starts with, then any collab partner names.
    lead = set(re.sub(r"[^a-z0-9 ]", " ", f"{c['brand']} {c['model']} {c['collection']}".lower()).split())
    lead |= {"sneaker", "sneakers", "x", "by"}
    while words and words[0].lower() in lead:
        words = words[1:]
    if " x " in c["model"]:
        for part in c["model"].split(" x "):
            pw = re.sub(r"[^A-Za-z0-9 ]", " ", part).split()
            for i in range(len(words) - len(pw) + 1):
                if [w.lower() for w in words[i:i + len(pw)]] == [p.lower() for p in pw]:
                    words = words[:i] + words[i + len(pw):]
                    break
    colour = " ".join(words) or "OG"
    return colour + (" (Women's)" if womens else "")


def expand():
    with open(os.path.join(ROOT, "tools", "images.json")) as f:
        checked = json.load(f)
    # Real StockX listings (checked photos) per collection, used to replace
    # colourways without a photo and to extend the collection.
    with open(os.path.join(ROOT, "tools", "extra_images.json")) as f:
        extra = json.load(f)

    # Each pair's own store price in US$ (from its StockX listing), keyed by image.
    with open(os.path.join(ROOT, "tools", "store_prices_usd.json")) as f:
        usd = json.load(f)
    # Extra angles from StockX's 360-degree photos (tools/check_gallery.py).
    gallery_path = os.path.join(ROOT, "tools", "gallery.json")
    gallery = json.load(open(gallery_path)) if os.path.exists(gallery_path) else {}

    plans, used = [], set()
    for c in COLLECTIONS:
        entries = []
        for cw in c["colourways"]:
            if isinstance(cw, str):
                cw = (cw,)
            colour = cw[0]
            store = cw[1] if len(cw) > 1 and cw[1] else c["price"]
            img = cw[2] if len(cw) > 2 else slug(c["brand"], c["model"], colour)
            h = handle(c["brand"], make_title(c, colour))
            if h in checked:
                img = checked[h]
            if img:
                used.add(img)
            entries.append([colour, store, img])
        plans.append((c, entries))

    items, seen = [], set()
    for c, entries in plans:
        pool = [s for s in extra.get(c["collection"], []) if s not in used]
        for e in entries:
            if not e[2] and pool:
                img = pool.pop(0)
                e[0], e[2] = colour_from_image(c, img), img
                used.add(img)
        for img in pool:
            entries.append([colour_from_image(c, img), c["price"], img])
            used.add(img)
        # Drop a placeholder without a photo when a real listing already covers its colourway.
        def words(t):
            return set(re.sub(r"[^a-z0-9 ]", " ", t.lower()).split())
        shown = [words(e[0]) for e in entries if e[2]]
        entries = [e for e in entries if e[2] or not any(words(e[0]) <= w for w in shown)]
        # Once a collection has real listings with photos, drop the placeholders
        # that matched no real listing.
        if shown:
            entries = [e for e in entries if e[2]]
        for colour, store, img in entries:
            if img in usd:
                store = int(round(usd[img] * ZAR_PER_USD, -2))
            title = make_title(c, colour)
            h = handle(c["brand"], title)
            if h in seen:
                continue
            seen.add(h)
            items.append({
                "handle": h,
                "title": title,
                "model": c["model"],
                "colourway": colour,
                "vendor": c["brand"],
                "collection": c["collection"],
                "category": c["category"],
                "categoryLabel": LABELS[c["category"]],
                "storePrice": store,
                "storePriceSource": c["source"],
                "price": int(round(store * DISCOUNT / 10.0) * 10),
                "currency": "ZAR",
                "sizes": SIZES,
                "image": IMG.format(img) if img else "",
                "images": ([IMG.format(img)] + [VIEW.format(n=img[:-8] if img.endswith("-Product") else img, f=f)
                                                for f in gallery.get(img, []) if f != "01"]) if img else [],
                "tags": [c["category"], c["brand"].lower(), c["collection"].lower()],
            })
    return items


def write_csv(items, path):
    cols = ["Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags",
            "Published", "Option1 Name", "Option1 Value", "Variant SKU",
            "Variant Inventory Tracker", "Variant Inventory Qty", "Variant Inventory Policy",
            "Variant Fulfillment Service", "Variant Price",
            "Variant Requires Shipping", "Variant Taxable", "Image Src", "Image Position",
            "Image Alt Text", "Status"]
    with open(path, "w", newline="") as f:
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
                if 0 < i < len(p["images"]):
                    row.update({"Image Src": p["images"][i].split("?")[0], "Image Position": i + 1,
                                "Image Alt Text": f"{p['vendor']} {p['title']} view {i + 1}"})
                if i == 0:
                    row.update({
                        "Title": f"{p['vendor']} {p['title']}",
                        "Body (HTML)": f"<p>{p['vendor']} {p['model']}, {p['colourway']}. Part of the {p['collection']} collection.</p>",
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


def main():
    items = expand()
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "products.js"), "w") as f:
        f.write("// Generated by tools/build_catalog.py - edit the script, not this file.\n")
        f.write("window.COVET_PRODUCTS = ")
        json.dump(items, f, separators=(",", ":"))
        f.write(";\n")
    write_csv(items, os.path.join(ROOT, "data", "shopify-products.csv"))

    counts = {c: sum(p["category"] == c for p in items) for c in LABELS}
    print(f"{len(items)} products, {len({p['vendor'] for p in items})} brands, "
          f"{len(COLLECTIONS)} collections", counts)


if __name__ == "__main__":
    main()
